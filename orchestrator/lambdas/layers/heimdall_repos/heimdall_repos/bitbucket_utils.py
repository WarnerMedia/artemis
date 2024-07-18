# pylint: disable=no-name-in-module,no-member
from typing import Tuple

import requests
import time

from aws_lambda_powertools import Logger

from heimdall_repos.objects.cloud_bitbucket_class import CloudBitbucket
from heimdall_repos.objects.server_v1_bitbucket_class import ServerV1Bitbucket
from heimdall_utils.artemis import redundant_scan_exists
from heimdall_utils.aws_utils import GetProxySecret, queue_service_and_org, queue_branch_and_repo
from heimdall_utils.env import APPLICATION
from heimdall_utils.utils import JSONUtils, ScanOptions, ServiceInfo
from heimdall_utils.variables import REV_PROXY_DOMAIN_SUBSTRING, REV_PROXY_SECRET_HEADER

log = Logger(service=APPLICATION, name="ProcessBitbucketRepos", child=True)


class ProcessBitbucketRepos:
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
        self.scan_options = scan_options
        self.service_info = service_info
        self.external_orgs = external_orgs
        self.json_utils = JSONUtils(log)
        self.service_helper = None
        self.artemis_api_key = artemis_api_key
        self.redundant_scan_query = redundant_scan_query

        self._setup()

    def _setup(self):
        """
        Use logic to set the cursor class variables for the ServiceInfo
        """
        service = self.service_info.service
        if service == "bitbucket":
            self.service_helper = CloudBitbucket(service)
        else:
            self.service_helper = ServerV1Bitbucket(service)

        self.service_info.repo_cursor = self._parse_cursor(self.service_info.repo_cursor)
        self.service_info.branch_cursor = self._parse_cursor(self.service_info.branch_cursor)

    def _parse_cursor(self, cursor):
        if cursor in {"null", "None", None}:
            return self.service_helper.get_default_cursor()
        return cursor

    def query(self) -> list:
        """
        Process bitbucket org, get all repos, and return the repos + branches
        """
        if self.scan_options.repo:
            # Process a single repository
            log.info("Querying for branches in repo: %s/%s", self.service_info.org, self.scan_options.repo)
            query = self.service_helper.construct_bitbucket_single_repo_url(
                url=self.service_info.url, org=self.service_info.org, repo=self.scan_options.repo
            )
        else:
            # Process all repositories in an organization
            log.info("Querying for repos in %s", self.service_info.service_org)
            query = self.service_helper.construct_bitbucket_org_url(
                self.service_info.url, self.service_info.org, self.service_info.repo_cursor
            )

        response_text = self._query_bitbucket_api(query)
        resp = self.json_utils.get_json_from_response(response_text)
        if not resp:
            return []

        nodes = resp.get("values", [])
        if not nodes and "slug" in resp:
            nodes = [resp]

        repos = self._process_repos(nodes)

        if self.service_helper.has_next_page(resp):
            cursor = self.service_helper.get_cursor(resp)
            # Re-queue this org, setting the cursor for the next page of the query
            log.info("Queueing next page of repos %s to re-start at cursor %s", self.service_info.org, cursor)
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
                log.info("Skipping public repo %s in external org", name)
                continue

            default_branch = self._get_default_branch(name, repo)
            repos.extend(self._process_branches(name, default_branch))

        return repos

    def _process_branches(self, repo_name: str, default_branch: str) -> list:
        """
        Handles processing for all branches in a given repository
        """
        branch_tasks = []
        branch_names, timestamps = self._get_branch_names(repo_name)

        if self.scan_options.default_branch_only:
            branch_names = [default_branch]
            timestamp = timestamps.get(default_branch, "1970-01-01T00:00:00Z")
            timestamps = {default_branch: timestamp}

        for branch in branch_names:
            search_branch = branch
            if branch == default_branch:
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
                if branch == default_branch:
                    task.pop("branch")

                branch_tasks.append(task)
        return branch_tasks

    def _get_branch_names(self, repo: str) -> Tuple[list, dict]:
        """
        Retrieves the branches and timestamps for a given repository.

        Args:
            repo (str): name of the repo to process

        Returns:
            Tuple[list, dict]: A list of branches for the given repo and
            a dictionary mapping each branch to the timestamp of the last commit

            For example:
            ["master"], {"master", "1970-01-01T00:00:00Z"}
        """
        branch_cursor = self.service_info.branch_cursor
        repo_url = self.service_helper.construct_bitbucket_branch_url(
            url=self.service_info.url,
            org=self.service_info.org,
            repo=repo,
            cursor=branch_cursor,
        )

        ref_names = set()
        timestamps = dict()

        log.debug("Processing branches in repo: %s/%s", self.service_info.org, repo, repo=repo)

        response_text = self._query_bitbucket_api(repo_url)
        response_dict = self.json_utils.get_json_from_response(response_text)

        if not response_dict:
            log.warning("Unable to process branches in repo %s/%s", self.service_info.org, repo)
            return list(ref_names), timestamps

        repo_refs = response_dict.get("values", [])

        if not repo_refs:
            log.warning(
                "Bitbucket repo dict branch list was None. Confirm JSON values at %s",
                repo_url,
            )
        for ref in repo_refs:
            ref_name = self.service_helper.get_branch_name(ref)
            ref_names.add(ref_name)

            timestamp = self._get_branch_timestamp(repo, ref)
            timestamps[ref_name] = timestamp

        if self.service_helper.has_next_page(response_dict) and not self.scan_options.default_branch_only:
            branch_cursor = self.service_helper.get_cursor(response_dict)

            log.info("Queueing next page of branches in %s to re-start at cursor: %s", repo, branch_cursor, repo=repo)
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

    def _get_default_branch(self, repo_name: str, repo_dict: dict) -> str:
        """Returns the name of the default branch for a given repo

        Args:
            repo_name (str): The name of the repo
            repo_dict (dict): The dictionary containing the branch name

        Returns:
            (str): The name of the default branch
        """
        default_branch = self.service_helper.get_default_branch_name(repo_dict)
        if not default_branch:
            url = self.service_helper.construct_bitbucket_default_branch_url(
                url=self.service_info.url, org=self.service_info.org, repo=repo_name
            )
            response = self._query_bitbucket_api(url)
            response = self.json_utils.get_json_from_response(response)
            if not response:
                log.warning("Unable to retrieve Default Branch for repo: %s/%s", self.service_info.org, repo_name)
                default_branch = "HEAD"
                return default_branch

            default_branch = self.service_helper.get_default_branch_name(response)
        return default_branch

    def _get_branch_timestamp(self, repo: str, ref: dict):
        """
        Retrieves the timestamp of the last commit in a given branch(ref)
        """
        if "target" in ref and "date" in ref["target"]:
            return ref["target"]["date"]

        commit_id = ref.get("latestCommit", None)
        if not commit_id:
            return "1970-01-01T00:00:00Z"

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
            if response.status_code == 429:
                log.error("Error retrieving Bitbucket query. Rate Limit Reached")
                raise requests.HTTPError("Bitbucket Rate Limit Reached")
            if response.status_code != 200:
                log.error("Error retrieving Bitbucket query: %s, Error Code: %s", url, response.status_code)
                return None
            return response.text
