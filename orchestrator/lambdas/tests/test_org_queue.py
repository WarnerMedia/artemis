# pylint: disable=no-member
import json
import os
import unittest
from unittest.mock import patch

import pytest

from heimdall_utils.get_services import _get_services_from_file
from org_queue import org_queue

TEST_DIR = os.path.dirname(os.path.abspath(__file__))

SERVICES_FILE = os.path.abspath(os.path.join(TEST_DIR, "data", "services.json"))

SERVICES_FILE_INTEGRATION = os.path.abspath(os.path.join(TEST_DIR, "data", "services_integration.json"))

ON_DEMAND_GITHUB_WILDCARD_EVENT = {"body": '{"orgs": ["github/youtube/*"]}'}

ON_DEMAND_GITLAB_WILDCARD_EVENT = {"body": '{"orgs": ["git.example.com/*"]}'}

ON_DEMAND_BITBUCKET_WILDCARD_EVENT = {"body": '{"orgs": ["git.example.com/*"]}'}


ORG_BRANCH_RESULTS = [
    {
        "id": 644,
        "web_url": "https://git.example.com/groups/testorg1",
        "name": "Test Org 1",
        "path": "testorg1",
        "full_name": "Test Org 1",
        "full_path": "testorg1",
        "parent_id": None,
    },
    {
        "id": 94,
        "web_url": "https://git.example.com/groups/testorg2/suborg1/test",
        "name": "Test",
        "path": "test",
        "full_name": "Test Org 2 / Sub Org 1 / Test",
        "full_path": "testorg2/suborg1/test",
        "parent_id": 594,
    },
    {
        "id": 493,
        "web_url": "https://git.example.com/groups/testorg3/foo/bar",
        "name": "Bar",
        "path": "Bar",
        "full_name": "Test Org 3 / Foo / Bar",
        "full_path": "testorg3/foo/bar",
        "parent_id": 573,
    },
    {
        "id": 158,
        "web_url": "https://git.example.com/groups/testorg4",
        "name": "testorg4",
        "path": "testorg4",
        "full_name": "testorg4",
        "full_path": "testorg4",
        "parent_id": None,
    },
]

TEST_BATCH_ID = "4886eea8-ebca-4bcf-bf22-063ca255067c"


class TestOrgQueue(unittest.TestCase):
    def setUp(self) -> None:
        self.full_service_dict = _get_services_from_file(SERVICES_FILE)

    def test_services_exists(self):
        self.assertTrue(os.path.exists(SERVICES_FILE))

    @pytest.mark.integtest
    @patch.object(org_queue, "queue_service_and_org")
    def test_run_private_gitlab_success(self, mock_queue):
        self.assertEqual(org_queue.queue_service_and_org, mock_queue)
        mock_queue.return_value = True
        queued = org_queue.run(event=ON_DEMAND_GITLAB_WILDCARD_EVENT, services_file=SERVICES_FILE_INTEGRATION)
        print(queued)
        self.assertTrue(mock_queue.called)
        self.assertGreaterEqual(len(json.loads(queued["body"])), 12)

    @pytest.mark.integtest
    @patch.object(org_queue, "queue_service_and_org")
    def test_run_private_bitbucket_success(self, mock_queue):
        self.assertEqual(org_queue.queue_service_and_org, mock_queue)
        mock_queue.return_value = True
        queued = org_queue.run(event=ON_DEMAND_BITBUCKET_WILDCARD_EVENT, services_file=SERVICES_FILE_INTEGRATION)
        print(queued)
        self.assertTrue(mock_queue.called)
        self.assertGreaterEqual(len(json.loads(queued["body"])), 6)

    @pytest.mark.integtest
    @patch.object(org_queue, "get_services_dict")
    @patch.object(org_queue, "queue_service_and_org")
    def test_run_public_github_wildcard_not_allowed(self, mock_queue, mock_get_services):
        self.assertEqual(org_queue.queue_service_and_org, mock_queue)
        self.assertEqual(org_queue.get_services_dict, mock_get_services)
        mock_queue.return_value = True
        mock_get_services.return_value = self.full_service_dict

        queued = org_queue.run(event=ON_DEMAND_GITHUB_WILDCARD_EVENT, services_file=SERVICES_FILE_INTEGRATION)

        self.assertTrue("body" not in queued)
        self.assertFalse(mock_queue.called)

    @pytest.mark.integtest
    @patch.object(org_queue, "get_services_dict")
    @patch.object(org_queue, "queue_service_and_org")
    def test_run_public_github_success(self, mock_queue, mock_get_services):
        self.assertEqual(org_queue.queue_service_and_org, mock_queue)
        self.assertEqual(org_queue.get_services_dict, mock_get_services)
        mock_queue.return_value = True
        mock_get_services.return_value = self.full_service_dict

        queued = org_queue.run(event={}, services_file=SERVICES_FILE_INTEGRATION)

        self.assertEqual(4, len([x for x in queued if x.startswith("github/")]))
        self.assertGreaterEqual(1, len([x for x in queued if x.startswith("'git.example.com/")]))
        self.assertTrue(mock_queue.called)

    @patch.object(org_queue, "generate_batch_id")
    @patch.object(org_queue, "queue_service_and_org")
    def test_run_on_demand_returns_formatted_response(self, mock_queue, mock_batch_id):
        mock_queue.return_value = True
        event = {
            "body": json.dumps(
                {
                    "orgs": ["git.example.com/foo_org"],
                    "org_queue": "queue_service_and_org",
                    "plugins": ["secrets"],
                    "default_branch_only": True,
                }
            )
        }

        mock_batch_id.return_value = TEST_BATCH_ID

        queued = org_queue.run(event=event, services_file=SERVICES_FILE)

        expected = {
            "isBase64Encoded": "false",
            "statusCode": 200,
            "headers": {"Content-Type": "application/json"},
            "body": '["git.example.com/foo_org"]',
        }
        self.assertDictEqual(queued, expected)
        mock_queue.assert_called_with(
            "queue_service_and_org",
            "git.example.com",
            "foo_org",
            {"cursor": "null"},
            True,
            ["secrets"],
            TEST_BATCH_ID,
            None,
        )

    @patch.object(org_queue, "generate_batch_id")
    @patch.object(org_queue, "queue_service_and_org")
    def test_run_scheduled_handles_event_contents_correctly(self, mock_queue, mock_batch_id):
        mock_queue.return_value = True
        mock_batch_id.return_value = TEST_BATCH_ID
        event = {
            "version": "0",
            "id": "e088e102-c847-cfd1-7322-b91e101a5d14",
            "detail-type": "Scheduled Event",
            "source": "aws.events",
            "account": "000000000000",
            "time": "2020-07-07T21:30:00Z",
            "region": "us-east-1",
            "resources": ["arn:aws:events:us-east-1:000000000000:rule/heimdall-run-every-week"],
            "detail": {},
        }

        queued = org_queue.run(event=event, services_file=SERVICES_FILE)

        self.assertEqual(self.full_service_dict.get("scan_orgs"), queued)


class MockResponse:
    def __init__(self, total_pages):
        self.headers = {"X-Total-Pages": str(total_pages)}
        self.data = ORG_BRANCH_RESULTS
        self.text = str(self.data)
        self.total_pages = total_pages
        self.items_per_list = int(len(self.data) / self.total_pages)
        if self.items_per_list == 0:
            raise ValueError("Test value for total pages exceeds size of branch results")
        self.current = 0

    def json(self):
        sublist = self.data[self.current : self.current + self.items_per_list]
        self.current += self.items_per_list
        return sublist
