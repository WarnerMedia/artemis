# pylint: disable=no-name-in-module,no-member
import requests

from aws_lambda_powertools import Logger

from heimdall_utils.artemis import redundant_scan_exists
from heimdall_utils.aws_utils import queue_service_and_org
from heimdall_utils.env import DEFAULT_API_TIMEOUT, APPLICATION
from heimdall_utils.utils import JSONUtils, ScanOptions, ServiceInfo, parse_timestamp

API_VERSION = "6.0"
CONTINUATION_HEADER = "x-ms-continuationtoken"

# The API for pulling repos does not support pagination (wat?) but the project
# API does. So, to keep things (hopefully) manageable we'll process one project
# at a time.
PROJECT_PAGE_SIZE = 1

REF_PAGE_SIZE = 50

log = Logger(service=APPLICATION, name="ADORepoProcessor", child=True)


class ADORepoProcessor:
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
        self.artemis_api_key = artemis_api_key
        self.redundant_scan_query = redundant_scan_query

        self._setup()
        self.json_utils = JSONUtils(log)

    def _setup(self):
        """
        Use logic to set the cursor class variables.
        """
        self.service_info.repo_cursor = self._parse_cursor(self.service_info.repo_cursor)
        self.service_info.branch_cursor = self._parse_cursor(self.service_info.branch_cursor)

    def _parse_cursor(self, cursor) -> str:
        if not cursor or cursor in {"null", "None"}:
            return "0"
        return cursor

    def query(self) -> list:
        """
        Process ADO org, get all repos, and return the repos + branches
        """
        log.info("Querying for repos in %s", self.service_info.service_org)

        repos = []

        projects = self._get_projects(self.service_info.repo_cursor)
        for project in projects["projects"]:
            repos = self._get_repos(project)

        if projects["cursor"]:
            # Re-queue this org, setting the cursor for the next page of the query
            log.info("Queueing %s to re-start at cursor %s", self.service_info.org, projects["cursor"])
            queue_service_and_org(
                self.queue,
                self.service_info.service,
                self.service_info.org,
                {"cursor": projects["cursor"]},
                self.scan_options.default_branch_only,
                self.scan_options.plugins,
                self.scan_options.batch_id,
                self.redundant_scan_query,
            )

        return repos

    def _get_projects(self, cursor: str) -> dict:
        """Get the projects for this ADO organization"""
        resp = self._query_api(query="_apis/projects", params={"$top": PROJECT_PAGE_SIZE, "continuationToken": cursor})

        projects = [p["name"] for p in resp.get("value", [])]
        cursor = resp.get(CONTINUATION_HEADER)

        return {"projects": projects, "cursor": cursor}

    def _get_repos(self, project: str) -> list:
        """Get the repos+refs for this ADO project"""
        resp = self._query_api(query=f"{project}/_apis/git/repositories")

        repos = []
        for repo in resp.get("value", []):
            if self.scan_options.default_branch_only:
                if self.redundant_scan_query:
                    # Only make the additional queries to get the default branch commit and timestamp if it will
                    # actually be used. If there is no redundant scan query we can skip making these API calls.
                    commit_id = self._get_ref_commit_id(project, repo["name"], repo["defaultBranch"])
                    timestamp = self._get_commit_timestamp(project, repo["name"], commit_id)
                    if redundant_scan_exists(
                        api_key=self.artemis_api_key,
                        service=self.service_info.service,
                        org=self.service_info.org,
                        repo=f"{project}/{repo['name']}",
                        branch=None,
                        timestamp=timestamp,
                        query=self.redundant_scan_query,
                    ):
                        continue
                repos.append(
                    {
                        "service": self.service_info.service,
                        "repo": f"{project}/{repo['name']}",
                        "org": self.service_info.org,
                        "plugins": self.scan_options.plugins,
                    }
                )
            else:
                refs = self._get_refs(project, repo["name"])
                for ref, commit_id in refs:
                    if self.redundant_scan_query:
                        # Only make the additional query to get the default branch timestamp if it will actually be
                        # used. If there is no redundant scan query we can skip making this API call.
                        timestamp = self._get_commit_timestamp(project, repo["name"], commit_id)
                        if redundant_scan_exists(
                            api_key=self.artemis_api_key,
                            service=self.service_info.service,
                            org=self.service_info.org,
                            repo=f"{project}/{repo['name']}",
                            branch=ref,
                            timestamp=timestamp,
                            query=self.redundant_scan_query,
                        ):
                            continue
                    repos.append(
                        {
                            "service": self.service_info.service,
                            "repo": f"{project}/{repo['name']}",
                            "org": self.service_info.org,
                            "plugins": self.scan_options.plugins,
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
            refs += [(r["name"].replace("refs/heads/", ""), r["objectId"]) for r in resp.get("value", [])]
            cursor = resp.get(CONTINUATION_HEADER)  # If the continuation header is missing it will break the loop

        return refs

    def _get_ref_commit_id(self, project: str, repo: str, ref: str) -> str:
        """Get the timestamp for a commit"""
        resp = self._query_api(query=f"{project}/_apis/git/repositories/{repo}/{ref}")
        if resp["value"]:
            return resp["value"][0]["objectId"]
        return None

    def _get_commit_timestamp(self, project: str, repo: str, commit_id: str) -> str:
        """Get the timestamp for a commit"""
        resp = self._query_api(query=f"{project}/_apis/git/repositories/{repo}/commits/{commit_id}")
        timestamp = resp.get("committer", {}).get("date")
        return parse_timestamp(timestamp)

    def _query_api(self, query: str, params: dict = None) -> dict:
        """Generic Azure API query method"""
        headers = {
            "Authorization": f"Basic {self.service_info.api_key}",
            "Accept": "application/json",
        }
        if not params:
            params = {}
        params.update({"api-version": API_VERSION})

        resp = requests.get(
            url=f"{self.service_info.url}/{self.service_info.org}/{query}",
            params=params,
            headers=headers,
            timeout=DEFAULT_API_TIMEOUT,
        )
        if resp.status_code != 200:
            log.error("Error retrieving ADO query: %s", resp.text)
            return {}

        ret = resp.json()
        if CONTINUATION_HEADER in resp.headers:
            # Copy the cursor out of the headers and into the dict
            ret[CONTINUATION_HEADER] = resp.headers[CONTINUATION_HEADER]

        return ret
