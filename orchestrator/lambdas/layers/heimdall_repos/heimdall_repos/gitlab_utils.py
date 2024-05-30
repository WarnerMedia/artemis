"""
Takes care of gitlab service queries, returning a list of repositories to be queued for scanning
"""

# pylint: disable=no-name-in-module, no-member

from typing import Tuple

import requests

from heimdall_repos.repo_layer_env import GITLAB_REPO_QUERY
from heimdall_utils.artemis import redundant_scan_exists
from heimdall_utils.aws_utils import GetProxySecret, queue_service_and_org
from heimdall_utils.env import DEFAULT_API_TIMEOUT
from heimdall_utils.utils import JSONUtils, Logger, ServiceInfo
from heimdall_utils.variables import REV_PROXY_DOMAIN_SUBSTRING, REV_PROXY_SECRET_HEADER

LOG = Logger("ProcessGitlabRepos")


class ProcessGitlabRepos:
    """
    Processes Gitlab Organizations
    :param service: str name of service being processed
    :param service_dict: dict containing info about service
    :param org: str org or "group" being processed
    :param api_key: str api access key necessary to connect to service
    :param cursor: str 'page' the org repo results to process
    :param default_branch_only: bool indication of whether only the master branch of a repo will be pulled
    :param plugins: list of plugins to scan against the repo in Analyzer
    :param external_orgs: list of orgs that are public but can still be scanned
    """

    # pylint: disable=too-many-instance-attributes
    def __init__(
        self,
        queue: str,
        service: str,
        service_dict: dict = None,
        org: str = None,
        api_key: str = None,
        cursor: str = None,
        default_branch_only: bool = False,
        plugins: list = None,
        external_orgs: list = None,
        requeue_org: bool = True,
        batch_id: str = None,
        artemis_api_key: str = None,
        redundant_scan_query: dict = None,
    ):
        self.queue = queue
        self.service_info = ServiceInfo(service, service_dict, org, api_key, cursor)
        self.default_branch_only = default_branch_only
        self.plugins = plugins
        self.external_orgs = external_orgs
        self.requeue_orgs = requeue_org
        self.json_utils = JSONUtils(LOG)
        self.batch_id = batch_id
        self.artemis_api_key = artemis_api_key
        self.redundant_scan_query = redundant_scan_query

    def validate_input(self) -> bool:
        """
        Checks if important, but not necessarily available, information exists.
        If not, the validation fails and returns False.
        """
        if not self.service_info.url:
            LOG.error(
                "Service %s url was not found and therefore deemed unsupported",
                self.service_info.service,
            )
            return False

        if not self.service_info.branch_url and not self.default_branch_only:
            LOG.error(
                "Service %s url was not found and therefore deemed unsupported",
                self.service_info.service,
            )
            return False

        return True

    def query_gitlab(self) -> list:
        """
        MAIN FUNCTION:
        Pulls the service group information to get all repositories and branches,
        and compiles them into a list that is returned.
        :return: list of repos to scan
        """
        LOG.info("querying gitlab service %s", self.service_info.service)
        repos = []
        LOG.info(
            "Querying for repos in %s starting at cursor %s",
            self.service_info.service_org,
            self.service_info.cursor,
        )

        # Query the GitLab API
        response_text = self._query_gitlab_api(self.service_info.url)
        if not response_text:
            return repos

        resp = self.json_utils.get_json_from_response(response_text)
        if not resp:
            return repos

        nodes = self.json_utils.get_object_from_json_dict(resp, ["data", "group", "projects", "nodes"])
        if not nodes:
            return repos
        LOG.info("Processing %s results", len(nodes))

        repos_result = self._process_nodes(nodes)
        repos.extend(repos_result)

        page_info = self.json_utils.get_object_from_json_dict(resp, ["data", "group", "projects", "pageInfo"])
        if page_info and page_info.get("hasNextPage") and self.requeue_orgs:
            cursor = f"\"{page_info.get('endCursor')}\""

            # Re-queue this org, setting the cursor for the next page of the query
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

    def _process_nodes(self, nodes: list) -> list:
        """
        Processes each repo and its branches to be queued for scanning.
        :param nodes: list of repositories
        :return: list of repos or an empty list
        """
        repos = []
        # the repo name includes any org subgroups. To prevent subgroup duplicates, we post the base org only
        base_org = self.service_info.org.split("/")[0]
        for repo in nodes:
            name = repo["fullPath"].split("/", maxsplit=1)[1]
            if self.service_info.service_org in self.external_orgs and repo["visibility"] != "private":
                # With an external org we only want to scan the private repos
                # shared with us any not that org's public repos
                LOG.info("Skipping public repo %s in external org", name)
                continue
            if not repo["repository"]:
                repo["repository"] = {"rootRef": "HEAD"}
            if self.default_branch_only:
                if self.redundant_scan_query:
                    # Only make the additional query to get the rootRef timestamp if it will actually be used.
                    # If there is no redundant scan query we can skip making this API call.
                    refs, timestamps = self._get_ref_names(repo["id"], repo["repository"]["rootRef"])

                    timestamp = None
                    if refs and timestamps:
                        timestamp = timestamps[refs[0]]
                    else:
                        LOG.warning(
                            "Unable to retrieve timestamp for %s/%s/%s", self.service_info.service, base_org, name
                        )

                    if redundant_scan_exists(
                        api_key=self.artemis_api_key,
                        service=self.service_info.service,
                        org=self.service_info.org,
                        repo=name,
                        branch=None,
                        timestamp=timestamp,
                        query=self.redundant_scan_query,
                    ):
                        continue
                repos.append(
                    {"service": self.service_info.service, "repo": name, "org": base_org, "plugins": self.plugins}
                )
            else:
                LOG.info("getting branches for repo: %s", name)
                refs, timestamps = self._get_ref_names(repo["id"])
                for ref in refs:
                    if not redundant_scan_exists(
                        api_key=self.artemis_api_key,
                        service=self.service_info.service,
                        org=self.service_info.org,
                        repo=name,
                        branch=ref,
                        timestamp=timestamps[ref],
                        query=self.redundant_scan_query,
                    ):
                        repos.append(
                            {
                                "service": self.service_info.service,
                                "repo": name,
                                "org": base_org,
                                "branch": ref,
                                "plugins": self.plugins,
                            }
                        )
        LOG.info(
            "%d repos processed and ready to be queued for %s/%s",
            len(repos),
            self.service_info.service,
            self.service_info.org,
        )
        return repos

    def _get_ref_names(self, project_id: str, ref: str = None) -> Tuple[list, dict]:
        """
        Queries the service (using api/v4/ currently) to get all branches for a project.
        :param project_id: str unique id of project
        :return: list of branches
        """
        response_text = self._get_project_branches(project_id, ref)
        if not response_text:
            return [], {}

        response = self.json_utils.get_json_from_response(response_text)
        if isinstance(response, dict):
            # If we queried a single ref the response is a dict and needs to be a list
            response = [response]
        if response:
            return self._process_refs(response)
        return [], {}

    def _query_gitlab_api(self, url) -> str or None:
        """
        Sends a POST request to get all repositories under a gitlab group
        :param url: str url of the service to send the POST request to
        :return: str response text or None if the request was not successful
        """
        cursor = self.service_info.cursor
        # Set Cursor to None type. Without this, GraphQL would read this as a string and not a Null value
        if cursor == "null":
            cursor = None

        response = requests.post(
            url=url,
            headers=self._get_request_headers(url),
            json={
                "query": GITLAB_REPO_QUERY,
                "variables": {"org": self.service_info.org, "cursor": cursor},
            },
            timeout=DEFAULT_API_TIMEOUT,
        )
        if response.status_code != 200:
            LOG.error("Received %s status code when retrieving nodes: %s", response.status_code, response.text)
            return None
        return response.text

    def _get_project_branches(self, project_id: str, ref: str = None) -> str or None:
        """
        Sends a GET request to obtain all branches for a project
        :return: str response text containing project branches or None if the request was not successful
        """
        id_num = project_id.split("/")[-1]

        url = f"{self.service_info.branch_url}/projects/{id_num}/repository/branches"
        if ref is not None:
            url = f"{url}/{ref}"

        response = requests.get(
            url=url,
            headers=self._get_request_headers(self.service_info.branch_url),
            timeout=DEFAULT_API_TIMEOUT,
        )

        if response.status_code != 200:
            LOG.error(
                "Received %s status code when retrieving branches for %s: %s",
                response.status_code,
                project_id,
                response.text.replace("\n", " "),
            )
            return None
        return response.text

    def _get_request_headers(self, url: str) -> dict:
        headers = {
            "Authorization": f"bearer {self.service_info.api_key}",
            "Content-Type": "application/json",
        }
        if REV_PROXY_DOMAIN_SUBSTRING and REV_PROXY_DOMAIN_SUBSTRING in url:
            headers[REV_PROXY_SECRET_HEADER] = GetProxySecret()

        return headers

    def _process_refs(self, resp) -> Tuple[list, dict]:
        ref_names = set()
        timestamps = {}
        for ref in resp:
            ref_names.add(ref["name"])
            timestamps[ref["name"]] = ref["commit"]["committed_date"]
        return list(ref_names), timestamps
