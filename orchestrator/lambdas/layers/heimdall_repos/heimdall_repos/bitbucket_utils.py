# pylint: disable=no-name-in-module,no-member
from typing import Tuple

import requests
import time

from heimdall_repos.objects.cloud_bitbucket_class import CloudBitbucket
from heimdall_repos.objects.server_v1_bitbucket_class import ServerV1Bitbucket
from heimdall_utils.artemis import redundant_scan_exists
from heimdall_utils.aws_utils import GetProxySecret, queue_service_and_org, queue_branch_and_repo
from heimdall_utils.utils import JSONUtils, Logger, ScanOptions, ServiceInfo
from heimdall_utils.variables import REV_PROXY_DOMAIN_SUBSTRING, REV_PROXY_SECRET_HEADER


class ProcessBitbucketRepos:
    def __init__(
        self,
        queue: str,
        service: str,
        service_dict: dict = None,
        org: str = None,
        api_key: str = None,
        repo_cursor: str = None,
        default_branch_only: bool = False,
        plugins: list = None,
        external_orgs: list = None,
        batch_id: str = None,
        artemis_api_key: str = None,
        redundant_scan_query: dict = None,
        branch_cursor=None,
        repo=None,
    ):
        self.queue = queue
        self.service_info = ServiceInfo(service, service_dict, org, api_key, repo=repo)
        self.scan_options = ScanOptions(default_branch_only, plugins, batch_id)
        self.external_orgs = external_orgs
        self.log = Logger("ProcessBitbucketRepos")
        self.service_helper = None
        self.artemis_api_key = artemis_api_key
        self.redundant_scan_query = redundant_scan_query

        self._setup(service, repo_cursor, branch_cursor)
        self.json_utils = JSONUtils(self.log)

    def _setup(self, service, repo_cursor, branch_cursor):
        """
        Use logic to set the cursor class variables.
        """
        if service == "bitbucket":
            self.service_helper = CloudBitbucket(service)
        else:
            self.service_helper = ServerV1Bitbucket(service)

        self.service_info.repo_cursor = self._parse_cursor(repo_cursor)
        self.service_info.branch_cursor = self._parse_cursor(branch_cursor)

    def _parse_cursor(self, cursor):
        if cursor in {"null", "None", None}:
            return self.service_helper.get_default_cursor()
        return cursor

    def query(self) -> list:
        """
        Process bitbucket org, get all repos, and return the repos + branches
        """
        # Process branches in a single repository
        if self.service_info.repo:
            self.log.info("Processing branches in repo: %s/%s", self.service_info.org, self.service_info.repo)
            return self._process_branches(self.service_info.repo)

        # Process all repositories in an organization
        self.log.info("Querying for repos in %s", self.service_info.service_org)
        repo_query_url = self.service_helper.construct_bitbucket_org_url(
            self.service_info.url, self.service_info.org, self.service_info.repo_cursor
        )

        response_text = self._query_bitbucket_api(repo_query_url)
        resp = self.json_utils.get_json_from_response(response_text)
        if not resp:
            return []
        nodes = resp.get("values")

        repos = self._process_repos(nodes)

        if self.service_helper.has_next_page(resp):
            cursor = self.service_helper.get_cursor(resp)
            # Re-queue this org, setting the cursor for the next page of the query
            self.log.info("Queueing next page of repos %s to re-start at cursor %s", self.service_info.org, cursor)
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

    def _process_repos(self, nodes: list) -> list:
        """
        Handles processing for a single repository or all repositories in an organization
        """
        repos = []
        for repo in nodes:
            name = repo.get("slug")
            # With an external org we only want to scan the private repos
            # shared with us any not that org's public repos
            if f"bitbucket/{self.service_info.org}" in self.external_orgs and self.service_helper.is_public(repo):
                self.log.info("Skipping public repo %s in external org", name)
                return []

            # default_branch = repo.get("mainbranch", {}).get("name", None)

            repos.extend(self._process_branches(name))
        return repos

    def _process_branches(self, repo_name: str) -> list:
        """
        Handles processing for all branches in a given repository
        """
        branch_tasks = []

        branch_names, timestamps = self._get_branch_names(repo_name)
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
                branch_tasks.append(
                    {
                        "service": self.service_info.service,
                        "repo": repo_name,
                        "org": self.service_info.org,
                        "plugins": self.scan_options.plugins,
                        "branch": branch,
                    }
                )
        return branch_tasks

    def _get_branch_names(self, repo) -> Tuple[list, dict]:
        """
        Retrieves the branches and timestamps for a given repository.

        Returns:
            A list of branches(refs) for the given repo and
            a dictionary mapping each branch to the timestamp of the last commit

            For example:
            ["master"], {"master", "1970-01-01T00:00:00Z"}
        """
        branch_cursor = self.service_info.branch_cursor
        repo_url = self.service_helper.construct_bitbucket_branch_url(
            self.service_info.url,
            self.service_info.org,
            repo,
            branch_cursor,
            self.scan_options.default_branch_only,
        )

        ref_names = set()
        timestamps = dict()

        self.log.debug("Processing branches in repo %s/%s", self.service_info.org, repo)
        response_text = self._query_bitbucket_api(repo_url)
        response_dict = self.json_utils.get_json_from_response(response_text)

        if not response_dict:
            self.log.warning("Unable to process repo %s/%s", self.service_info.org, repo)
            return list(ref_names), timestamps

        if self.scan_options.default_branch_only:
            repo_refs = [response_dict]
        else:
            repo_refs = response_dict.get("values", [])

        if not repo_refs:
            self.log.warning(
                "Bitbucket repo dict branch list was None. Confirm JSON values at %s",
                repo_url,
            )
        for ref in repo_refs:
            ref_name = self.service_helper.get_branch_name(ref)
            ref_names.add(ref_name)

            timestamp = self._get_branch_timestamp(repo, ref)
            timestamps[ref_name] = timestamp

        if self.service_helper.has_next_page(response_dict):
            branch_cursor = self.service_helper.get_cursor(response_dict)

            self.log.info("Queueing next page of branches in %s to re-start at cursor: %s", repo, branch_cursor)
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

    def _get_branch_timestamp(self, repo: str, ref: dict):
        """
        Retrieves the timestamp of the last commit in a given branch(ref)
        """
        if "target" in ref and "date" in ref["target"]:
            return ref["target"]["date"]

        self.log.debug("Querying the commit endpoint for the timestamp of the latest commit")
        commit_id = ref["latestCommit"]
        commit_url = self.service_helper.construct_bitbucket_commit_url(
            self.service_info.url, self.service_info.org, repo, commit_id
        )
        commit_query_response = self._query_bitbucket_api(commit_url)
        commit_query_response_dict = self.json_utils.get_json_from_response(commit_query_response)

        # Convert timestamp from milliseconds to seconds
        timestamp = commit_query_response_dict["committerTimestamp"]
        timestamp = timestamp / 1000

        # Format timestamp
        timestamp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(timestamp))

        return timestamp

    def _query_bitbucket_api(self, url: str) -> str or None:
        with requests.session() as session:
            headers = {
                "Authorization": f"Basic {self.service_info.api_key}",
                "Accept": "application/json",
            }
            if REV_PROXY_DOMAIN_SUBSTRING and REV_PROXY_DOMAIN_SUBSTRING in url:
                headers[REV_PROXY_SECRET_HEADER] = GetProxySecret()
            response = session.get(url=url, headers=headers)
            if response.status_code != 200:
                self.log.error("Error retrieving Bitbucket query: %s", response.text)
                return None
            return response.text
