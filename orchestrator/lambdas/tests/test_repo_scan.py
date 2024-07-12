import copy
from dataclasses import dataclass
import json
import unittest
from collections import namedtuple
from unittest.mock import patch

from repo_scan import repo_scan

TEST_BATCH_ID = "4886eea8-ebca-4bcf-bf22-063ca255067c"
ANALYZER_RESPONSE_TEXT_GITHUB_ESLINT = {
    "queued": ["adult-swim/eslint-config/39b3ff89-f3b2-4cf7-a346-1a8201f930a5"],
    "failed": [],
}
ANALYZER_RESPONSE_TEXT_GITHUB_ESLINT_AND_GRAPHITE = {
    "queued": [
        "adult-swim/eslint-config/39b3ff89-f3b2-4cf7-a346-1a8201f930a5",
        "cue/graphite/11111111-f3b2-4cf7-a346-1a8201f91111",
    ],
    "failed": [],
}
ANALYZER_RESPONSE_TEXT_BITBUCKET = {
    "queued": ["wbdigital/portal_web/40c4gg90-f3c3-4cf7-b456-1a8201f941b6"],
    "failed": [],
}
ANALYZER_QUEUED_RESULT_GITHUB_ESLINT = [
    {
        "repos": {"adult-swim/eslint-config": "39b3ff89-f3b2-4cf7-a346-1a8201f930a5"},
        "service": "github",
        "success": True,
    }
]
ANALYZER_QUEUED_RESULT_GITHUB_ESLINT_AND_GRAPHITE = [
    {
        "repos": {
            "adult-swim/eslint-config": "39b3ff89-f3b2-4cf7-a346-1a8201f930a5",
            "cue/graphite": "11111111-f3b2-4cf7-a346-1a8201f91111",
        },
        "service": "github",
        "success": True,
    }
]
ANALYZER_QUEUED_RESULT_BITBUCKET = [
    {
        "repos": {"wbdigital/portal_web": "40c4gg90-f3c3-4cf7-b456-1a8201f941b6"},
        "service": "bitbucket",
        "success": True,
    }
]
FAIL_RESPONSE_WITH_MESSAGE = {"message": "I am a Message"}
FAIL_RESPONSE_WITH_FAILED_LIST = {"failed": ["message", "failure"]}
FAIL_RESPONSE_WITH_UNAUTHORIZED = {"unauthorized": ["message", "failure"]}
GITHUB_CONSTRUCTED_REQUEST = {
    "github": [
        {
            "repo": "eslint-config",
            "org": "adult-swim",
            "plugins": ["gitsecrets", "base_images"],
            "batch_priority": True,
            "branch": "master",
            "batch_id": TEST_BATCH_ID,
        },
        {
            "batch_priority": True,
            "branch": "master",
            "org": "cue",
            "plugins": ["gitsecrets", "base_images"],
            "repo": "graphite",
            "batch_id": TEST_BATCH_ID,
        },
    ]
}
BITBUCKET_CONSTRUCTED_REQUEST = {
    "bitbucket": [
        {
            "repo": "portal_web",
            "org": "wbdigital",
            "plugins": ["gitsecrets", "base_images"],
            "batch_priority": True,
            "branch": "master",
            "batch_id": TEST_BATCH_ID,
        }
    ]
}
MESSAGES = [
    {
        "MessageId": "899e8a0b-bb4b-440b-b1ad-f84ad4817675",
        "ReceiptHandle": "jumbledhashyoucantreadthisitstoojumbled",
        "MD5OfBody": "cc37ad6df43694d917af4b8470f0c299",
        "Body": '{"service": "github", "repo": "eslint-config", "org": "adult-swim", "branch": "master"}',
    }
]
POLLED_REPOS = [
    {"service": "github", "repo": "eslint-config", "org": "adult-swim", "branch": "master", "batch_id": TEST_BATCH_ID},
    {"service": "github", "org": "adult-swim", "branch": "master", "batch_id": TEST_BATCH_ID},
    {"service": "github", "repo": "eslint-config", "branch": "master", "batch_id": TEST_BATCH_ID},
    {"service": "github", "repo": "graphite", "org": "cue", "branch": "master", "batch_id": TEST_BATCH_ID},
    {"service": "bitbucket", "repo": "portal_web", "org": "wbdigital", "branch": "master", "batch_id": TEST_BATCH_ID},
]

POLLED_RESULT_REPOS = [{"repo": ["adult-swim/eslint-config", "cue/graphite"], "service": "github", "success": True}]

RECEIPT_HANDLES = ["jumbledhashyoucantreadthisitstoojumbled"]
RESPONSE_CODE_PASS = 200
RESPONSE_CODE_FAIL = 401
RESPONSE_TUPLE = namedtuple("response_tuple", ["status_code", "text"])
TEST_PLUGINS = ["gitsecrets", "base_images"]


@dataclass
class MockLambdaContext:
    function_name: str = "test"
    memory_limit_in_mb: int = 128
    invoked_function_arn: str = "arn:aws:lambda:eu-west-1:809313241:function:test"
    aws_request_id: str = "52fdfc07-2182-154f-163f-5f0f9a621d72"


class TestRepoScan(unittest.TestCase):
    """
    Functions that will not be covered:
    get_analyzer_api_key
    send_analyzer_request
    get_sqs_message
    delete_processed_messages
    get_queue_size
    """

    @classmethod
    def setUpClass(cls) -> None:
        github_requests = GITHUB_CONSTRUCTED_REQUEST["github"]
        cls.github_lookup_req = {
            "github": {
                f'{github_requests[0]["org"]}/{github_requests[0]["repo"]}': github_requests[0],
                f'{github_requests[1]["org"]}/{github_requests[1]["repo"]}': github_requests[1],
            }
        }
        bitbucket_request = BITBUCKET_CONSTRUCTED_REQUEST["bitbucket"][0]
        cls.bitbucket_lookup_req = {
            "bitbucket": {f'{bitbucket_request["org"]}/{bitbucket_request["repo"]}': bitbucket_request}
        }

    @patch.object(repo_scan, "get_queue_size")
    def test_run_message_num_0(self, queue_mock):
        self.assertEqual(repo_scan.get_queue_size, queue_mock)
        queue_mock.return_value = 0

        result = repo_scan.run(context=MockLambdaContext, event={})

        self.assertIsNone(result)

    @patch.object(repo_scan, "get_sqs_message")
    @patch.object(repo_scan, "get_analyzer_api_key")
    @patch.object(repo_scan, "get_queue_size")
    def test_run_sqs_empty_list(self, queue_mock, api_key_mock, sqs_mock):
        self.assertEqual(repo_scan.get_queue_size, queue_mock)
        self.assertEqual(repo_scan.get_analyzer_api_key, api_key_mock)
        self.assertEqual(repo_scan.get_sqs_message, sqs_mock)
        queue_mock.return_value = 10
        api_key_mock.return_value = ""
        sqs_mock.return_value = []

        result = repo_scan.run(context=MockLambdaContext, event={})

        self.assertTrue(sqs_mock.called)
        self.assertIsNone(result)

    @patch.object(repo_scan, "batch_update_db")
    @patch.object(repo_scan, "send_analyzer_request")
    @patch.object(repo_scan, "delete_processed_messages")
    @patch.object(repo_scan, "get_sqs_message")
    @patch.object(repo_scan, "get_analyzer_api_key")
    @patch.object(repo_scan, "get_queue_size")
    def test_run_success(self, queue_mock, api_key_mock, sqs_mock, delete_mock, send_mock, mock_db_fun):
        self.assertEqual(repo_scan.get_queue_size, queue_mock)
        self.assertEqual(repo_scan.get_analyzer_api_key, api_key_mock)
        self.assertEqual(repo_scan.get_sqs_message, sqs_mock)
        self.assertEqual(repo_scan.delete_processed_messages, delete_mock)
        self.assertEqual(repo_scan.send_analyzer_request, send_mock)
        self.assertEqual(repo_scan.batch_update_db, mock_db_fun)
        queue_mock.return_value = 10
        api_key_mock.return_value = ""
        sqs_mock.side_effect = [MESSAGES, []]
        send_mock.return_value = RESPONSE_TUPLE(200, json.dumps(ANALYZER_RESPONSE_TEXT_GITHUB_ESLINT))

        expected_result = ANALYZER_QUEUED_RESULT_GITHUB_ESLINT

        result = repo_scan.run(context=MockLambdaContext, event={})

        self.assertTrue(sqs_mock.called)
        self.assertTrue(delete_mock.called)
        self.assertTrue(send_mock.called)
        self.assertEqual(expected_result, result)

    def test_process_messages_multiple_items(self):
        expected_handles = [MESSAGES[0]["ReceiptHandle"]]
        expected_repos = [json.loads(MESSAGES[0]["Body"])]

        expected_result = repo_scan.PROCESSED_MESSAGES(expected_repos, expected_handles)

        result = repo_scan.process_messages(MESSAGES)

        self.assertEqual(expected_result, result)

    def test_process_messages_missing_body(self):
        messages = copy.deepcopy(MESSAGES)
        del messages[0]["Body"]
        expected_handles = [messages[0]["ReceiptHandle"]]

        expected_result = repo_scan.PROCESSED_MESSAGES([], expected_handles)

        result = repo_scan.process_messages(messages)

        self.assertEqual(expected_result, result)

    def test_process_messages_missing_handle(self):
        messages = copy.deepcopy(MESSAGES)
        del messages[0]["ReceiptHandle"]
        expected_repos = [json.loads(messages[0]["Body"])]

        expected_result = repo_scan.PROCESSED_MESSAGES(expected_repos, [])

        result = repo_scan.process_messages(messages)

        self.assertEqual(expected_result, result)

    @patch.object(repo_scan, "batch_update_db")
    @patch.object(repo_scan, "send_analyzer_request")
    def test_submit_repos_success(self, mock_request_fun, mock_db_fun):
        self.maxDiff = None
        self.assertEqual(repo_scan.send_analyzer_request, mock_request_fun)
        self.assertEqual(repo_scan.batch_update_db, mock_db_fun)
        mock_request_fun.side_effect = (
            RESPONSE_TUPLE(200, json.dumps(ANALYZER_RESPONSE_TEXT_GITHUB_ESLINT_AND_GRAPHITE)),
            RESPONSE_TUPLE(200, json.dumps(ANALYZER_RESPONSE_TEXT_BITBUCKET)),
        )

        expected_result = [ANALYZER_QUEUED_RESULT_GITHUB_ESLINT_AND_GRAPHITE[0], ANALYZER_QUEUED_RESULT_BITBUCKET[0]]

        result = repo_scan.submit_repos(POLLED_REPOS, "url", "api_key")

        self.assertEqual(expected_result, result)

    def test_construct_repo_requests_one_service(self):
        self.maxDiff = None
        expected_result = {"reqs": GITHUB_CONSTRUCTED_REQUEST, "req_lookup": self.github_lookup_req}
        result = repo_scan.construct_repo_requests([POLLED_REPOS[0], POLLED_REPOS[3]])
        self.assertDictEqual(expected_result, result)

    def test_construct_repo_requests_two_service(self):
        self.maxDiff = None
        expected_result = {
            "reqs": {**GITHUB_CONSTRUCTED_REQUEST, **BITBUCKET_CONSTRUCTED_REQUEST},
            "req_lookup": {**self.bitbucket_lookup_req, **self.github_lookup_req},
        }

        result = repo_scan.construct_repo_requests(POLLED_REPOS)

        self.assertEqual(expected_result, result)

    def test_validate_repo_pass(self):
        result = repo_scan.validate_repo(POLLED_REPOS[0])

        self.assertTrue(result)

    def test_validate_repo_none(self):
        result = repo_scan.validate_repo(None)

        self.assertFalse(result)

    def test_validate_repo_no_repo(self):
        result = repo_scan.validate_repo(POLLED_REPOS[1])

        self.assertFalse(result)

    def test_validate_repo_no_org(self):
        result = repo_scan.validate_repo(POLLED_REPOS[2])

        self.assertFalse(result)

    def test_handle_request_response_response_text_empty(self):
        response_text = "response_text"
        expected_result = f"HTTP {RESPONSE_CODE_FAIL}: " + response_text

        result = repo_scan.handle_error_response(RESPONSE_CODE_FAIL, response_text)

        self.assertEqual(expected_result, result)

    def test_handle_request_response_response_text_with_message(self):
        response_text = FAIL_RESPONSE_WITH_MESSAGE
        expected_result = f"HTTP {RESPONSE_CODE_FAIL}: " + FAIL_RESPONSE_WITH_MESSAGE["message"]

        result = repo_scan.handle_error_response(RESPONSE_CODE_FAIL, json.dumps(response_text))

        self.assertEqual(expected_result, result)

    def test_handle_request_response_response_text_with_failed_list(self):
        response_text = json.dumps(FAIL_RESPONSE_WITH_FAILED_LIST)
        expected_result = f"HTTP {RESPONSE_CODE_FAIL}: {FAIL_RESPONSE_WITH_FAILED_LIST['failed']}"

        result = repo_scan.handle_error_response(RESPONSE_CODE_FAIL, response_text)

        self.assertEqual(expected_result, result)

    def test_handle_request_response_response_text_unauthorized(self):
        response_text = json.dumps(FAIL_RESPONSE_WITH_UNAUTHORIZED)
        expected_result = f"HTTP {RESPONSE_CODE_FAIL}: {FAIL_RESPONSE_WITH_UNAUTHORIZED}"

        result = repo_scan.handle_error_response(RESPONSE_CODE_FAIL, response_text)

        self.assertEqual(expected_result, result)
