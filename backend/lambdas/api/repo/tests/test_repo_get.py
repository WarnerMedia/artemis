import copy
import json
import unittest
from datetime import datetime, timezone
from unittest.mock import patch
from uuid import UUID

from django.core.exceptions import ValidationError

from artemisdb.artemisdb.models import Repo, Scan
from repo import get

TEST_EVENT = {
    "service_id": "github",
    "repo_id": "testorg/testrepo",
    "scan_id": None,
    "resource": "history",
    "resource_id": None,
    "query_params": {},
    "body": None,
}

TEST_EVENT_INCLUDE_BATCH = copy.deepcopy(TEST_EVENT)
TEST_EVENT_INCLUDE_BATCH["query_params"] = {"include_batch": True}

TEST_EVENT_INCLUDE_DIFF = copy.deepcopy(TEST_EVENT)
TEST_EVENT_INCLUDE_DIFF["query_params"] = {"include_diff": True}

TEST_REPO = Repo(repo="testorg/testrepo", service="github")

TEST_SCANS = [
    Scan(
        repo=TEST_REPO,
        scan_id=UUID("3a9b71fb-6b5c-451b-bc31-f7e61aa52081"),
        ref="dependabot/bundler/ruby/dependency_vulnerability_samples/loofah-2.3.1",
        created=datetime(year=2020, month=1, day=22, hour=21, minute=33, second=43, tzinfo=timezone.utc),
        start_time=datetime(year=2020, month=1, day=22, hour=21, minute=34, second=43, tzinfo=timezone.utc),
        end_time=datetime(year=2020, month=1, day=22, hour=21, minute=35, second=43, tzinfo=timezone.utc),
        status="completed",
        progress={
            "plugin_name": "testplugin",
            "plugin_start_time": "2020-01-22T21:34:43.000000+00:00",
            "current_plugin": 1,
            "total_plugins": 1,
        },
        callback={"url": None, "client_id": None},
    ),
    Scan(
        repo=TEST_REPO,
        scan_id=UUID("b398fa85-a907-4dbe-929b-c08dff8e90de"),
        ref="feature/google",
        created=datetime(year=2020, month=4, day=1, hour=21, minute=40, second=38, tzinfo=timezone.utc),
        start_time=datetime(year=2020, month=4, day=1, hour=21, minute=41, second=38, tzinfo=timezone.utc),
        end_time=datetime(year=2020, month=4, day=1, hour=21, minute=42, second=38, tzinfo=timezone.utc),
        status="completed",
        progress={
            "plugin_name": "testplugin",
            "plugin_start_time": "2020-01-22T21:34:43.000000+00:00",
            "current_plugin": 1,
            "total_plugins": 1,
        },
        callback={"url": None, "client_id": None},
    ),
]

TEST_SCANS_INCLUDE_BATCH = copy.deepcopy(TEST_SCANS)
TEST_SCANS_INCLUDE_BATCH.append(
    Scan(
        repo=TEST_REPO,
        scan_id=UUID("a9eb81cd-412c-4856-a5ea-91a2df76d601"),
        ref="feature/google",
        created=datetime(year=2020, month=4, day=1, hour=21, minute=40, second=38, tzinfo=timezone.utc),
        start_time=datetime(year=2020, month=4, day=1, hour=21, minute=41, second=38, tzinfo=timezone.utc),
        end_time=datetime(year=2020, month=4, day=1, hour=21, minute=42, second=38, tzinfo=timezone.utc),
        status="completed",
        progress={
            "plugin_name": "testplugin",
            "plugin_start_time": "2020-01-22T21:34:43.000000+00:00",
            "current_plugin": 1,
            "total_plugins": 1,
        },
        callback={"url": None, "client_id": None},
        batch_priority=True,
    ),
)

TEST_SCANS_INCLUDE_DIFF = copy.deepcopy(TEST_SCANS)
TEST_SCANS_INCLUDE_DIFF.append(
    Scan(
        repo=TEST_REPO,
        scan_id=UUID("a9eb81cd-412c-4856-a5ea-91a2df76d601"),
        ref="feature/google",
        created=datetime(year=2020, month=4, day=1, hour=21, minute=40, second=38, tzinfo=timezone.utc),
        start_time=datetime(year=2020, month=4, day=1, hour=21, minute=41, second=38, tzinfo=timezone.utc),
        end_time=datetime(year=2020, month=4, day=1, hour=21, minute=42, second=38, tzinfo=timezone.utc),
        status="completed",
        progress={
            "plugin_name": "testplugin",
            "plugin_start_time": "2020-01-22T21:34:43.000000+00:00",
            "current_plugin": 1,
            "total_plugins": 1,
        },
        callback={"url": None, "client_id": None},
        batch_priority=False,
        diff_base="deadbeef",
        diff_compare="1234abcd",
    ),
)


TEST_RESULT = {
    "results": [
        {
            "repo": "testorg/testrepo/3a9b71fb-6b5c-451b-bc31-f7e61aa52081",
            "service": "github",
            "branch": "dependabot/bundler/ruby/dependency_vulnerability_samples/loofah-2.3.1",
            "timestamps": {
                "queued": "2020-01-22T21:33:43.000000+00:00",
                "start": "2020-01-22T21:34:43.000000+00:00",
                "end": "2020-01-22T21:35:43.000000+00:00",
            },
            "initiated_by": None,
            "status": "completed",
            "status_detail": {
                "plugin_name": "testplugin",
                "plugin_start_time": "2020-01-22T21:34:43.000000+00:00",
                "current_plugin": 1,
                "total_plugins": 1,
            },
            "scan_options": {
                "categories": [],
                "plugins": [],
                "depth": None,
                "include_dev": False,
                "callback": {"url": None, "client_id": None},
                "batch_priority": False,
                "diff_compare": None,
            },
            "qualified": False,
            "batch_id": None,
        },
        {
            "repo": "testorg/testrepo/b398fa85-a907-4dbe-929b-c08dff8e90de",
            "service": "github",
            "branch": "feature/google",
            "timestamps": {
                "queued": "2020-04-01T21:40:38.000000+00:00",
                "start": "2020-04-01T21:41:38.000000+00:00",
                "end": "2020-04-01T21:42:38.000000+00:00",
            },
            "initiated_by": None,
            "status": "completed",
            "status_detail": {
                "plugin_name": "testplugin",
                "plugin_start_time": "2020-01-22T21:34:43.000000+00:00",
                "current_plugin": 1,
                "total_plugins": 1,
            },
            "scan_options": {
                "categories": [],
                "plugins": [],
                "depth": None,
                "include_dev": False,
                "callback": {"url": None, "client_id": None},
                "batch_priority": False,
                "diff_compare": None,
            },
            "qualified": False,
            "batch_id": None,
        },
    ],
    "count": 2,
    "next": None,
    "previous": None,
}

TEST_RESULT_INCLUDE_BATCH = copy.deepcopy(TEST_RESULT)
TEST_RESULT_INCLUDE_BATCH["results"].append(
    {
        "repo": "testorg/testrepo/a9eb81cd-412c-4856-a5ea-91a2df76d601",
        "service": "github",
        "branch": "feature/google",
        "timestamps": {
            "queued": "2020-04-01T21:40:38.000000+00:00",
            "start": "2020-04-01T21:41:38.000000+00:00",
            "end": "2020-04-01T21:42:38.000000+00:00",
        },
        "initiated_by": None,
        "status": "completed",
        "status_detail": {
            "plugin_name": "testplugin",
            "plugin_start_time": "2020-01-22T21:34:43.000000+00:00",
            "current_plugin": 1,
            "total_plugins": 1,
        },
        "scan_options": {
            "categories": [],
            "plugins": [],
            "depth": None,
            "include_dev": False,
            "callback": {"url": None, "client_id": None},
            "batch_priority": True,
            "diff_compare": None,
        },
        "qualified": False,
        "batch_id": None,
    }
)
TEST_RESULT_INCLUDE_BATCH["count"] = 3

TEST_RESULT_INCLUDE_DIFF = copy.deepcopy(TEST_RESULT_INCLUDE_BATCH)
TEST_RESULT_INCLUDE_DIFF["results"][-1]["scan_options"]["batch_priority"] = False
TEST_RESULT_INCLUDE_DIFF["results"][-1]["scan_options"]["diff_compare"] = "1234abcd"

TEST_NO_RESULT = {"results": [], "count": 0, "next": None, "previous": None}


class TestGet(unittest.TestCase):
    @patch.object(get, "Repo")
    def test_get_repo_history_success(self, mock_repo):
        self.assertEqual(get.Repo, mock_repo)
        mock_repo.objects.get(repo="testorg/testrepo", service="github").scan_set.order_by("-created").filter(
            batch_priority=False
        ).filter(diff_compare=None).__getitem__.return_value = TEST_SCANS
        mock_repo.objects.get(repo="testorg/testrepo", service="github").scan_set.order_by("-created").filter(
            batch_priority=False
        ).filter(diff_compare=None).count.return_value = len(TEST_SCANS)

        result = get.get_repo_history(TEST_EVENT)

        self.assertEqual(200, result.get("statusCode"))
        self.assertEqual(TEST_RESULT["results"], json.loads(result["body"])["results"])

    @patch.object(get, "Repo")
    def test_get_repo_history_response_no_history(self, mock_repo):
        self.assertEqual(get.Repo, mock_repo)
        mock_repo.objects.get(repo="testorg/testrepo", service="github").scan_set.order_by("-created").filter(
            batch_priority=False
        ).filter(diff_compare=None).__getitem__.return_value = []
        mock_repo.objects.get(repo="testorg/testrepo", service="github").scan_set.order_by("-created").filter(
            batch_priority=False
        ).filter(diff_compare=None).count.return_value = 0

        result = get.get_repo_history(TEST_EVENT)

        self.assertEqual(200, result.get("statusCode"))
        self.assertEqual(TEST_NO_RESULT, json.loads(result["body"]))

    @patch.object(get, "Repo")
    def test_get_repo_history_response_no_repo(self, mock_repo):
        self.assertEqual(get.Repo, mock_repo)
        mock_repo.DoesNotExist = Repo.DoesNotExist
        mock_repo.objects.get(repo="testorg/testrepo", service="github").scan_set.order_by("-created").filter(
            batch_priority=False
        ).filter(diff_compare=None).__getitem__.side_effect = Repo.DoesNotExist()

        result = get.get_repo_history(TEST_EVENT)

        self.assertEqual(404, result.get("statusCode"))

    @patch.object(get, "Repo")
    def test_get_repo_history_include_batch(self, mock_repo):
        self.assertEqual(get.Repo, mock_repo)
        mock_repo.objects.get(repo="testorg/testrepo", service="github").scan_set.order_by("-created").filter(
            diff_compare=None
        ).__getitem__.return_value = TEST_SCANS_INCLUDE_BATCH
        mock_repo.objects.get(repo="testorg/testrepo", service="github").scan_set.order_by("-created").filter(
            diff_compare=None
        ).count.return_value = len(TEST_SCANS_INCLUDE_BATCH)

        result = get.get_repo_history(TEST_EVENT_INCLUDE_BATCH)

        self.assertEqual(200, result.get("statusCode"))
        self.assertEqual(TEST_RESULT_INCLUDE_BATCH["results"], json.loads(result["body"])["results"])

    @patch.object(get, "Repo")
    def test_get_repo_history_include_diff(self, mock_repo):
        self.assertEqual(get.Repo, mock_repo)
        mock_repo.objects.get(repo="testorg/testrepo", service="github").scan_set.order_by("-created").filter(
            batch_priority=False
        ).__getitem__.return_value = TEST_SCANS_INCLUDE_DIFF
        mock_repo.objects.get(repo="testorg/testrepo", service="github").scan_set.order_by("-created").filter(
            batch_priority=False
        ).count.return_value = len(TEST_SCANS_INCLUDE_DIFF)

        result = get.get_repo_history(TEST_EVENT_INCLUDE_DIFF)

        self.assertEqual(200, result.get("statusCode"))
        self.assertEqual(TEST_RESULT_INCLUDE_DIFF["results"], json.loads(result["body"])["results"])

    @patch.object(get, "Repo")
    def test_get_whitelist_item_id_validation_error(self, mock_repo):
        test_item_id = "123"
        self.assertEqual(get.Repo, mock_repo)
        mock_repo.objects.get(
            repo=TEST_EVENT["repo_id"], service=TEST_EVENT["service_id"]
        ).allowlistitem_set.filter.side_effect = ValidationError(message="")
        mock_repo.DoesNotExist = Repo.DoesNotExist

        result = get.get_whitelist(TEST_EVENT["repo_id"], TEST_EVENT["service_id"], item_id=test_item_id)

        self.assertEqual([], result)

    @patch.object(get, "Repo")
    def test_get_whitelist_item_type_validation_error(self, mock_repo):
        test_item_type = "secret"
        self.assertEqual(get.Repo, mock_repo)
        mock_repo.objects.get(
            repo=TEST_EVENT["repo_id"], service=TEST_EVENT["service_id"]
        ).allowlistitem_set.filter.side_effect = ValidationError(message="")
        mock_repo.DoesNotExist = Repo.DoesNotExist

        result = get.get_whitelist(TEST_EVENT["repo_id"], TEST_EVENT["service_id"], item_type=test_item_type)

        self.assertEqual([], result)
