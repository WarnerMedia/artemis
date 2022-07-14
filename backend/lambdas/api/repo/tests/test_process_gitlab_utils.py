import unittest
from string import Template
from unittest.mock import patch

from repo.gitlab_util import process_gitlab_utils
from repo.util.const import GITLAB_QUERY_NO_BRANCH, GITLAB_QUERY_WITH_BRANCH

TEST_SERVICE_URL = None
TEST_QUERY_LIST = [
    '    repo0 {\n  project(fullPath: "test/test_package") {\n    httpUrlToRepo,'
    "\n    fullPath,\n    visibility,\n    statistics {\n      repositorySize\n    }\n  }\n}"
]
TEST_QUERY_RESPONSE = {
    "data": {
        "project": {
            "httpUrlToRepo": "https://test_gitlab_instance/test/test_package.git",
            "fullPath": "test/test_package",
            "visibility": "internal",
            "statistics": {"repositorySize": 8787066},
        }
    }
}

TEST_RESPONSE_DICT = {"data": {"repo0": TEST_QUERY_RESPONSE["data"]["project"]}}


class TestGitlabUtils(unittest.TestCase):
    @patch.object(process_gitlab_utils, "_get_query_response")
    def test_process_query_list(self, get_query_response):
        self.assertEqual(process_gitlab_utils._get_query_response, get_query_response)
        get_query_response.return_value = TEST_QUERY_RESPONSE
        resp = process_gitlab_utils._process_query_list(None, TEST_SERVICE_URL, TEST_QUERY_LIST, False)
        self.assertEqual(TEST_RESPONSE_DICT, resp)

    def test_build_query_no_branch(self):
        request_list = [{"org": "testorg", "repo": "testrepo"}]
        expected_query = Template(GITLAB_QUERY_NO_BRANCH).substitute(
            count=0, org_name=request_list[0]["org"], repo=request_list[0]["repo"]
        )
        self.build_queries(request_list, expected_query)

    def test_build_queries_branch(self):
        request_list = [{"org": "testorg", "repo": "testrepo", "branch": "main"}]
        expected_query = Template(GITLAB_QUERY_WITH_BRANCH).substitute(
            count=0, org_name=request_list[0]["org"], repo=request_list[0]["repo"], branch=request_list[0]["branch"]
        )
        self.build_queries(request_list, expected_query)

    def build_queries(self, request_list, expected_query):
        service_type = "github"
        authz = [[["github/*"]]]
        query_list, _, _ = process_gitlab_utils._build_queries(req_list=request_list, authz=authz, service=service_type)
        self.assertEqual(expected_query.strip(), query_list[0].strip())
