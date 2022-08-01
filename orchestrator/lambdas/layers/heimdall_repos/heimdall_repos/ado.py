# pylint: disable=no-name-in-module,no-member
import requests

from heimdall_utils.aws_utils import queue_service_and_org
from heimdall_utils.utils import JSONUtils, Logger, ScanOptions, ServiceInfo

API_VERSION = "6.0"
CONTINUATION_HEADER = "x-ms-continuationtoken"

# The API for pulling repos does not support pagination (wat?) but the project
# API does. So, to keep things (hopefully) manageable we'll process one project
# at a time.
PROJECT_PAGE_SIZE = 1

REF_PAGE_SIZE = 50


class ADORepoProcessor:
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
        batch_id: str = None,
    ):
        self.queue = queue
        self.service_info = ServiceInfo(service, service_dict, org, api_key)
        self.scan_options = ScanOptions(default_branch_only, plugins, batch_id)
        self.external_orgs = external_orgs
        self.log = Logger("ADORepoProcessor")

        self._setup(cursor)
        self.json_utils = JSONUtils(self.log)

    def _setup(self, cursor):
        """
        Use logic to set the cursor class variables.
        """
        if not cursor or cursor in {"null", "None"}:
            self.service_info.cursor = "0"
        else:
            self.service_info.cursor = cursor

    def query(self) -> list:
        """
        Process ADO org, get all repos, and return the repos + branches
        """
        self.log.info("Querying for repos in %s", self.service_info.service_org)

        projects = self._get_projects(self.service_info.cursor)
        for project in projects["projects"]:
            repos = self._get_repos(project)

        if projects["cursor"]:
            # Re-queue this org, setting the cursor for the next page of the query
            self.log.info("Queueing %s to re-start at cursor %s", self.service_info.org, projects["cursor"])
            queue_service_and_org(
                self.queue,
                self.service_info.service,
                self.service_info.org,
                {"cursor": projects["cursor"]},
                self.scan_options.default_branch_only,
                self.scan_options.plugins,
                self.scan_options.batch_id,
            )

        return repos

    def _get_projects(self, cursor: str) -> dict:
        """Get the projects for this ADO organization"""
        resp = self._query_api(query="_apis/projects", params={"$top": PROJECT_PAGE_SIZE, "continuationToken": cursor})

        projects = [p["name"] for p in resp.get("value", [])]
        cursor = resp.get(CONTINUATION_HEADER)

        return {"projects": projects, "cursor": cursor}

    def _get_repos(self, project: str) -> dict:
        """Get the repos+refs for this ADO project"""
        resp = self._query_api(query=f"{project}/_apis/git/repositories")

        repos = []
        for repo in resp.get("value", []):
            refs = self._get_refs(project, repo["name"])
            for ref in refs:
                repos.append(
                    {
                        "service": self.service_info.service,
                        "repo": f"{project}/{repo['name']}",
                        "org": self.service_info.org,
                        "branch": ref,
                    }
                )

        return repos

    def _get_refs(self, project: str, repo: str, page_size=REF_PAGE_SIZE) -> list:
        """Get all of the branches for this repo

        Page size is a parameter mostly for testing purposes"""
        refs = []
        cursor = "0"

        # Page through the refs and grab all the branch names
        while cursor:
            resp = self._query_api(
                query=f"{project}/_apis/git/repositories/{repo}/refs",
                params={"$top": page_size, "continuationToken": cursor, "filter": "heads"},
            )
            refs += [r["name"].replace("refs/heads/", "") for r in resp.get("value", [])]
            cursor = resp.get(CONTINUATION_HEADER)  # If the continuation header is missing it will break the loop

        return refs

    def _query_api(self, query: str, params: dict = None) -> dict:
        """Generic Azure API query method"""
        headers = {
            "Authorization": "Basic %s" % self.service_info.api_key,
            "Accept": "application/json",
        }
        if not params:
            params = {}
        params.update({"api-version": API_VERSION})

        resp = requests.get(
            url=f"{self.service_info.url}/{self.service_info.org}/{query}",
            params=params,
            headers=headers,
        )
        if resp.status_code != 200:
            self.log.error("Error retrieving ADO query: %s", resp.text)
            return {}

        ret = resp.json()
        if CONTINUATION_HEADER in resp.headers:
            # Copy the cursor out of the headers and into the dict
            ret[CONTINUATION_HEADER] = resp.headers[CONTINUATION_HEADER]

        return ret
