import os
import unittest

from repo.util.parse_event import EventParser

TEST_DIR = os.path.dirname(os.path.abspath(__file__))


class TestParseId(unittest.TestCase):
    def setUp(self) -> None:
        self.services_loc = os.path.join(TEST_DIR, "data", "services.json")

    def test_parse_scan_ids(self):
        event_parser = EventParser(None, services_loc=self.services_loc)

        test_cases = [
            (
                "service/org/repo",
                {
                    "service_id": "service",
                    "repo_id": "org/repo",
                    "scan_id": None,
                    "resource": None,
                    "resource_id": None,
                },
            ),
            (
                "service/org/subgroup1/subgroup2/repo",
                {
                    "service_id": "service",
                    "repo_id": "org/subgroup1/subgroup2/repo",
                    "scan_id": None,
                    "resource": None,
                    "resource_id": None,
                },
            ),
            (
                "service/org/repo/04e45956-515a-4e36-9b14-ddcdb1f2906b",
                {
                    "service_id": "service",
                    "repo_id": "org/repo",
                    "scan_id": "04e45956-515a-4e36-9b14-ddcdb1f2906b",
                    "resource": None,
                    "resource_id": None,
                },
            ),
            (
                "service/org/subgroup1/subgroup2/repo/04e45956-515a-4e36-9b14-ddcdb1f2906b",
                {
                    "service_id": "service",
                    "repo_id": "org/subgroup1/subgroup2/repo",
                    "scan_id": "04e45956-515a-4e36-9b14-ddcdb1f2906b",
                    "resource": None,
                    "resource_id": None,
                },
            ),
            (
                "service/org/repo/history",
                {
                    "service_id": "service",
                    "repo_id": "org/repo",
                    "scan_id": None,
                    "resource": "history",
                    "resource_id": None,
                },
            ),
            (
                "service/org/subgroup1/subgroup2/repo/history",
                {
                    "service_id": "service",
                    "repo_id": "org/subgroup1/subgroup2/repo",
                    "scan_id": None,
                    "resource": "history",
                    "resource_id": None,
                },
            ),
            (
                "service/org/repo/whitelist",
                {
                    "service_id": "service",
                    "repo_id": "org/repo",
                    "scan_id": None,
                    "resource": "whitelist",
                    "resource_id": None,
                },
            ),
            (
                "service/org/subgroup1/subgroup2/repo/whitelist",
                {
                    "service_id": "service",
                    "repo_id": "org/subgroup1/subgroup2/repo",
                    "scan_id": None,
                    "resource": "whitelist",
                    "resource_id": None,
                },
            ),
            (
                "service/org/repo/whitelist/04e45956-515a-4e36-9b14-ddcdb1f2906b",
                {
                    "service_id": "service",
                    "repo_id": "org/repo",
                    "scan_id": None,
                    "resource": "whitelist",
                    "resource_id": "04e45956-515a-4e36-9b14-ddcdb1f2906b",
                },
            ),
            (
                "service/org/subgroup1/subgroup2/repo/whitelist/04e45956-515a-4e36-9b14-ddcdb1f2906b",
                {
                    "service_id": "service",
                    "repo_id": "org/subgroup1/subgroup2/repo",
                    "scan_id": None,
                    "resource": "whitelist",
                    "resource_id": "04e45956-515a-4e36-9b14-ddcdb1f2906b",
                },
            ),
            (
                "service/org/repo/04e45956-515a-4e36-9b14-ddcdb1f2906b/report",
                {
                    "service_id": "service",
                    "repo_id": "org/repo",
                    "scan_id": "04e45956-515a-4e36-9b14-ddcdb1f2906b",
                    "resource": "report",
                    "resource_id": None,
                },
            ),
            (
                "service/org/subgroup1/subgroup2/repo/04e45956-515a-4e36-9b14-ddcdb1f2906b/report",
                {
                    "service_id": "service",
                    "repo_id": "org/subgroup1/subgroup2/repo",
                    "scan_id": "04e45956-515a-4e36-9b14-ddcdb1f2906b",
                    "resource": "report",
                    "resource_id": None,
                },
            ),
            (
                "service/org/repo/04e45956-515a-4e36-9b14-ddcdb1f2906b/report/5b923b6a-198d-4a6d-8956-f271bc6980e9",
                {
                    "service_id": "service",
                    "repo_id": "org/repo",
                    "scan_id": "04e45956-515a-4e36-9b14-ddcdb1f2906b",
                    "resource": "report",
                    "resource_id": "5b923b6a-198d-4a6d-8956-f271bc6980e9",
                },
            ),
            (
                (
                    "service/org/subgroup1/subgroup2/repo/04e45956-515a-4e36-9b14-ddcdb1f2906b"
                    "/report/5b923b6a-198d-4a6d-8956-f271bc6980e9"
                ),
                {
                    "service_id": "service",
                    "repo_id": "org/subgroup1/subgroup2/repo",
                    "scan_id": "04e45956-515a-4e36-9b14-ddcdb1f2906b",
                    "resource": "report",
                    "resource_id": "5b923b6a-198d-4a6d-8956-f271bc6980e9",
                },
            ),
        ]
        for test_case in test_cases:
            with self.subTest(test_case=test_case):
                actual = event_parser._parse_id(test_case[0])
                self.assertEqual(actual, test_case[1])
