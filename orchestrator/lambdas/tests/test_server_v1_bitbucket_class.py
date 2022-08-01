import os
import unittest

from heimdall_repos.objects.server_v1_bitbucket_class import ServerV1Bitbucket
from heimdall_utils.utils import get_json_from_file

TEST_DIR = os.path.dirname(os.path.abspath(__file__))

TEST_SERVER_ORG_RESPONSE_FILE = os.path.abspath(os.path.join(TEST_DIR, "data", "bitbucket_server_org_response.json"))

TEST_SERVER_BRANCH_RESPONSE_FILE = os.path.abspath(
    os.path.join(TEST_DIR, "data", "bitbucket_server_branches_response.json")
)

SERVER_SERVICE = "not bitbucket"
TEST_URL = "www.example.com"
TEST_KEY = "test_key"
TEST_ORG = "zeus"
TEST_REPO = "athena"
TEST_CURSOR = "4"


class TestServerV1Bitbucket(unittest.TestCase):
    def setUp(self) -> None:
        self.server_org_response = get_json_from_file(TEST_SERVER_ORG_RESPONSE_FILE)
        self.server_org_response_nodes = self.server_org_response.get("values")
        self.server_branch_response = get_json_from_file(TEST_SERVER_BRANCH_RESPONSE_FILE)
        self.server_branch_response_nodes = self.server_branch_response.get("values")
        self.service_helper = ServerV1Bitbucket(SERVER_SERVICE)

    def test_is_public_server_true(self):
        result = self.service_helper.is_public(self.server_org_response_nodes[0])

        self.assertTrue(result)

    def test_has_next_page_server_true(self):
        private_response = dict(self.server_org_response)
        private_response["isLastPage"] = False

        result = self.service_helper.has_next_page(private_response)

        self.assertTrue(result)

    def test_has_next_page_server_false(self):
        result = self.service_helper.has_next_page(self.server_org_response)

        self.assertFalse(result)

    def test_get_cursor_private_pass(self):
        cursor = 100
        private_response = dict(self.server_org_response)
        private_response["nextPageStart"] = cursor

        result = self.service_helper.get_cursor(private_response)

        self.assertEqual(cursor, result)

    def test_get_branch_name_server_pass(self):
        expected_result = self.server_branch_response_nodes[0].get("displayId")

        result = self.service_helper.get_branch_name(self.server_branch_response_nodes[0])

        self.assertEqual(expected_result, result)

    def test_construct_bitbucket_org_url_server(self):
        expected_result = f"{TEST_URL}/projects/{TEST_ORG}/repos?start=0"
        cursor = self.service_helper.get_default_cursor()

        result = self.service_helper.construct_bitbucket_org_url(TEST_URL, TEST_ORG, cursor)

        self.assertEqual(expected_result, result)

    def test_construct_bitbucket_repo_url_server(self):
        expected_result = f"{TEST_URL}/projects/{TEST_ORG}/repos/{TEST_REPO}?start=0"
        cursor = self.service_helper.get_default_cursor()

        result = self.service_helper.construct_bitbucket_repo_url(TEST_URL, TEST_ORG, TEST_REPO, cursor)

        self.assertEqual(expected_result, result)

    def test_construct_bitbucket_refs_url_server_with_cursor(self):
        expected_result = f"{TEST_URL}/projects/{TEST_ORG}/repos/{TEST_REPO}/branches?start={TEST_CURSOR}"
        result = self.service_helper.construct_bitbucket_branch_url(TEST_URL, TEST_ORG, TEST_REPO, TEST_CURSOR)

        self.assertEqual(expected_result, result)
