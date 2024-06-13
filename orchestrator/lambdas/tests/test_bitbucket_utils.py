import copy
import json
import os
import unittest
from unittest.mock import patch

from heimdall_repos import bitbucket_utils
from heimdall_repos.objects.cloud_bitbucket_class import CloudBitbucket
from heimdall_repos.objects.server_v1_bitbucket_class import ServerV1Bitbucket
from heimdall_utils.utils import ScanOptions, ServiceInfo, get_json_from_file

TEST_DIR = os.path.dirname(os.path.abspath(__file__))

TEST_PRIVATE_ORG_RESPONSE_FILE = os.path.abspath(os.path.join(TEST_DIR, "data", "bitbucket_server_org_response.json"))
TEST_PRIVATE_BRANCHES_RESPONSE_FILE = os.path.abspath(
    os.path.join(TEST_DIR, "data", "bitbucket_server_branches_response.json")
)

TEST_URL = "www.example.com"
TEST_KEY = "test_key"
TEST_ORG = "zeus"
TEST_REPO = "athena"
TEST_REPO_CURSOR = "4"
TEST_BRANCH_CURSOR = "1"
TEST_SERVICE_DICT = {"url": TEST_URL, "branch_url": None}
TEST_PLUGINS = ["eslint"]

TEST_EXTERNAL_ORGS = [f"bitbucket/{TEST_ORG}"]

TEST_BATCH_ID = "4886eea8-ebca-4bcf-bf22-063ca255067c"

BITBUCKET_SERVICE = "bitbucket"
SERVER_SERVICE = "not bitbucket"

TEST_REPO_RESPONSE = [
    {"slug": "actual-repo-name-1", "is_private": True, "mainbranch": {"name": "main", "type": "branch"}},
    {"slug": "actual-repo-name-2", "is_private": True, "mainbranch": {"name": "not-main", "type": "branch"}},
    {"slug": "has-no-default-branch", "is_private": False},
]

TEST_BRANCH_NAMES_RESPONSE = (["main"], {"main": "1970-01-01T00:00:00Z"})

EXPECTED_RESULT_PROCESS_REPOS = [
    {"branch": "main", "org": "zeus", "repo": "actual-repo-name-1", "service": "bitbucket", "plugins": ["eslint"]},
    {"branch": "main", "org": "zeus", "repo": "actual-repo-name-2", "service": "bitbucket", "plugins": ["eslint"]},
    {"branch": "main", "org": "zeus", "repo": "has-no-default-branch", "service": "bitbucket", "plugins": ["eslint"]},
]

TEST_CLOUD_BRANCH_RESPONSE_FILE = os.path.abspath(
    os.path.join(TEST_DIR, "data", "bitbucket_cloud_branch_response.json")
)


class TestBitbucketUtils(unittest.TestCase):
    def setUp(self) -> None:
        self.private_org_response = get_json_from_file(TEST_PRIVATE_ORG_RESPONSE_FILE)
        self.private_org_response_nodes = self.private_org_response.get("values")
        self.cloud_branch_response = get_json_from_file(TEST_CLOUD_BRANCH_RESPONSE_FILE)
        self.cloud_service_helper = CloudBitbucket(BITBUCKET_SERVICE)
        self.server_service_helper = ServerV1Bitbucket(SERVER_SERVICE)

        service_info = ServiceInfo(BITBUCKET_SERVICE, TEST_SERVICE_DICT, TEST_ORG, TEST_KEY, TEST_REPO_CURSOR)
        scan_options = ScanOptions(False, TEST_PLUGINS, TEST_BATCH_ID, None)

        self.process_bitbucket_cloud = bitbucket_utils.ProcessBitbucketRepos(
            queue="",
            service_info=service_info,
            scan_options=scan_options,
            external_orgs=TEST_EXTERNAL_ORGS,
        )

        service_info = ServiceInfo(SERVER_SERVICE, TEST_SERVICE_DICT, TEST_ORG, TEST_KEY)
        self.process_bitbucket_server = bitbucket_utils.ProcessBitbucketRepos(
            queue="",
            service_info=service_info,
            scan_options=scan_options,
            external_orgs=TEST_EXTERNAL_ORGS,
        )

    @patch.object(bitbucket_utils.ProcessBitbucketRepos, "_get_branch_names")
    def test_process_repos_cloud_not_private_and_external(self, get_branch_names):
        self.assertEqual(self.process_bitbucket_cloud._get_branch_names, get_branch_names)
        get_branch_names.return_value = TEST_BRANCH_NAMES_RESPONSE

        expected_result = copy.deepcopy(EXPECTED_RESULT_PROCESS_REPOS)
        # In the test_repo_response, repo 'has-no-default-branch' is set as a public repo.
        # Since EXTERNAL_ORGS has the test org 'zeus', repos will be passed over if they are public.
        del expected_result[2]
        result = self.process_bitbucket_cloud._process_repos(TEST_REPO_RESPONSE)

        self.assertEqual(expected_result, result)

    @patch.object(bitbucket_utils.ProcessBitbucketRepos, "_get_branch_names")
    def test_process_repos_cloud_pass(self, get_branch_names):
        self.assertEqual(self.process_bitbucket_cloud._get_branch_names, get_branch_names)
        get_branch_names.return_value = TEST_BRANCH_NAMES_RESPONSE

        expected_result = copy.deepcopy(EXPECTED_RESULT_PROCESS_REPOS)
        # In the test_repo_response, repo 'has-no-default-branch' is set as a public repo.
        # Since EXTERNAL_ORGS has the test org 'zeus', repos will be passed over if they are public.
        del expected_result[2]

        result = self.process_bitbucket_cloud._process_repos(TEST_REPO_RESPONSE)

        self.assertEqual(expected_result, result)

    @patch.object(bitbucket_utils.ProcessBitbucketRepos, "_query_bitbucket_api")
    def test_get_branch_names_cloud_null_response(self, query_bitbucket_api):
        self.assertEqual(self.process_bitbucket_cloud._query_bitbucket_api, query_bitbucket_api)
        query_bitbucket_api.return_value = None

        expected_result = ([], {})
        result = self.process_bitbucket_cloud._get_branch_names(TEST_REPO)

        self.assertEqual(expected_result, result)

    @patch.object(bitbucket_utils.ProcessBitbucketRepos, "_query_bitbucket_api")
    def test_get_branch_names_cloud_no_values(self, query_bitbucket_api):
        self.assertEqual(self.process_bitbucket_cloud._query_bitbucket_api, query_bitbucket_api)
        query_bitbucket_api.return_value = json.dumps({"error": "something went wrong!"})

        expected_result = ([], {})
        result = self.process_bitbucket_cloud._get_branch_names(TEST_REPO)

        self.assertEqual(expected_result, result)

    @patch.object(bitbucket_utils.ProcessBitbucketRepos, "_query_bitbucket_api")
    def test_get_branch_names_cloud_pass(self, query_bitbucket_api):
        self.assertEqual(self.process_bitbucket_cloud._query_bitbucket_api, query_bitbucket_api)
        query_bitbucket_api.return_value = json.dumps(self.cloud_branch_response)

        expected_result = ["development", "main", "origin/testbranch"]
        result, _ = self.process_bitbucket_cloud._get_branch_names(TEST_REPO)

        self.assertEqual(expected_result, sorted(result))

    def test_construct_bitbucket_org_url_server_success_no_cursor(self):
        expected_url = f"{TEST_URL}/projects/{TEST_ORG}/repos?start=0"

        query_url = self.process_bitbucket_server.service_helper.construct_bitbucket_org_url(
            self.process_bitbucket_server.service_info.url,
            self.process_bitbucket_server.service_info.org,
            self.process_bitbucket_server.service_info.repo_cursor,
        )

        self.assertEqual(expected_url, query_url)

    def test_construct_bitbucket_org_url_server_success_cursor(self):
        service_info = ServiceInfo(SERVER_SERVICE, TEST_SERVICE_DICT, TEST_ORG, TEST_KEY, TEST_REPO_CURSOR)
        bitbucket_server_with_cursor = bitbucket_utils.ProcessBitbucketRepos(
            queue="",
            service_info=service_info,
            scan_options=None,
            external_orgs=None,
        )

        expected_url = f"{TEST_URL}/projects/{TEST_ORG}/repos?start={TEST_REPO_CURSOR}"

        query_url = bitbucket_server_with_cursor.service_helper.construct_bitbucket_org_url(
            bitbucket_server_with_cursor.service_info.url,
            bitbucket_server_with_cursor.service_info.org,
            bitbucket_server_with_cursor.service_info.repo_cursor,
        )

        self.assertEqual(expected_url, query_url)
