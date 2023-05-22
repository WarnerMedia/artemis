# pylint: disable=no-name-in-module,no-member
from typing import Tuple

import requests

from heimdall_repos.objects.cloud_bitbucket_class import CloudBitbucket
from heimdall_repos.objects.server_v1_bitbucket_class import ServerV1Bitbucket
from heimdall_utils.artemis import redundant_scan_exists
from heimdall_utils.aws_utils import GetProxySecret, queue_service_and_org
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
        cursor: str = None,
        default_branch_only: bool = False,
        plugins: list = None,
        external_orgs: list = None,
        batch_id: str = None,
        artemis_api_key: str = None,
        redundant_scan_query: dict = None,
    ):
        self.queue = queue
        self.service_info = ServiceInfo(service, service_dict, org, api_key)
        self.scan_options = ScanOptions(default_branch_only, plugins, batch_id)
        self.external_orgs = external_orgs
        self.log = Logger("ProcessBitbucketRepos")
        self.service_helper = None
        self.artemis_api_key = artemis_api_key
        self.redundant_scan_query = redundant_scan_query

        self._setup(service, cursor)
        self.json_utils = JSONUtils(self.log)

    def _setup(self, service, cursor):
        """
        Use logic to set the sevice_helper and cursor class variables.
        """
        if service == "bitbucket":
            self.service_helper = CloudBitbucket(service)
        else:
            self.service_helper = ServerV1Bitbucket(service)

        if not cursor or cursor in {"null", "None"}:
            self.service_info.cursor = self.service_helper.get_default_cursor()
        else:
            self.service_info.cursor = cursor

    def query_bitbucket(self) -> list:
        """
        Process bitbucket org, get all repos, and return the repos + branches
        """
        self.log.info("Querying for repos in %s", self.service_info.service_org)
        repo_query_url = self.service_helper.construct_bitbucket_org_url(
            self.service_info.url, self.service_info.org, self.service_info.cursor
        )
        self.log.info(repo_query_url)
        response_text = self._query_bitbucket_api(repo_query_url)
        resp = self.json_utils.get_json_from_response(response_text)
        if not resp:
            return []
        nodes = resp.get("values")

        # process repos
        repos = self._process_nodes(nodes)

        if self.service_helper.has_next_page(resp):
            cursor = self.service_helper.get_cursor(resp)
            # Re-queue this org, setting the cursor for the next page of the query
            self.log.info("Queueing %s to re-start at cursor %s", self.service_info.org, cursor)
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

    def _process_nodes(self, nodes: list) -> list:
        """
        Process org repos, get main branch and list of other branches, and return list of dicts with all information.
        :param nodes: list of repos to process
        """
        self.log.info("processing repos")
        repos = []
        for repo in nodes:
            name = repo.get("slug")
            if f"bitbucket/{self.service_info.org}" in self.external_orgs and self.service_helper.is_public(repo):
                self.log.info("Skipping public repo %s in external org", name)
                continue
            main_branch = repo.get("mainbranch")
            if main_branch:
                main_branch = main_branch.get("name")
            else:
                main_branch = "master"

            if self.scan_options.default_branch_only:
                if self.redundant_scan_query:
                    # Only make the additional query to get the default branch timestamp if it will actually be used.
                    # If there is no redundant scan query we can skip making this API call.
                    refs, timestamps = self._get_ref_names(name, main_branch, main_branch)
                    if redundant_scan_exists(
                        api_key=self.artemis_api_key,
                        service=self.service_info.service,
                        org=self.service_info.org,
                        repo=name,
                        branch=None,
                        timestamp=timestamps[refs[0]],
                        query=self.redundant_scan_query,
                    ):
                        continue
                repos.append(
                    {
                        "service": self.service_info.service,
                        "repo": name,
                        "org": self.service_info.org,
                        "plugins": self.scan_options.plugins,
                    }
                )
            else:
                refs, timestamps = self._get_ref_names(name, main_branch)
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
                                "org": self.service_info.org,
                                "plugins": self.scan_options.plugins,
                                "branch": ref,
                            }
                        )

        return repos

    def _get_ref_names(self, repo: str, default: str, branch: str = None) -> Tuple[list, dict]:
        """
        Get and return list of branches for a repo.
        :param repo: repository name
        :param default: default branch name
        """
        self.log.info("getting branches for repo %s", repo)
        ref_names = set()
        ref_names.add(default)
        timestamps = {default: "1970-01-01T00:00:00Z"}  # Will be overridden later
        cursor = self.service_helper.get_default_cursor()
        while cursor:
            repo_url = self.service_helper.construct_bitbucket_branch_url(
                self.service_info.url, self.service_info.org, repo, cursor, branch
            )
            response_text = self._query_bitbucket_api(repo_url)
            response_dict = self.json_utils.get_json_from_response(response_text)
            if not response_dict:
                return list(ref_names), timestamps

            repo_refs = response_dict.get("values")
            if not repo_refs:
                self.log.warning(
                    "Bitbucket repo dict branch list was None. Confirm JSON values at %s",
                    repo_url,
                )
                break

            for ref in repo_refs:
                ref_name = self.service_helper.get_branch_name(ref)
                ref_names.add(ref_name)
                timestamps[ref_name] = ref["target"]["date"]

            cursor = None
            if self.service_helper.has_next_page(response_dict):
                cursor = self.service_helper.get_cursor(response_dict)

        return list(ref_names), timestamps

    def _query_bitbucket_api(self, url: str) -> str or None:
        with requests.session() as sess:
            headers = {
                "Authorization": f"Basic {self.service_info.api_key}",
                "Accept": "application/json",
            }
            if REV_PROXY_DOMAIN_SUBSTRING and REV_PROXY_DOMAIN_SUBSTRING in url:
                headers[REV_PROXY_SECRET_HEADER] = GetProxySecret()
            response = sess.get(url=url, headers=headers)
            if response.status_code != 200:
                self.log.error("Error retrieving Bitbucket query: %s", response.text)
                return None
            return response.text
