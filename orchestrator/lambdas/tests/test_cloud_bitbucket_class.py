import copy
import os
import unittest

from heimdall_repos.objects.cloud_bitbucket_class import CloudBitbucket
from heimdall_utils.utils import get_json_from_file
from lambdas.tests.test_bitbucket_utils import (
    TEST_CLOUD_BRANCH_RESPONSE_FILE,
    TEST_CURSOR,
    TEST_DIR,
    TEST_ORG,
    TEST_REPO,
    TEST_REPO_RESPONSE,
    TEST_URL,
)

TEST_CLOUD_ORG_RESPONSE_FILE = os.path.abspath(os.path.join(TEST_DIR, "data", "bitbucket_cloud_org_response.json"))
TEST_NEXT_VALUE = "https://bitbucket.org/api/2.0/repositories/wbdigital?page=2"


class TestCloudBitbucket(unittest.TestCase):
    def setUp(self) -> None:
        self.service_helper = CloudBitbucket("bitbucket")
        self.org_response = get_json_from_file(TEST_CLOUD_ORG_RESPONSE_FILE)
        self.branch_response = get_json_from_file(TEST_CLOUD_BRANCH_RESPONSE_FILE)

    def test_is_public_cloud_true(self):
        result = self.service_helper.is_public(TEST_REPO_RESPONSE[2])

        self.assertTrue(result)

    def test_has_next_page_cloud_true(self):
        test_org_response = copy.deepcopy(self.org_response)
        test_org_response["next"] = TEST_NEXT_VALUE
        result = self.service_helper.has_next_page(test_org_response)

        self.assertTrue(result)

    def test_has_next_page_cloud_false(self):
        private_response = copy.deepcopy(self.org_response)
        del private_response["next"]
        result = self.service_helper.has_next_page(private_response)

        self.assertFalse(result)

    def test_get_cursor_cloud_pass(self):
        result = self.service_helper.get_cursor(self.org_response)

        self.assertEqual("2", result)

    def test_get_branch_name_cloud_pass(self):
        branch_dict = self.branch_response["values"][0]
        expected_result = (branch_dict["links"]["self"]["href"]).split("/refs/branches/")[1]

        result = self.service_helper.get_branch_name(branch_dict)

        self.assertEqual(expected_result, result)

    def test_construct_bitbucket_org_url_cloud(self):
        expected_result = f"{TEST_URL}/repositories/{TEST_ORG}?page=1"
        cursor = self.service_helper.get_default_cursor()

        result = self.service_helper.construct_bitbucket_org_url(TEST_URL, TEST_ORG, cursor)

        self.assertEqual(expected_result, result)

    def test_construct_bitbucket_repo_url_cloud(self):
        expected_result = f"{TEST_URL}/repositories/{TEST_ORG}/{TEST_REPO}?page=1"
        cursor = self.service_helper.get_default_cursor()

        result = self.service_helper.construct_bitbucket_repo_url(TEST_URL, TEST_ORG, TEST_REPO, cursor)

        self.assertEqual(expected_result, result)

    def test_construct_bitbucket_refs_url_with_cursor(self):
        expected_result = f"{TEST_URL}/repositories/{TEST_ORG}/{TEST_REPO}/refs/branches?page={TEST_CURSOR}"
        result = self.service_helper.construct_bitbucket_branch_url(TEST_URL, TEST_ORG, TEST_REPO, TEST_CURSOR)

        self.assertEqual(expected_result, result)
