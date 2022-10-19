"""
Tests Validators API
"""
import copy
import os
import unittest

from artemisapi.validators import ValidationError
from artemisdb.artemisdb.consts import MAX_REASON_LENGTH
from repo.util.services import get_services_dict
from repo.util.validators import Validator

TEST_DIR = os.path.dirname(os.path.abspath(__file__))

TEST_SECRET_ALLOWLIST = {
    "type": "secret",
    "value": {
        "filename": "mongodb/test_settings2.json",
        "line": 2,
        "commit": "b71ee938d23316822157ae4a8da96872995e2572",
    },
    "expires": "2020-12-01T00:00:00-00:00",
    "reason": "unit test",
}

TEST_VULN_ALLOWLIST = {
    "type": "vulnerability",
    "value": {"component": "test_pkg", "id": "CVE-2021-0000", "source": "package.json"},
    "expires": "2020-12-01T00:00:00-00:00",
    "reason": "unit test",
}

TEST_VULN_ALLOWLIST_WITH_OPT_KEYS = {
    "type": "vulnerability",
    "value": {"component": "test_pkg", "id": "CVE-2021-0000", "source": "package.json", "severity": "high"},
    "expires": "2020-12-01T00:00:00-00:00",
    "reason": "unit test",
}

TEST_VULN_RAW_ALLOWLIST = {
    "type": "vulnerability_raw",
    "value": {"id": "CVE-2021-0000"},
    "expires": "2020-12-01T00:00:00-00:00",
    "reason": "unit test",
}

TEST_VULN_RAW_ALLOWLIST_WITH_OPT_KEYS = {
    "type": "vulnerability_raw",
    "value": {"id": "CVE-2021-0000", "severity": "high"},
    "expires": "2020-12-01T00:00:00-00:00",
    "reason": "unit test",
}

TEST_SECRET_RAW_ALLOWLIST = {
    "type": "secret_raw",
    "value": {"value": "0xDEADBEEF"},
    "expires": "2020-12-01T00:00:00-00:00",
    "reason": "unit test",
}

TEST_STATIC_ANALYSIS_ALLOWLIST = {
    "type": "static_analysis",
    "value": {"filename": "mongodb/test_settings2.json", "line": 2, "type": "E0001"},
    "expires": "2020-12-01T00:00:00-00:00",
    "reason": "unit test",
}

TEST_STATIC_ANALYSIS_ALLOWLIST_WITH_OPT_KEYS = {
    "type": "static_analysis",
    "value": {"filename": "mongodb/test_settings2.json", "line": 2, "type": "E0001", "severity": "high"},
    "expires": "2020-12-01T00:00:00-00:00",
    "reason": "unit test",
}


class TestValidators(unittest.TestCase):
    def setUp(self) -> None:
        services_loc = os.path.join(TEST_DIR, "data", "services.json")
        services_dict = get_services_dict(services_loc)
        self.validator = Validator(services_dict.get("services"), services_dict.get("repos"))

    def test_parse_whitelist_body(self):
        wl = copy.deepcopy(TEST_SECRET_ALLOWLIST)
        self.validator.validate_request_body([wl], None, self.validator._validate_whitelist_item)

    def test_validate_max_page_size_exceeded_raises_error(self):
        event = {
            "service_id": "github",
            "repo_id": "testorg/testrepo",
            "resource": "history",
            "resource_id": None,
            "query_params": {"page_size": ["1000"]},
            "body": None,
        }

        with self.assertRaises(ValidationError):
            self.validator.validate_request_history_query(event)

    def test_multiple_max_page_size_raises_error(self):
        event = {
            "service_id": "github",
            "repo_id": "testorg/testrepo",
            "resource": "history",
            "resource_id": None,
            "query_params": {"page_size": ["1000", "2000"]},
            "body": None,
        }

        with self.assertRaises(ValidationError):
            self.validator.validate_request_history_query(event)

    def test_validate_page_size_greater_than_zero(self):
        event = {
            "service_id": "github",
            "repo_id": "testorg/testrepo",
            "resource": "history",
            "resource_id": None,
            "query_params": {"page_size": ["0"]},
            "body": None,
        }

        with self.assertRaises(ValidationError):
            self.validator.validate_request_history_query(event)

    def test_validate_history_params(self):
        event = {
            "service_id": "github",
            "repo_id": "testorg/testrepo",
            "resource": "history",
            "resource_id": None,
            "query_params": {"page_size": ["10"], "foo": ["bar"]},
            "body": None,
        }

        with self.assertRaises(ValidationError):
            self.validator.validate_request_history_query(event)

    def test_validate_invalid_last_scan_id_raises_error(self):
        event = {
            "service_id": "github",
            "repo_id": "testorg/testrepo",
            "resource": "history",
            "resource_id": None,
            "query_params": {"last_scan_id": ["bogus"]},
            "body": None,
        }

        with self.assertRaises(ValidationError):
            self.validator.validate_request_history_query(event)

    def test_multiple_last_scan_id_raises_error(self):
        event = {
            "service_id": "github",
            "repo_id": "testorg/testrepo",
            "resource": "history",
            "resource_id": None,
            "query_params": {"last_scan_id": ["foo", "bar"]},
            "body": None,
        }

        with self.assertRaises(ValidationError):
            self.validator.validate_request_history_query(event)

    def test_include_batch_no_value(self):
        event = {
            "service_id": "github",
            "repo_id": "testorg/testrepo",
            "resource": "history",
            "resource_id": None,
            "query_params": {"include_batch": [""]},
            "body": None,
        }

        self.validator.validate_request_history_query(event)
        self.assertTrue(event["query_params"]["include_batch"])

    def test_include_batch_true(self):
        event = {
            "service_id": "github",
            "repo_id": "testorg/testrepo",
            "resource": "history",
            "resource_id": None,
            "query_params": {"include_batch": ["True"]},
            "body": None,
        }

        self.validator.validate_request_history_query(event)
        self.assertTrue(event["query_params"]["include_batch"])

    def test_include_batch_false(self):
        event = {
            "service_id": "github",
            "repo_id": "testorg/testrepo",
            "resource": "history",
            "resource_id": None,
            "query_params": {"include_batch": ["False"]},
            "body": None,
        }

        self.validator.validate_request_history_query(event)
        self.assertFalse(event["query_params"]["include_batch"])

    def test_include_batch_invalid_raises_error(self):
        event = {
            "service_id": "github",
            "repo_id": "testorg/testrepo",
            "resource": "history",
            "resource_id": None,
            "query_params": {"include_batch": ["foo"]},
            "body": None,
        }

        with self.assertRaises(ValidationError):
            self.validator.validate_request_history_query(event)

    def test_multiple_include_batch_raises_error(self):
        event = {
            "service_id": "github",
            "repo_id": "testorg/testrepo",
            "resource": "history",
            "resource_id": None,
            "query_params": {"include_batch": ["foo", "bar"]},
            "body": None,
        }

        with self.assertRaises(ValidationError):
            self.validator.validate_request_history_query(event)

    ###########################################################################
    # Validation tests for history include_diff parameter
    ###########################################################################

    def test_include_diff_no_value(self):
        event = {
            "service_id": "github",
            "repo_id": "testorg/testrepo",
            "resource": "history",
            "resource_id": None,
            "query_params": {"include_diff": [""]},
            "body": None,
        }

        self.validator.validate_request_history_query(event)
        self.assertTrue(event["query_params"]["include_diff"])

    def test_include_diff_true(self):
        event = {
            "service_id": "github",
            "repo_id": "testorg/testrepo",
            "resource": "history",
            "resource_id": None,
            "query_params": {"include_diff": ["True"]},
            "body": None,
        }

        self.validator.validate_request_history_query(event)
        self.assertTrue(event["query_params"]["include_diff"])

    def test_include_diff_false(self):
        event = {
            "service_id": "github",
            "repo_id": "testorg/testrepo",
            "resource": "history",
            "resource_id": None,
            "query_params": {"include_diff": ["False"]},
            "body": None,
        }

        self.validator.validate_request_history_query(event)
        self.assertFalse(event["query_params"]["include_diff"])

    def test_include_diff_invalid_raises_error(self):
        event = {
            "service_id": "github",
            "repo_id": "testorg/testrepo",
            "resource": "history",
            "resource_id": None,
            "query_params": {"include_diff": ["foo"]},
            "body": None,
        }

        with self.assertRaises(ValidationError):
            self.validator.validate_request_history_query(event)

    def test_multiple_include_diff_raises_error(self):
        event = {
            "service_id": "github",
            "repo_id": "testorg/testrepo",
            "resource": "history",
            "resource_id": None,
            "query_params": {"include_diff": ["True", "False"]},
            "body": None,
        }

        with self.assertRaises(ValidationError):
            self.validator.validate_request_history_query(event)

    ###########################################################################

    def test_validate_whitelist_reason_missing(self):
        wl = copy.deepcopy(TEST_SECRET_ALLOWLIST)
        del wl["reason"]

        with self.assertRaises(ValidationError):
            self.validator.validate_request_body([wl], None, self.validator._validate_whitelist_item)

    def test_validate_whitelist_reason_empty(self):
        wl = copy.deepcopy(TEST_SECRET_ALLOWLIST)
        wl["reason"] = ""

        with self.assertRaises(ValidationError):
            self.validator.validate_request_body([wl], None, self.validator._validate_whitelist_item)

    def test_validate_whitelist_reason_long(self):
        wl = copy.deepcopy(TEST_SECRET_ALLOWLIST)
        wl["reason"] = "a" + ("a" * MAX_REASON_LENGTH)  # Max length + 1

        with self.assertRaises(ValidationError):
            self.validator.validate_request_body([wl], None, self.validator._validate_whitelist_item)

    def test_validate_whitelist_expires_invalid(self):
        wl = copy.deepcopy(TEST_SECRET_ALLOWLIST)
        wl["expires"] = "foobar"

        with self.assertRaises(ValidationError):
            self.validator.validate_request_body([wl], None, self.validator._validate_whitelist_item)

    def test_validate_whitelist_expires_null(self):
        wl = copy.deepcopy(TEST_SECRET_ALLOWLIST)
        wl["expires"] = None
        self.validator.validate_request_body([wl], None, self.validator._validate_whitelist_item)

    def test_validate_whitelist_expires_zulu(self):
        wl = copy.deepcopy(TEST_SECRET_ALLOWLIST)
        wl["expires"] = "2020-12-01T00:00:00Z"
        self.validator.validate_request_body([wl], None, self.validator._validate_whitelist_item)

    def test_validate_allowlist_values_valid_types(self):
        test_cases = [
            TEST_SECRET_ALLOWLIST,
            TEST_SECRET_RAW_ALLOWLIST,
            TEST_VULN_ALLOWLIST,
            TEST_VULN_ALLOWLIST_WITH_OPT_KEYS,
            TEST_VULN_RAW_ALLOWLIST,
            TEST_VULN_RAW_ALLOWLIST_WITH_OPT_KEYS,
            TEST_STATIC_ANALYSIS_ALLOWLIST,
            TEST_STATIC_ANALYSIS_ALLOWLIST_WITH_OPT_KEYS,
        ]
        for test_case in test_cases:
            with self.subTest(test_case=test_case):
                self.validator.validate_request_body([test_case], None, self.validator._validate_whitelist_item)

    def test_validate_secret_allowlist_values_invalid_types(self):
        al1 = copy.deepcopy(TEST_SECRET_ALLOWLIST)
        al1["value"]["filename"] = 1  # Not a string

        al2 = copy.deepcopy(TEST_SECRET_ALLOWLIST)
        al2["value"]["line"] = "1"  # Not an int

        al3 = copy.deepcopy(TEST_SECRET_ALLOWLIST)
        al3["value"]["commit"] = 1  # Not a string

        test_cases = [al1, al2, al3]
        for test_case in test_cases:
            with self.subTest(test_case=test_case):
                with self.assertRaises(ValidationError):
                    self.validator.validate_request_body([test_case], None, self.validator._validate_whitelist_item)

    def test_validate_secret_raw_allowlist_values_invalid_types(self):
        al1 = copy.deepcopy(TEST_SECRET_RAW_ALLOWLIST)
        al1["value"]["value"] = 1  # Not a string

        test_cases = [al1]
        for test_case in test_cases:
            with self.subTest(test_case=test_case):
                with self.assertRaises(ValidationError):
                    self.validator.validate_request_body([test_case], None, self.validator._validate_whitelist_item)

    def test_validate_vuln_allowlist_values_invalid_types(self):
        al1 = copy.deepcopy(TEST_VULN_ALLOWLIST)
        al1["value"]["component"] = 1  # Not a string

        al2 = copy.deepcopy(TEST_VULN_ALLOWLIST)
        al2["value"]["id"] = 1  # Not a string

        al3 = copy.deepcopy(TEST_VULN_ALLOWLIST)
        al3["value"]["source"] = []  # Not a string

        test_cases = [al1, al2, al3]
        for test_case in test_cases:
            with self.subTest(test_case=test_case):
                with self.assertRaises(ValidationError):
                    self.validator.validate_request_body([test_case], None, self.validator._validate_whitelist_item)

    def test_validate_vuln_raw_allowlist_values_invalid_types(self):
        al1 = copy.deepcopy(TEST_VULN_RAW_ALLOWLIST)
        al1["value"]["id"] = 1  # Not a string

        test_cases = [al1]
        for test_case in test_cases:
            with self.subTest(test_case=test_case):
                with self.assertRaises(ValidationError):
                    self.validator.validate_request_body([test_case], None, self.validator._validate_whitelist_item)

    def test_validate_static_analysis_allowlist_values_invalid_types(self):
        al1 = copy.deepcopy(TEST_STATIC_ANALYSIS_ALLOWLIST)
        al1["value"]["filename"] = 1  # Not a string

        al2 = copy.deepcopy(TEST_STATIC_ANALYSIS_ALLOWLIST)
        al2["value"]["line"] = "1"  # Not an int

        al3 = copy.deepcopy(TEST_STATIC_ANALYSIS_ALLOWLIST)
        al3["value"]["type"] = 1  # Not a string

        test_cases = [al1, al2, al3]
        for test_case in test_cases:
            with self.subTest(test_case=test_case):
                with self.assertRaises(ValidationError):
                    self.validator.validate_request_body([test_case], None, self.validator._validate_whitelist_item)

    def test_validate_filter_diff_valid(self):
        base_event = {
            "service_id": "service",
            "repo_id": "org/repo",
            "resource_id": "877d2023-4a44-4d01-84ec-e80bedaf7f3d",
            "query_params": {},
            "body": None,
        }

        # No query params should set filter_diff to true
        no_query_params = [copy.deepcopy(base_event), True]

        # Query params missing filter_diff should set it to true
        no_filter_diff = [copy.deepcopy(base_event), True]
        no_filter_diff[0]["query_params"] = {"format": ["full"]}

        filter_diff_true = [copy.deepcopy(base_event), True]
        filter_diff_true[0]["query_params"] = {"filter_diff": ["true"]}

        filter_diff_false = [copy.deepcopy(base_event), False]
        filter_diff_false[0]["query_params"] = {"filter_diff": ["false"]}

        # Empty filter_diff should set it to true
        filter_diff_empty = [copy.deepcopy(base_event), True]
        filter_diff_empty[0]["query_params"] = {"filter_diff": [""]}

        filter_diff_case_insensitive_true = [copy.deepcopy(base_event), True]
        filter_diff_case_insensitive_true[0]["query_params"] = {"filter_diff": ["tRuE"]}

        filter_diff_case_insensitive_false = [copy.deepcopy(base_event), False]
        filter_diff_case_insensitive_false[0]["query_params"] = {"filter_diff": ["fAlSe"]}

        for test_case in [
            no_query_params,
            no_filter_diff,
            filter_diff_true,
            filter_diff_false,
            filter_diff_empty,
            filter_diff_case_insensitive_true,
            filter_diff_case_insensitive_false,
        ]:
            with self.subTest(test_case=test_case):
                self.validator.validate_request_query(test_case[0])
                self.assertEqual(test_case[0]["query_params"]["filter_diff"], test_case[1])

    def test_validate_filter_diff_invalid(self):
        base_event = {
            "service_id": "service",
            "repo_id": "org/repo",
            "resource_id": "877d2023-4a44-4d01-84ec-e80bedaf7f3d",
            "query_params": {},
            "body": None,
        }
        filter_diff_invalid_str = copy.deepcopy(base_event)
        filter_diff_invalid_str["query_params"] = {"filter_diff": ["null"]}

        filter_diff_int = copy.deepcopy(base_event)
        filter_diff_int["query_params"] = {"filter_diff": [1]}

        filter_diff_multiple = copy.deepcopy(base_event)
        filter_diff_multiple["query_params"] = {"filter_diff": ["true", "true"]}

        for test_case in [filter_diff_invalid_str, filter_diff_int, filter_diff_multiple]:
            with self.subTest(test_case=test_case):
                with self.assertRaises(ValidationError):
                    self.validator.validate_request_query(test_case)

    def test_path_validators(self):
        test_cases = ["./foo", "/foo", "../foo", "foo/../../../bar", "A" * 4097, "foo\0bar", "$FOOBAR"]
        for test_case in test_cases:
            with self.subTest(test_case=test_case):
                with self.assertRaises(ValidationError):
                    self.validator._validate_paths([test_case], "test")


if __name__ == "__main__":
    unittest.main()
