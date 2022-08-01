# pylint: disable=no-name-in-module, no-member
import requests

from heimdall_repos.repo_layer_env import (
    GITHUB_RATE_ABUSE_FLAG,
    GITHUB_RATE_ABUSE_KEYWORDS,
    GITHUB_REPO_QUERY,
    GITHUB_REPO_REF_QUERY,
)
from heimdall_utils.aws_utils import GetProxySecret, queue_service_and_org
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
        cursor,
        default_branch_only,
        plugins,
        external_orgs,
        batch_id: str,
    ):
        self.queue = queue
        self.service_info = ServiceInfo(service, service_dict, org, api_key, cursor)
        self.default_branch_only = default_branch_only
        self.plugins = plugins
        self.external_orgs = external_orgs
        self.log = Logger("ProcessGithubRepos")
        self.json_utils = JSONUtils(self.log)
        self.batch_id = batch_id

    def _query_github_api(self, query: str) -> str:
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
            json={"query": query},
        )
        if response.status_code != 200:
            error_response = self._analyze_error_response(response)
            return self._report_error_response(response, error_response)
        return response.text

    def _analyze_error_response(self, response) -> str or None:
        if response is None:
            return None
        response_text = response.text
        if not response_text:
            return None
        resp = self.json_utils.get_json_from_response(response_text)
        if not resp:
            return response_text
        # check if related to rate abuse
        if str(response.status_code) == "403" and self._is_message_rate_abuse(resp.get("message")):
            return GITHUB_RATE_ABUSE_FLAG
        return resp

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

    def _report_error_response(self, response, error_response):
        if error_response == GITHUB_RATE_ABUSE_FLAG:
            self.log.warning("Github abuse limit has been reached.")
            return error_response
        self.log.error("Code: %s - %s", response.status_code, error_response)
        return None

    def query_github(self) -> list:
        self.log.info("Querying for repos in %s starting at cursor %s", self.service_info.org, self.service_info.cursor)
        query = GITHUB_REPO_QUERY % (self.service_info.org, self.service_info.cursor)
        response_text = self._query_github_api(query)
        if response_text == GITHUB_RATE_ABUSE_FLAG:
            queue_service_and_org(
                self.queue,
                self.service_info.service,
                self.service_info.org,
                {"cursor": self.service_info.cursor},
                self.default_branch_only,
                self.plugins,
                self.batch_id,
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

        repos = self._process_nodes(nodes)

        page_info = self.json_utils.get_object_from_json_dict(
            resp, ["data", "organization", "repositories", "pageInfo"]
        )
        if not page_info:
            self.log.error("Key pageInfo not found for %s. Returning repos found.", self.service_info.org)
            return repos
        if page_info.get("hasNextPage"):
            cursor = '"%s"' % page_info.get("endCursor")

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
            )

        return repos

    def _process_nodes(self, nodes: list) -> list:
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
            default_branch_name = repo.get("defaultBranchRef")
            if not self._is_repo_valid(repo):
                continue
            if not default_branch_name:
                default_branch_name = "HEAD"
            else:
                default_branch_name = default_branch_name.get("name")
            if self.default_branch_only:
                repos.append({"service": self.service_info.service, "repo": name, "org": self.service_info.org})
            else:
                refs = self._get_ref_names(name, default_branch_name, repo.get("refs"))
                for ref in refs:
                    repos.append(
                        {
                            "service": self.service_info.service,
                            "repo": name,
                            "org": self.service_info.org,
                            "branch": ref,
                            "plugins": self.plugins,
                        }
                    )
        return repos

    def _is_repo_valid(self, repo: dict):
        """
        Checks if the repo has branches.
        """
        if self.json_utils.get_object_from_json_dict(repo, ["refs", "nodes"]):
            return True

        self.log.info(f"repo {repo.get('name')} has no branches. Skipping")
        return False

    def _get_ref_names(self, repo: str, default: str, refs: dict) -> list:
        ref_names = set()
        ref_names.add(default)

        if not refs:
            return list(ref_names)

        for node in refs["nodes"]:
            ref_names.add(node.get("name"))

        page_info = refs.get("pageInfo")
        if not page_info:
            self.log.error("Key pageInfo not found for %s. Returning ref names found.", self.service_info.org)
            return list(ref_names)
        next_page = page_info.get("hasNextPage")
        cursor = page_info.get("endCursor")

        while next_page:
            query = GITHUB_REPO_REF_QUERY % (self.service_info.org, repo, cursor)
            response_text = self._query_github_api(query)
            if not response_text or response_text == GITHUB_RATE_ABUSE_FLAG:
                break
            response_dict = self.json_utils.get_json_from_response(response_text)
            if not response_dict:
                break
            repo_refs = self.json_utils.get_object_from_json_dict(
                response_dict, ["data", "organization", "repository", "refs"]
            )
            if not repo_refs:
                break
            for ref in repo_refs.get("nodes"):
                ref_names.add(ref.get("name"))

            page_info = repo_refs.get("pageInfo")
            if not page_info:
                self.log.error("Key pageInfo not found for %s/%s. Breaking.", self.service_info.org, repo)
                break
            next_page = page_info.get("hasNextPage")
            cursor = page_info.get("endCursor")

        return list(ref_names)

    def _get_authorization(self) -> str:
        if self.service_info.app_integration:
            # Attempt to get an app installation token for the organization
            github_app = GithubApp()
            token = github_app.get_installation_token(self.service_info.org)
            if token is not None:
                return f"token {token}"

        # Fall back to using the PAT
        return f"bearer {self.service_info.api_key}"
