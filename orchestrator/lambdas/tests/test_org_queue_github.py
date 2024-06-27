# pylint: disable=no-member
import json
import os
import unittest
from copy import deepcopy
from unittest.mock import patch

from heimdall_orgs.org_queue_private_github import GithubOrgs
from heimdall_utils.utils import Logger

TEST_DIR = os.path.dirname(os.path.abspath(__file__))
GITHUB_ORG_GRAPHQL_ERROR_RESPONSE = os.path.abspath(os.path.join(TEST_DIR, "data", "github_org_error_response.json"))
GITHUB_ORG_RESPONSE_LOC = os.path.abspath(os.path.join(TEST_DIR, "data", "github_org_response.json"))
SERVICES_LOC = os.path.abspath(os.path.join(TEST_DIR, "data", "services.json"))
RESPONSE_TEST_RESULT = [
    "testorg1",
    "testorg2",
    "testorg3",
    "testorg4",
    "testorg5",
    "testorg6",
    "testorg7",
    "testorg8",
    "testorg9",
]

log = Logger(__name__)


class TestOrgQueueGithub(unittest.TestCase):
    def setUp(self) -> None:
        self.maxDiff = None
        self.org_dict = get_json_from_file(GITHUB_ORG_RESPONSE_LOC)
        self.error_response = get_json_from_file(GITHUB_ORG_GRAPHQL_ERROR_RESPONSE)

    @patch.object(GithubOrgs, "_request_orgs")
    def test_get_org_set_original_dict(self, mock_request):
        github_orgs = GithubOrgs(None, None, None)
        self.assertEqual(github_orgs._request_orgs, mock_request)
        mock_request.return_value = self.org_dict

        github_orgs.get_org_set()
        self.assertEqual(set(RESPONSE_TEST_RESULT), github_orgs.org_set)

    @patch.object(GithubOrgs, "_request_orgs")
    def test_get_org_set_altered_dict(self, mock_request):
        github_orgs = GithubOrgs(None, None, None)
        self.assertEqual(github_orgs._request_orgs, mock_request)
        response_1 = deepcopy(self.org_dict)
        response_1["data"]["organizations"]["nodes"] = response_1["data"]["organizations"]["nodes"][0:4]
        mock_request.return_value = response_1

        github_orgs.get_org_set()
        self.assertEqual(set(RESPONSE_TEST_RESULT[0:4]), github_orgs.org_set)

    @patch.object(GithubOrgs, "_request_orgs")
    def test_get_all_orgs_two_sets(self, mock_request):
        self.assertEqual(GithubOrgs._request_orgs, mock_request)
        response_1 = deepcopy(self.org_dict)
        response_2 = deepcopy(self.org_dict)
        response_1["data"]["organizations"]["nodes"] = response_1["data"]["organizations"]["nodes"][0:4]
        response_1["data"]["organizations"]["pageInfo"]["hasNextPage"] = True
        response_2["data"]["organizations"]["nodes"] = response_2["data"]["organizations"]["nodes"][4:]
        mock_request.side_effect = [response_1, response_2]

        org_set = GithubOrgs.get_all_orgs(None, None, None)
        self.assertEqual(set(RESPONSE_TEST_RESULT), org_set)

    @patch.object(GithubOrgs, "_request_orgs")
    def test_get_all_orgs_one_set(self, mock_request):
        self.assertEqual(GithubOrgs._request_orgs, mock_request)
        mock_request.return_value = self.org_dict

        org_set = GithubOrgs.get_all_orgs(None, None, None)
        self.assertEqual(set(RESPONSE_TEST_RESULT), org_set)

    @patch.object(GithubOrgs, "_query_service")
    def test_get_all_orgs_handles_graphql_error(self, mock_request):
        self.assertEqual(GithubOrgs._query_service, mock_request)
        mock_request.return_value = self.error_response

        org_set = GithubOrgs.get_all_orgs(None, None, None)
        self.assertEqual(None, org_set)


def get_json_from_file(file_path):
    with open(file_path) as f:
        return json.load(f)
