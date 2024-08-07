# pylint: disable=no-member
from typing import Optional, Tuple, Any

import requests
from aws_lambda_powertools import Logger

from heimdall_repos.repo_layer_env import (
    GITHUB_RATE_ABUSE_FLAG,
    GITHUB_RATE_ABUSE_KEYWORDS,
    GITHUB_REPO_QUERY,
    GITHUB_REPO_REF_QUERY,
    GITHUB_TIMEOUT_FLAG,
    GITHUB_TIMEOUT_KEYWORDS,
)
from heimdall_utils.artemis import redundant_scan_exists
from heimdall_utils.aws_utils import GetProxySecret, queue_service_and_org, queue_branch_and_repo
from heimdall_utils.env import DEFAULT_API_TIMEOUT, APPLICATION
from heimdall_utils.github.app import GithubApp
from heimdall_utils.utils import JSONUtils, ServiceInfo, ScanOptions, parse_timestamp
from heimdall_utils.variables import REV_PROXY_DOMAIN_SUBSTRING, REV_PROXY_SECRET_HEADER

log = Logger(service=APPLICATION, name="ProcessGithubRepos", child=True)


class ProcessGithubRepos:
    # pylint: disable=too-many-instance-attributes
    def __init__(
        self,
        queue: str,
        scan_options: ScanOptions,
        service_info: ServiceInfo,
        external_orgs: list = None,
        artemis_api_key: str = None,
        redundant_scan_query: dict = None,
    ):
        self.queue = queue
        self.service_info = service_info
        self.scan_options = scan_options
        self.external_orgs = external_orgs
        self.json_utils = JSONUtils(log)
        self.artemis_api_key = artemis_api_key
        self.redundant_scan_query = redundant_scan_query

        self._setup()

    def _setup(self):
        """
        Updates the cursor to a None type if needed.
        Without this, GraphQL would read `null` as a string and not a Null value
        """
        self.service_info.repo_cursor = self._parse_cursor(self.service_info.repo_cursor)
        self.service_info.branch_cursor = self._parse_cursor(self.service_info.branch_cursor)

    def _parse_cursor(self, cursor):
        if cursor in {"null", "None"}:
            return None
        return cursor

    def _query_github_api(self, query: str, variables: dict) -> str:
        # Query the GitHub API
        headers = {
            "Authorization": self._get_authorization(),
            "Content-Type": "application/json",
        }
        if REV_PROXY_DOMAIN_SUBSTRING and REV_PROXY_DOMAIN_SUBSTRING in self.service_info.url:
            headers[REV_PROXY_SECRET_HEADER] = GetProxySecret()

        response = requests.post(
            url=self.service_info.url,
            headers=headers,
            json={"query": query, "variables": variables},
            timeout=DEFAULT_API_TIMEOUT,
        )

        response_text = self._get_response_text(response)

        # cannot depend on status code alone because some errors have a 200 code (e.g. rate limit)
        if response.status_code != 200 or self._check_for_errors_in_response_body(response_text):
            error_response = self._analyze_error_response(response, response_text)
            return self._report_error_response(response, error_response)
        return response.text

    def _get_response_text(self, response):
        if response is None:
            return None
        response_text = response.text
        if not response_text:
            return None
        resp = self.json_utils.get_json_from_response(response_text)
        if not resp:
            return response_text
        return resp

    def _check_for_errors_in_response_body(self, response_text) -> bool:
        try:
            return len(response_text.get("errors", [])) > 0
        except AttributeError:
            return False

    def _analyze_error_response(self, response, response_text) -> str:
        if response is None or response_text is None:
            return None

        # check if related to rate abuse or timeout
        try:
            if str(response.headers.get("X-RateLimit-Remaining")) == "0":
                return GITHUB_RATE_ABUSE_FLAG
            error_message = response_text.get("message") or response_text.get("errors", [])[0].get("message")
            if self._is_message_rate_abuse(error_message):
                return GITHUB_RATE_ABUSE_FLAG
            if str(response.status_code) == "502" and self._is_message_timeout(error_message):
                return GITHUB_TIMEOUT_FLAG
        except (IndexError, AttributeError):
            pass
        return response_text

    def _is_message_rate_abuse(self, message):
        """
        Check if rate limit message keywords are in the response message.
        """
        if message is None:
            return False

        for abuse_keyword in GITHUB_RATE_ABUSE_KEYWORDS:
            if abuse_keyword in message:
                return True
        return False

    def _is_message_timeout(self, message):
        """
        Check if timeout message keywords are in the response message.
        """
        if message is None:
            return False

        for timeout_keyword in GITHUB_TIMEOUT_KEYWORDS:
            if timeout_keyword in message:
                return True
        return False

    def _report_error_response(self, response, error_response):
        if error_response == GITHUB_RATE_ABUSE_FLAG:
            log.error("Github abuse limit has been reached.")
            raise requests.HTTPError("Github abuse limit has been reached.")
        if error_response == GITHUB_TIMEOUT_FLAG:
            log.error("Github query timed out.")
            raise requests.HTTPError("Github query timed out")
        log.error("Code: %s - %s", response.status_code, error_response)
        return None

    def query(self) -> list:
        if self.scan_options.repo:
            # Process a single repo
            variables = {
                "org": self.service_info.org,
                "repo": self.scan_options.repo,
                "cursor": self.service_info.branch_cursor,
            }
            query = GITHUB_REPO_REF_QUERY
            log.info("Querying for branches in repo: %s/%s", self.service_info.org, self.scan_options.repo)
        else:
            # Process all repos in an organization
            variables = {"org": self.service_info.org, "cursor": self.service_info.repo_cursor}
            query = GITHUB_REPO_QUERY
            log.info(
                "Querying for repos in %s starting at cursor %s", self.service_info.org, self.service_info.repo_cursor
            )

        response_text = self._query_github_api(query, variables)
        resp = self.json_utils.get_json_from_response(response_text)
        if not resp:
            return []

        nodes, page_info = self._process_query_response(resp)

        repos = self._process_repos(nodes)

        if not page_info:
            return repos

        if page_info.get("hasNextPage"):
            cursor = page_info.get("endCursor")

            # Re-queue this org, setting the cursor for the next page of the query
            log.info("Queuing %s to re-start at cursor %s", self.service_info.org, cursor)
            queue_service_and_org(
                self.queue,
                self.service_info.service,
                self.service_info.org,
                {"cursor": cursor},
                self.scan_options.default_branch_only,
                self.scan_options.plugins,
                self.scan_options.batch_id,
                self.redundant_scan_query,
            )

        return repos

    def _process_query_response(self, resp: dict[str, Any]) -> Tuple[list, dict[str, Any]]:
        """
        Parses the Github Query response and returns the pageInfo and a list of repositories

        Args:
            resp (dict[str, Any]): Github query response
        """
        data = self.json_utils.get_object_from_json_dict(resp, ["data", "organization"])

        if "repositories" in data:
            # Parse GITHUB_REPO_QUERY RESPONSE
            repositories = self.json_utils.get_object_from_json_dict(data, ["repositories", "nodes"])
            page_info = self.json_utils.get_object_from_json_dict(data, ["repositories", "pageInfo"])
            return repositories, page_info

        # Parse GITHUB_REPO_REF_QUERY RESPONSE
        repository = self.json_utils.get_object_from_json_dict(data, ["repository"])

        if not repository:
            return [], {}

        return [repository], {}

    def _process_repos(self, nodes: list) -> list:
        """
        Handles processing for a single repository or all repositories in an organization
        """
        log.info("Processing repos in org: %s", self.service_info.org)
        repos = []
        for repo in nodes:
            name = repo.get("name")
            log.debug("Processing branches in repo %s/%s", self.service_info.org, name, repo=name)
            if f"{self.service_info.service}/{self.service_info.org}" in self.external_orgs and not repo.get(
                "isPrivate"
            ):
                # With an external org we only want to scan the private repos
                # shared with us any not that org's public repos
                log.info("Skipping public repo %s in external org", name, repo=name)
                continue

            if not self._is_repo_valid(repo):
                continue

            if not self.scan_options.default_branch_only and not self.scan_options.repo:
                log.info("Queuing first page of branches for repo %s", name, repo=name)
                queue_branch_and_repo(
                    self.queue,
                    self.service_info.service,
                    self.service_info.org,
                    "null",
                    name,
                    self.scan_options.plugins,
                    self.scan_options.batch_id,
                    self.redundant_scan_query,
                )
                continue

            default_branch_ref = repo.get("defaultBranchRef")
            if not default_branch_ref:
                log.warning("Could not retrieve timestamp for the Default branch", repo=name)
                default_branch_ref = {"name": "HEAD", "target": {"committedDate": parse_timestamp()}}

            default_branch_name = default_branch_ref.get("name", "HEAD")
            branch_names, timestamps = self._get_branch_names(name, repo.get("refs"), default_branch_ref)

            repos.extend(self._process_branches(name, default_branch_name, branch_names, timestamps))
        return repos

    def _is_repo_valid(self, repo: dict):
        """
        Checks if the repo has branches.
        """
        if not repo.get("isEmpty"):
            return True

        log.warning(f"repo {repo.get('name')} has no branches. Skipping")
        return False

    def _process_branches(self, repo_name: str, default_branch_name: str, branches: list, timestamps: dict) -> list:
        """
        Creates Heimdall Tasks for each branch listed in the branches variable.

        This method processes the specified branches of a given repository and
        generates tasks for Heimdall based on the provided scan configurations.

        Args:
            repo_name (str): The name of the repository being processed.
            default_branch_name (str): The name of the default branch in the repository.
            branches (list): A list of branch names to be processed.
            timestamps (dict): A dictionary mapping branch names to the timestamp of the last commit on that branch

        Returns:
            list: A list of Heimdall Tasks
        """
        tasks = []
        for branch in branches:
            search_branch = branch
            if branch == default_branch_name:
                search_branch = None

            if not redundant_scan_exists(
                api_key=self.artemis_api_key,
                service=self.service_info.service,
                org=self.service_info.org,
                repo=repo_name,
                branch=search_branch,
                timestamp=timestamps[branch],
                query=self.redundant_scan_query,
            ):
                task = {
                    "service": self.service_info.service,
                    "repo": repo_name,
                    "org": self.service_info.org,
                    "plugins": self.scan_options.plugins,
                    "branch": branch,
                }
                if branch == default_branch_name:
                    task.pop("branch")

                tasks.append(task)
        return tasks

    def _get_branch_names(self, repo: str, refs: dict, default_branch_ref) -> Tuple[list, dict]:
        """
        Retrieves the names of branches and their corresponding commit timestamps for a repository.

        Args:
            repo (str): The name of the repository.
            refs (dict): A dictionary containing information for the branches in the repository.
            default_branch_ref: The reference dict for the default branch.

        Returns:
            Tuple[list, dict]: A tuple containing:
                - A list of branch names (refs) for the given repository.
                - A dictionary mapping each branch name to the timestamp of its last commit.

        Example:
            ["master"], {"master": "1970-01-01T00:00:00Z"}
        """
        ref_names = set()
        timestamps = dict()

        if self.scan_options.default_branch_only:
            # Process only the default branch
            _, timestamp = self._get_branch_details(default_branch_ref)
            default_branch_name = default_branch_ref.get("name", "HEAD")

            ref_names.add(default_branch_name)
            timestamps[default_branch_name] = timestamp

        if refs and not self.scan_options.default_branch_only:
            for node in refs["nodes"]:
                branch_name, timestamp = self._get_branch_details(node)
                ref_names.add(branch_name)
                timestamps[branch_name] = timestamp

            next_page = self.json_utils.get_object_from_json_dict(refs, ["pageInfo", "hasNextPage"])
            if next_page:
                branch_cursor = self.json_utils.get_object_from_json_dict(refs, ["pageInfo", "endCursor"])
                log.info(
                    "Queueing next page of branches in %s to re-start at cursor: %s", repo, branch_cursor, repo=repo
                )
                queue_branch_and_repo(
                    self.queue,
                    self.service_info.service,
                    self.service_info.org,
                    branch_cursor,
                    repo,
                    self.scan_options.plugins,
                    self.scan_options.batch_id,
                    self.redundant_scan_query,
                )
        return list(ref_names), timestamps

    def _get_authorization(self) -> str:
        if self.service_info.app_integration:
            # Attempt to get an app installation token for the organization
            github_app = GithubApp()
            token = github_app.get_installation_token(self.service_info.org)
            if token is not None:
                return f"token {token}"

        # Fall back to using the PAT
        return f"bearer {self.service_info.api_key}"

    def _get_branch_details(self, branch_ref: dict) -> Tuple[Optional[str], str]:
        """
        Retrieves the branch name and timestamp from a dictionary
        """
        branch_name = branch_ref.get("name")
        timestamp = branch_ref.get("target", {}).get("committedDate")
        timestamp = parse_timestamp(timestamp)
        return branch_name, timestamp
