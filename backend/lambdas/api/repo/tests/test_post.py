import os
import unittest
from http import HTTPStatus
from unittest.mock import patch

from artemisapi.response import response
from repo import post
from repo.util.const import PROCESS_RESPONSE_TUPLE
from repo.util.parse_event import EventParser

TEST_DIR = os.path.dirname(os.path.abspath(__file__))

GITHUB_EVENT = {"repo_id": "testorg/testrepo", "service_id": "github"}

TEST_SERVICES_LOC = os.path.join(TEST_DIR, "data", "services.json")


class TestPost(unittest.TestCase):
    @patch.object(post, "process_github")
    def test_post_repo_github_200_status(self, process_mock):
        queued = ["github/testorg"]
        status = HTTPStatus.OK
        self.assertEqual(post.process_github, process_mock)
        process_mock.return_value = PROCESS_RESPONSE_TUPLE(queued, [], [])

        expected_result = response({"queued": queued, "failed": []}, status)

        event_parser = EventParser(GITHUB_EVENT, services_loc=TEST_SERVICES_LOC)
        event_parser.parsed_event = GITHUB_EVENT
        result = post.post_repo(event_parser)

        self.assertEqual(expected_result, result)

    @patch.object(post, "process_github")
    def test_post_repo_github_207_status_failed(self, process_mock):
        queued = ["github/testorg"]
        failed = ["github/testorg2"]
        status = HTTPStatus.MULTI_STATUS
        self.assertEqual(post.process_github, process_mock)
        process_mock.return_value = PROCESS_RESPONSE_TUPLE(queued, failed, [])

        expected_result = response({"queued": queued, "failed": failed}, status)

        event_parser = EventParser(GITHUB_EVENT, services_loc=TEST_SERVICES_LOC)
        event_parser.parsed_event = GITHUB_EVENT
        result = post.post_repo(event_parser)

        self.assertEqual(expected_result, result)

    @patch.object(post, "process_github")
    def test_post_repo_github_207_status_unauthorized(self, process_mock):
        queued = ["github/testorg"]
        unauthorized = ["github/testorg2"]
        status = HTTPStatus.MULTI_STATUS
        self.assertEqual(post.process_github, process_mock)
        process_mock.return_value = PROCESS_RESPONSE_TUPLE(queued, [], unauthorized)

        expected_result = response({"queued": queued, "failed": unauthorized}, status)

        event_parser = EventParser(GITHUB_EVENT, services_loc=TEST_SERVICES_LOC)
        event_parser.parsed_event = GITHUB_EVENT
        result = post.post_repo(event_parser)

        self.assertEqual(expected_result, result)

    @patch.object(post, "process_github")
    def test_post_repo_github_400_status(self, process_mock):
        failed = ["github/testorg2"]
        status = HTTPStatus.BAD_REQUEST
        self.assertEqual(post.process_github, process_mock)
        process_mock.return_value = PROCESS_RESPONSE_TUPLE([], failed, [])

        expected_result = response({"queued": [], "failed": failed}, status)

        event_parser = EventParser(GITHUB_EVENT, services_loc=TEST_SERVICES_LOC)
        event_parser.parsed_event = GITHUB_EVENT
        result = post.post_repo(event_parser)

        self.assertEqual(expected_result, result)

    @patch.object(post, "process_github")
    def test_post_repo_github_401_status_unauthorized(self, process_mock):
        unauthorized = ["github/testorg2"]
        status = HTTPStatus.UNAUTHORIZED
        self.assertEqual(post.process_github, process_mock)
        process_mock.return_value = PROCESS_RESPONSE_TUPLE([], [], unauthorized)

        expected_result = response({"queued": [], "failed": unauthorized}, status)

        event_parser = EventParser(GITHUB_EVENT, services_loc=TEST_SERVICES_LOC)
        event_parser.parsed_event = GITHUB_EVENT
        result = post.post_repo(event_parser)

        self.assertEqual(expected_result, result)

    @patch.object(post, "process_github")
    def test_post_repo_github_501_status_unauthorized(self, process_mock):
        status = HTTPStatus.NOT_IMPLEMENTED
        self.assertEqual(post.process_github, process_mock)
        process_mock.return_value = PROCESS_RESPONSE_TUPLE([], [], [])

        expected_result = response({"queued": [], "failed": []}, status)

        event_parser = EventParser(GITHUB_EVENT, services_loc=TEST_SERVICES_LOC)
        event_parser.parsed_event = GITHUB_EVENT
        result = post.post_repo(event_parser)

        self.assertEqual(expected_result, result)
