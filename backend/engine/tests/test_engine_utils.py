import os
import unittest

from engine.utils.plugin import is_plugin_disabled, match_nonallowlisted_raw_secrets
from utils.services import _get_services_from_file

TEST_DIR = os.path.dirname(os.path.abspath(__file__))
SERVICES_FILE = os.path.join(TEST_DIR, "data", "services.json")

EXPECTED_KEYS = [
    "allow_all",
    "api_key_add",
    "app_integration",
    "application_metadata",
    "batch_queries",
    "branch_url",
    "diff_url",
    "hostname",
    "http_basic_auth",
    "initial_page",
    "nat_connect",
    "secret_loc",
    "secrets_management",
    "type",
    "url",
    "use_deploy_key",
]


class TestEngineUtils(unittest.TestCase):
    def setUp(self):
        svcs = _get_services_from_file(SERVICES_FILE)
        if svcs is None:
            raise Exception("Failed to load services for test case")
        self.services_dict = svcs.get("services")

    def test_validate_services_types(self):
        for service, details in self.services_dict.items():
            print(service)
            keys = list(details.keys())
            keys.sort()
            self.assertEqual(EXPECTED_KEYS, keys)

    def test_plugin_disabled(self):
        # Set the ENV VARs for the test
        os.environ["TEST_VAR_TRUE"] = "1"
        os.environ["TEST_VAR_FALSE"] = "0"

        test_cases = [
            # Test case format: (settings_dict, expected_bool)
            ({"enabled": True}, False),
            ({"enabled": False}, True),
            ({"enabled": "$TEST_VAR_TRUE"}, False),
            ({"enabled": "$TEST_VAR_FALSE"}, True),
            ({"enabled": 1}, True),
            ({"enabled": "string"}, True),
            ({"enabled": "INVALID"}, True),
            ({"enabled": "$TEST_VAR_NOT_SET"}, False),
            ({}, False),
        ]

        for test_case in test_cases:
            with self.subTest(test_case=test_case):
                actual = is_plugin_disabled(test_case[0])
                self.assertEqual(actual, test_case[1])

    def test_match_nonallowlisted_raw_secrets(self):
        allowlist = ["foobar"]

        test_cases = [
            # Test case format: (matches, expected)
            ("foobar", []),  # Exact match
            ("foo", ["foo"]),  # AL is superstring, no match
            ("foobarbaz", []),  # AL is substring
            ("unrelated", ["unrelated"]),  # Zero overlap
            (["foobar", "foobarbaz", "foo"], ["foo"]),  # 2 matches in list
            (["foo"], ["foo"]),  # Same as above but in list
            (["unrelated"], ["unrelated"]),  # Same as above but in list
        ]

        for test_case in test_cases:
            with self.subTest(test_case=test_case):
                actual = match_nonallowlisted_raw_secrets(allowlist, test_case[0])
            self.assertEqual(actual, test_case[1])
