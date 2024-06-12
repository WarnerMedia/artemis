# pylint: disable=no-member
from typing import Tuple

import requests
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
from heimdall_utils.env import DEFAULT_API_TIMEOUT
from heimdall_utils.github.app import GithubApp
from heimdall_utils.utils import JSONUtils, Logger, ServiceInfo
from heimdall_utils.variables import REV_PROXY_DOMAIN_SUBSTRING, REV_PROXY_SECRET_HEADER


class ProcessGithubRepos:
    # pylint: disable=too-many-instance-attributes
    def __init__(
        self,
        queue,
        service,
        org,
        service_dict,
        api_key,
        repo_cursor,
        default_branch_only,
        plugins,
        external_orgs,
        batch_id: str,
        artemis_api_key: str = None,
        redundant_scan_query: dict = None,
        branch_cursor=None,
        repo: str = None,
    ):
        self.queue = queue
        self.service_info = ServiceInfo(service, service_dict, org, api_key)
        self.default_branch_only = default_branch_only
        self.plugins = plugins
        self.external_orgs = external_orgs
        self.log = Logger("ProcessGithubRepos")
        self.json_utils = JSONUtils(self.log)
        self.batch_id = batch_id
        self.artemis_api_key = artemis_api_key
        self.redundant_scan_query = redundant_scan_query or {}
        self.repo = repo

        self._setup(repo_cursor, branch_cursor)

    def _setup(self, repo_cursor, branch_cursor):
        """
        Updates the cursor to a None type if needed.
        Without this, GraphQL would read `null` as a string and not a Null value
        """
        self.service_info.repo_cursor = self._parse_cursor(repo_cursor)
        self.service_info.branch_cursor = self._parse_cursor(branch_cursor)

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

    def _analyze_error_response(self, response, response_text) -> str or None:
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
            self.log.warning("Github abuse limit has been reached.")
            return error_response
        if error_response == GITHUB_TIMEOUT_FLAG:
            self.log.warning("Github query timed out.")
            return error_response
        self.log.error("Code: %s - %s", response.status_code, error_response)
        return None

    def query(self) -> list:
        # Process a single repo
        if self.service_info.repo:
            self.log.info("Processing branches in repo: %s/%s", self.service_info.org, self.service_info.repo)
            return self._process_branches(self.service_info.repo, None, None)

        # Process all repos in an organization
        self.log.info(
            "Querying for repos in %s starting at cursor %s", self.service_info.org, self.service_info.repo_cursor
        )
        variables = {"org": self.service_info.org, "cursor": self.service_info.repo_cursor}
        response_text = self._query_github_api(GITHUB_REPO_QUERY, variables)
        if response_text in [GITHUB_RATE_ABUSE_FLAG, GITHUB_TIMEOUT_FLAG]:
            queue_service_and_org(
                self.queue,
                self.service_info.service,
                self.service_info.org,
                {"cursor": self.service_info.repo_cursor},
                self.default_branch_only,
                self.plugins,
                self.batch_id,
                self.redundant_scan_query,
            )
            return []
        resp = self.json_utils.get_json_from_response(response_text)
        if not resp:
            return []
        nodes = self.json_utils.get_object_from_json_dict(resp, ["data", "organization", "repositories", "nodes"])
        if not nodes:
            return []
        count = len(nodes)
        self.log.info("Processing %s Github results", count)

        repos = self._process_repos(nodes)

        page_info = self.json_utils.get_object_from_json_dict(
            resp, ["data", "organization", "repositories", "pageInfo"]
        )
        if not page_info:
            self.log.error("Key pageInfo not found for %s. Returning repos found.", self.service_info.org)
            return repos
        if page_info.get("hasNextPage"):
            cursor = page_info.get("endCursor")

            # Re-queue this org, setting the cursor for the next page of the query
            self.log.info("Queueing %s to re-start at cursor %s", self.service_info.org, cursor)
            queue_service_and_org(
                self.queue,
                self.service_info.service,
                self.service_info.org,
                {"cursor": cursor},
                self.default_branch_only,
                self.plugins,
                self.batch_id,
                self.redundant_scan_query,
            )

        return repos

    def _process_repos(self, nodes: list) -> list:
        """
        Handles processing for a single repository or all repositories in an organization
        """
        self.log.info("Processing repos in org: %s", self.service_info.org)
        repos = []
        for repo in nodes:
            name = repo.get("name")
            if f"{self.service_info.service}/{self.service_info.org}" in self.external_orgs and not repo.get(
                "isPrivate"
            ):
                # With an external org we only want to scan the private repos
                # shared with us any not that org's public repos
                self.log.info("Skipping public repo %s in external org", name)
                continue

            if not self._is_repo_valid(repo):
                continue

            default_branch = repo.get("defaultBranchRef")
            if not default_branch:
                default_branch_name = "HEAD"
            else:
                default_branch_name = default_branch.get("name", "HEAD")

            repos.extend(self._process_branches(name, default_branch_name, repo.get("refs")))
        return repos

    def _is_repo_valid(self, repo: dict):
        """
        Checks if the repo has branches.
        """
        if self.json_utils.get_object_from_json_dict(repo, ["refs", "nodes"]):
            return True

        self.log.info(f"repo {repo.get('name')} has no branches. Skipping")
        return False

    def _process_branches(self, repo_name, default_branch, branches) -> list:
        """
        Handles processing for all branches in a given repository
        """
        tasks = []
        self.log.debug("Processing branches in repo %s/%s", self.service_info.org, repo_name)

        if self.service_info.repo:
            # Query for Repo Branches
            variables = {
                "org": self.service_info.org,
                "repo": self.service_info.repo,
                "cursor": self.service_info.branch_cursor,
            }
            response_text = self._query_github_api(GITHUB_REPO_REF_QUERY, variables)
            if not response_text or response_text in [GITHUB_RATE_ABUSE_FLAG, GITHUB_TIMEOUT_FLAG]:
                return tasks
            response_dict = self.json_utils.get_json_from_response(response_text)
            if not response_dict:
                return tasks
            branches = self.json_utils.get_object_from_json_dict(
                response_dict, ["data", "organization", "repository", "refs"]
            )

        branch_names, timestamps = self._get_branch_names(repo_name, branches)
        if self.default_branch_only:
            branch_names = [default_branch]
            if default_branch not in timestamps:
                timestamps[default_branch] = "1970-01-01T00:00:00Z"

        for branch in branch_names:
            if not redundant_scan_exists(
                api_key=self.artemis_api_key,
                service=self.service_info.service,
                org=self.service_info.org,
                repo=repo_name,
                branch=branch,
                timestamp=timestamps[branch],
                query=self.redundant_scan_query,
            ):
                tasks.append(
                    {
                        "service": self.service_info.service,
                        "repo": repo_name,
                        "org": self.service_info.org,
                        "branch": branch,
                        "plugins": self.plugins,
                    }
                )
        return tasks

    def _get_branch_names(self, repo: str, refs: dict) -> Tuple[list, dict]:
        """
        Retrieves the branches and timestamps for a given repository.

        Returns:
            A list of branches(refs) for the given repo and
            a dictionary mapping each branch to the timestamp of the last commit

            For example:
            ["master"], {"master", "1970-01-01T00:00:00Z"}
        """
        ref_names = set()
        timestamps = dict()

        if not refs:
            return list(ref_names), timestamps

        for node in refs["nodes"]:
            ref_names.add(node.get("name"))
            timestamps[node.get("name")] = node.get("target", {}).get("committedDate", "1970-01-01T00:00:00Z")

        page_info = refs.get("pageInfo")
        if not page_info:
            self.log.error("Key pageInfo not found for %s. Returning ref names found.", self.service_info.org)
            return list(ref_names), timestamps

        next_page = page_info.get("hasNextPage")
        branch_cursor = page_info.get("endCursor")

        next_page = page_info.get("hasNextPage")
        if next_page:
            branch_cursor = page_info.get("endCursor")
            self.log.info("Queueing next page of branches in %s to re-start at cursor: %s", repo, branch_cursor)
            queue_branch_and_repo(
                self.queue,
                self.service_info.service,
                self.service_info.org,
                branch_cursor,
                repo,
                self.plugins,
                self.batch_id,
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
