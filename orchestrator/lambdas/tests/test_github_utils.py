import copy
import json
import unittest
from dataclasses import dataclass
from unittest.mock import patch

from heimdall_repos import github_utils
from heimdall_repos.repo_layer_env import GITHUB_RATE_ABUSE_FLAG, GITHUB_TIMEOUT_FLAG

from heimdall_utils.utils import ScanOptions, ServiceInfo

TEST_ABUSE_RESPONSE = {
    "documentation_url": "https://developer.github.com/v3/#abuse-rate-limits",
    "message": "You have triggered an abuse detection mechanism. Please wait a few minutes before you try again.",
}

TEST_RATE_LIMIT_RESPONSE = {"errors": [{"type": "RATE_LIMITED", "message": "API rate limit exceeded for user ID."}]}

TEST_HEADERS_RATE_LIMIT_OK = {"X-RateLimit-Remaining": 1000}

TEST_HEADERS_RATE_LIMIT_EXCEEDED = {"X-RateLimit-Remaining": 0}

TEST_TIMEOUT_RESPONSE = {
    "data": None,
    "errors": [{"message": "Something went wrong while executing your query. This may be the result of a timeout."}],
}

TEST_RESPONSE_NO_ERRORS = {
    "data": {"organization": {"repositories": {"nodes": [], "pageInfo": {"endCursor": "null", "hasNextPage": "false"}}}}
}

TEST_EMPTY_NODE = {
    "name": "analytics-kit-typescript",
    "defaultBranchRef": None,
    "diskUsage": 0,
    "isPrivate": True,
    "refs": {"nodes": [], "pageInfo": {"endCursor": None, "hasNextPage": False}},
}

TEST_SERVICE = "github"
TEST_ORG = "wm-test"
TEST_URL = "www.example.com"
TEST_KEY = "test_key"
TEST_REPO = "athena"
TEST_CURSOR = "4"
TEST_SERVICE_DICT = {"url": TEST_URL, "branch_url": None}
TEST_PLUGINS = ["eslint"]

TEST_EXTERNAL_ORGS = [f"github/{TEST_ORG}"]

TEST_BATCH_ID = "4886eea8-ebca-4bcf-bf22-063ca255067c"


@dataclass
class Response:
    text: str
    status_code: int
    headers: dict


class TestGithubUtils(unittest.TestCase):
    def setUp(self) -> None:
        service_info = ServiceInfo(TEST_SERVICE, TEST_SERVICE_DICT, TEST_ORG, TEST_KEY, TEST_CURSOR)
        scan_options = ScanOptions(False, TEST_PLUGINS, TEST_BATCH_ID, None)
        self.process_github_repos = github_utils.ProcessGithubRepos(
            queue=None,
            service_info=service_info,
            scan_options=scan_options,
            external_orgs=TEST_EXTERNAL_ORGS,
        )

    def test_check_for_errors_in_response_dict_true(self):
        result = self.process_github_repos._check_for_errors_in_response_body(TEST_RATE_LIMIT_RESPONSE)

        self.assertTrue(result)

    def test_check_for_errors_in_response_dict_false(self):
        result = self.process_github_repos._check_for_errors_in_response_body(TEST_RESPONSE_NO_ERRORS)

        self.assertFalse(result)

    def test_analyze_error_response_none(self):
        result = self.process_github_repos._analyze_error_response(None, None)

        self.assertIsNone(result)

    def test_analyze_error_response_string(self):
        response = Response("I am an error response.", 400, TEST_HEADERS_RATE_LIMIT_OK)
        response_text = self.process_github_repos._get_response_text(response)

        result = self.process_github_repos._analyze_error_response(response, response_text)

        self.assertEqual(response.text, result)

    def test_analyze_error_response_dict(self):
        response = Response('{"message": "error!"}', 400, TEST_HEADERS_RATE_LIMIT_OK)
        response_text = self.process_github_repos._get_response_text(response)

        expected_result = json.loads(response.text)
        result = self.process_github_repos._analyze_error_response(response, response_text)

        self.assertEqual(expected_result, result)

    def test_analyze_error_response_rate_abuse_dict(self):
        response = Response(json.dumps(TEST_ABUSE_RESPONSE), 403, TEST_HEADERS_RATE_LIMIT_OK)
        response_text = self.process_github_repos._get_response_text(response)
        result = self.process_github_repos._analyze_error_response(response, response_text)

        self.assertEqual(GITHUB_RATE_ABUSE_FLAG, result)

    def test_analyze_error_response_rate_limit_dict(self):
        response = Response(json.dumps(TEST_RATE_LIMIT_RESPONSE), 200, TEST_HEADERS_RATE_LIMIT_OK)
        response_text = self.process_github_repos._get_response_text(response)
        result = self.process_github_repos._analyze_error_response(response, response_text)

        self.assertEqual(GITHUB_RATE_ABUSE_FLAG, result)

    def test_analyze_error_response_rate_limit_header(self):
        response = Response(json.dumps(TEST_RESPONSE_NO_ERRORS), 200, TEST_HEADERS_RATE_LIMIT_EXCEEDED)
        response_text = self.process_github_repos._get_response_text(response)
        result = self.process_github_repos._analyze_error_response(response, response_text)

        self.assertEqual(GITHUB_RATE_ABUSE_FLAG, result)

    def test_analyze_error_response_timeout_dict(self):
        response = Response(json.dumps(TEST_TIMEOUT_RESPONSE), 502, TEST_HEADERS_RATE_LIMIT_OK)
        response_text = self.process_github_repos._get_response_text(response)
        result = self.process_github_repos._analyze_error_response(response, response_text)

        self.assertEqual(GITHUB_TIMEOUT_FLAG, result)

    @patch.object(github_utils, "queue_service_and_org")
    @patch.object(github_utils.ProcessGithubRepos, "_query_github_api")
    def test_query_gitlab_rate_abuse(self, query_mock, queue_mock):
        self.assertEqual(self.process_github_repos._query_github_api, query_mock)
        query_mock.return_value = GITHUB_RATE_ABUSE_FLAG
        self.assertEqual(github_utils.queue_service_and_org, queue_mock)

        self.process_github_repos.query()

        self.assertTrue(queue_mock.called)

    def test_process_repos_repo_no_branches(self):
        expected_response = []

        response = self.process_github_repos._process_repos([TEST_EMPTY_NODE])

        self.assertEqual(expected_response, response)

    def test_validate_repo_no_branches(self):
        test_repo = copy.deepcopy(TEST_EMPTY_NODE)
        test_repo["diskUsage"] = 1000
        expected_response = False

        response = self.process_github_repos._is_repo_valid(test_repo)

        self.assertEqual(expected_response, response)

    def test_validate_repo_success(self):
        test_repo = copy.deepcopy(TEST_EMPTY_NODE)
        test_repo["refs"]["nodes"] = [{"name": "master"}]
        test_repo["diskUsage"] = 1000
        expected_response = True

        response = self.process_github_repos._is_repo_valid(test_repo)

        self.assertEqual(expected_response, response)
