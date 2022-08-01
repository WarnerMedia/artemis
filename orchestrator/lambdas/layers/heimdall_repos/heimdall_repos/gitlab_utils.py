"""
Takes care of gitlab service queries, returning a list of repositories to be queued for scanning
"""
# pylint: disable=no-name-in-module, no-member

import requests

from heimdall_repos.repo_layer_env import GITLAB_REPO_QUERY
from heimdall_utils.aws_utils import GetProxySecret, queue_service_and_org
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
    ):
        self.queue = queue
        self.service_info = ServiceInfo(service, service_dict, org, api_key, cursor)
        self.default_branch_only = default_branch_only
        self.plugins = plugins
        self.external_orgs = external_orgs
        self.requeue_orgs = requeue_org
        self.json_utils = JSONUtils(LOG)
        self.batch_id = batch_id

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
            cursor = '"%s"' % page_info.get("endCursor")

            # Re-queue this org, setting the cursor for the next page of the query
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
                repos.append(
                    {"service": self.service_info.service, "repo": name, "org": base_org, "plugins": self.plugins}
                )
            else:
                LOG.info("getting branches for repo: %s", name)
                refs = self._get_ref_names(repo["id"])
                for ref in refs:
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

    def _get_ref_names(self, project_id: str) -> list:
        """
        Queries the service (using api/v4/ currently) to get all branches for a project.
        :param project_id: str unique id of project
        :return: list of branches
        """
        response_text = self._get_project_branches(project_id)
        if not response_text:
            return []

        response_dict = self.json_utils.get_json_from_response(response_text)
        if response_dict:
            return self._process_refs(response_dict)
        return []

    def _query_gitlab_api(self, url) -> str or None:
        """
        Sends a POST request to get all repositories under a gitlab group
        :param url: str url of the service to send the POST request to
        :return: str response text or None if the request was not successful
        """

        response = requests.post(
            url=url,
            headers=self._get_request_headers(url),
            json={"query": GITLAB_REPO_QUERY % (self.service_info.org, self.service_info.cursor)}
        )
        if response.status_code != 200:
            LOG.error("Received %s status code when retrieving nodes: %s", response.status_code, response.text)
            return None
        return response.text

    def _get_project_branches(self, project_id: str) -> str or None:
        """
        Sends a GET request to obtain all branches for a project
        :return: str response text containing project branches or None if the request was not successful
        """
        id_num = project_id.split("/")[-1]
        response = requests.get(
            url=f"{self.service_info.branch_url}/projects/{id_num}/repository/branches",
            headers=self._get_request_headers(self.service_info.branch_url)
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
            "Authorization": "bearer %s" % self.service_info.api_key,
            "Content-Type": "application/json",
        }
        if REV_PROXY_DOMAIN_SUBSTRING and REV_PROXY_DOMAIN_SUBSTRING in url:
            headers[REV_PROXY_SECRET_HEADER] = GetProxySecret()

        return headers

    def _process_refs(self, resp):
        ref_names = set()
        for ref in resp:
            ref_names.add(ref["name"])
        return list(ref_names)
