import json
import os
import unittest
from copy import deepcopy

from artemisapi.validators import ValidationError
from repo.util.env import AQUA_ENABLED, VERACODE_ENABLED
from repo.util.identity import Identity
from repo.util.parse_event import EventParser

TEST_DIR = os.path.dirname(os.path.abspath(__file__))

TEST_CATEGORY_LIST = {
    "cat1": {"cat1_plugin1": None, "cat1_plugin2": None, "cat1_plugin3": None},
    "cat2": {"cat2_plugin1": None, "cat2_plugin2": None, "cat2_plugin3": None},
    "cat3": {"cat3_plugin1": None, "cat3_plugin2": None, "cat3_plugin3": None},
    "cat4": {"cat4_plugin1": None},
}

TEST_DEFAULT_DISABLED_CATEGORIES = ["cat4"]

# Requesting just one category causes all of the other categories and their plugins to be negated
TEST_REQUEST_1 = {"categories": ["cat1"]}
EXPECTED_REQUEST_RESULT_1 = {
    "categories": ["cat1", "-cat2", "-cat3", "-cat4"],
    "plugins": [
        "cat1_plugin1",
        "cat1_plugin2",
        "cat1_plugin3",
        "-cat2_plugin1",
        "-cat2_plugin2",
        "-cat2_plugin3",
        "-cat3_plugin1",
        "-cat3_plugin2",
        "-cat3_plugin3",
        "-cat4_plugin1",
    ],
}

# Requesting two categories causes the other category to be negated
TEST_REQUEST_2 = {"categories": ["cat1", "cat2"]}
EXPECTED_REQUEST_RESULT_2 = {
    "categories": ["cat1", "cat2", "-cat3", "-cat4"],
    "plugins": [
        "cat1_plugin1",
        "cat1_plugin2",
        "cat1_plugin3",
        "cat2_plugin1",
        "cat2_plugin2",
        "cat2_plugin3",
        "-cat3_plugin1",
        "-cat3_plugin2",
        "-cat3_plugin3",
        "-cat4_plugin1",
    ],
}

# Requesting a category and another plugin causes the other categories to be negated except for the plugin
TEST_REQUEST_3 = {"categories": ["cat1"], "plugins": ["cat2_plugin1"]}
EXPECTED_REQUEST_RESULT_3 = {
    "categories": ["cat1", "-cat2", "-cat3", "-cat4"],
    "plugins": [
        "cat1_plugin1",
        "cat1_plugin2",
        "cat1_plugin3",
        "cat2_plugin1",
        "-cat2_plugin2",
        "-cat2_plugin3",
        "-cat3_plugin1",
        "-cat3_plugin2",
        "-cat3_plugin3",
        "-cat4_plugin1",
    ],
}

# Requesting a single plugin causes all other plugins to be negated
TEST_REQUEST_4 = {"plugins": ["cat1_plugin1"]}
EXPECTED_REQUEST_RESULT_4 = {
    "categories": ["-cat1", "-cat2", "-cat3", "-cat4"],
    "plugins": [
        "cat1_plugin1",
        "-cat1_plugin2",
        "-cat1_plugin3",
        "-cat2_plugin1",
        "-cat2_plugin2",
        "-cat2_plugin3",
        "-cat3_plugin1",
        "-cat3_plugin2",
        "-cat3_plugin3",
        "-cat4_plugin1",
    ],
}

# Negating a single plugin does not negate the other plugins in that category
TEST_REQUEST_5 = {"categories": ["cat1"], "plugins": ["-cat1_plugin1"]}
EXPECTED_REQUEST_RESULT_5 = {
    "categories": ["cat1", "-cat2", "-cat3", "-cat4"],
    "plugins": [
        "-cat1_plugin1",
        "cat1_plugin2",
        "cat1_plugin3",
        "-cat2_plugin1",
        "-cat2_plugin2",
        "-cat2_plugin3",
        "-cat3_plugin1",
        "-cat3_plugin2",
        "-cat3_plugin3",
        "-cat4_plugin1",
    ],
}


# A category with plugins negates the other categories
TEST_REQUEST_6 = {"categories": ["cat1"], "plugins": ["cat1_plugin1", "cat1_plugin2", "cat1_plugin3"]}
EXPECTED_REQUEST_RESULT_6 = {
    "categories": ["cat1", "-cat2", "-cat3", "-cat4"],
    "plugins": [
        "cat1_plugin1",
        "cat1_plugin2",
        "cat1_plugin3",
        "-cat2_plugin1",
        "-cat2_plugin2",
        "-cat2_plugin3",
        "-cat3_plugin1",
        "-cat3_plugin2",
        "-cat3_plugin3",
        "-cat4_plugin1",
    ],
}

# Only a negated category includes all the other categories (except the default disabled ones)
TEST_REQUEST_7 = {"categories": ["-cat1"]}
EXPECTED_REQUEST_RESULT_7 = {
    "categories": ["-cat1", "cat2", "cat3", "-cat4"],
    "plugins": [
        "-cat1_plugin1",
        "-cat1_plugin2",
        "-cat1_plugin3",
        "cat2_plugin1",
        "cat2_plugin2",
        "cat2_plugin3",
        "cat3_plugin1",
        "cat3_plugin2",
        "cat3_plugin3",
        "-cat4_plugin1",
    ],
}

# No plugins or categories includes all except the default disabled ones
TEST_REQUEST_8 = {}
EXPECTED_REQUEST_RESULT_8 = {
    "categories": ["cat1", "cat2", "cat3", "-cat4"],
    "plugins": [
        "cat1_plugin1",
        "cat1_plugin2",
        "cat1_plugin3",
        "cat2_plugin1",
        "cat2_plugin2",
        "cat2_plugin3",
        "cat3_plugin1",
        "cat3_plugin2",
        "cat3_plugin3",
        "-cat4_plugin1",
    ],
}

# Explicitly enabling a default disabled category includes it
TEST_REQUEST_9 = {"categories": ["cat4"]}
EXPECTED_REQUEST_RESULT_9 = {
    "categories": ["-cat1", "-cat2", "-cat3", "cat4"],
    "plugins": [
        "-cat1_plugin1",
        "-cat1_plugin2",
        "-cat1_plugin3",
        "-cat2_plugin1",
        "-cat2_plugin2",
        "-cat2_plugin3",
        "-cat3_plugin1",
        "-cat3_plugin2",
        "-cat3_plugin3",
        "cat4_plugin1",
    ],
}

# Explicitly enabling a default disabled category includes it
TEST_REQUEST_10 = {"plugins": ["cat4_plugin1"]}
EXPECTED_REQUEST_RESULT_10 = {
    "categories": ["-cat1", "-cat2", "-cat3", "-cat4"],
    "plugins": [
        "-cat1_plugin1",
        "-cat1_plugin2",
        "-cat1_plugin3",
        "-cat2_plugin1",
        "-cat2_plugin2",
        "-cat2_plugin3",
        "-cat3_plugin1",
        "-cat3_plugin2",
        "-cat3_plugin3",
        "cat4_plugin1",
    ],
}

TEST_EVENT_1 = {"body": json.dumps({"categories": ["static_analysis"]}), "service_id": "test_id"}
EXPECTED_EVENT_RESULT_1 = {
    "categories": ["static_analysis", "-secret", "-vulnerability", "-inventory", "-sbom", "-configuration"],
    "plugins": [
        "brakeman",
        "cfn_python_lint",
        "detekt",
        "eslint",
        "findsecbugs_java8",
        "nodejsscan",
        "python_code_checker",
        "shell_check",
        "tflint",
        "bandit",
        "findsecbugs_java7",
        "findsecbugs_java13",
        "gosec",
        "swiftlint",
        "checkov",
        "-trivy",
        "-trivy_sca",
        "-technology_discovery",
        "-gitsecrets",
        "-owasp_dependency_check",
        "-base_images",
        "-cicd_tools",
        "-node_dependencies",
        "-trufflehog",
        "-bundler_audit",
        "-php_sensio_security_checker",
        "-github_repo_health",
        "-gitlab_repo_health",
        "-trivy_sbom",
    ],
}

# Add these to the expected results only if these features are enabled in the test environment
if AQUA_ENABLED:
    EXPECTED_EVENT_RESULT_1["plugins"].append("-aqua_cli_scanner")
if VERACODE_ENABLED:
    EXPECTED_EVENT_RESULT_1["plugins"].append("-veracode_sca")
    EXPECTED_EVENT_RESULT_1["plugins"].append("-veracode_sbom")

TEST_REQUEST_VALIDATION_ERROR_PLUGIN = {"plugins": "cat1_plugin1"}
TEST_REQUEST_VALIDATION_ERROR_CATEGORY = {"categories": "cat1"}

TEST_CATEGORY_LIST_FEATURE_FLAGS = {
    "cat1": {"cat1_plugin1": None, "cat1_plugin2": "test_flag"},
}

# Identity has no feature flags
FEATURE_FLAG_IDENTIY_1 = Identity("test@example.com", [], {})
TEST_FEATURE_FLAG_REQUEST_1 = {"categories": ["cat1"]}
EXPECTED_FEATURE_FLAGS_REQUEST_RESULT_1 = {
    "categories": ["cat1"],
    "plugins": ["cat1_plugin1", "-cat1_plugin2"],
}

# Identity has feature flags present but disabled
FEATURE_FLAG_IDENTIY_2 = Identity("test@example.com", [], {"test_flag": False})
TEST_FEATURE_FLAG_REQUEST_2 = {"categories": ["cat1"]}
EXPECTED_FEATURE_FLAGS_REQUEST_RESULT_2 = {
    "categories": ["cat1"],
    "plugins": ["cat1_plugin1", "-cat1_plugin2"],
}

# Identity has feature flags present and enabled
FEATURE_FLAG_IDENTIY_3 = Identity("test@example.com", [], {"test_flag": True})
TEST_FEATURE_FLAG_REQUEST_3 = {"categories": ["cat1"]}
EXPECTED_FEATURE_FLAGS_REQUEST_RESULT_3 = {
    "categories": ["cat1"],
    "plugins": ["cat1_plugin1", "cat1_plugin2"],
}

# Identity has no feature flags but explicitly requests a flagged feature
FEATURE_FLAG_IDENTIY_4 = Identity("test@example.com", [], {})
TEST_FEATURE_FLAG_REQUEST_4 = {"plugins": ["cat1_plugin2"]}
EXPECTED_FEATURE_FLAGS_REQUEST_RESULT_4 = {
    "categories": ["-cat1"],
    "plugins": ["-cat1_plugin1", "-cat1_plugin2"],
}

# No identity means no features enabled
FEATURE_FLAG_IDENTIY_5 = None
TEST_FEATURE_FLAG_REQUEST_5 = {"plugins": ["cat1_plugin2"]}
EXPECTED_FEATURE_FLAGS_REQUEST_RESULT_5 = {
    "categories": ["-cat1"],
    "plugins": ["-cat1_plugin1", "-cat1_plugin2"],
}


class TestParseEvent(unittest.TestCase):
    """
    Note: These tests use assertCountEqual(). Contrary to the name, it checks that all elements in each list are equal.
    https://docs.python.org/3.7/library/unittest.html#unittest.TestCase.assertCountEqual
    """

    def setUp(self) -> None:
        self.services_loc = os.path.join(TEST_DIR, "data", "services.json")

    def test_check_and_replace_plugins_with_category(self):
        event_parser = EventParser(None, services_loc=self.services_loc)

        test_cases = [
            (TEST_REQUEST_1, EXPECTED_REQUEST_RESULT_1),
            (TEST_REQUEST_2, EXPECTED_REQUEST_RESULT_2),
            (TEST_REQUEST_3, EXPECTED_REQUEST_RESULT_3),
            (TEST_REQUEST_4, EXPECTED_REQUEST_RESULT_4),
            (TEST_REQUEST_5, EXPECTED_REQUEST_RESULT_5),
            (TEST_REQUEST_6, EXPECTED_REQUEST_RESULT_6),
            (TEST_REQUEST_7, EXPECTED_REQUEST_RESULT_7),
            (TEST_REQUEST_8, EXPECTED_REQUEST_RESULT_8),
            (TEST_REQUEST_9, EXPECTED_REQUEST_RESULT_9),
            (TEST_REQUEST_10, EXPECTED_REQUEST_RESULT_10),
        ]
        for test_case in test_cases:
            with self.subTest(test_case=test_case):
                result = event_parser._check_and_replace_plugins_with_category(
                    [test_case[0]], TEST_CATEGORY_LIST, TEST_DEFAULT_DISABLED_CATEGORIES
                )

                self.assertCountEqual(test_case[1]["categories"], result[0]["categories"])
                self.assertCountEqual(test_case[1]["plugins"], result[0]["plugins"])

    def test_check_and_replace_plugins_with_category_two_requests(self):
        event_parser = EventParser(None, services_loc=self.services_loc)

        result = event_parser._check_and_replace_plugins_with_category(
            [TEST_REQUEST_1, TEST_REQUEST_2],
            TEST_CATEGORY_LIST,
            TEST_DEFAULT_DISABLED_CATEGORIES,
        )

        self.assertCountEqual(EXPECTED_REQUEST_RESULT_1["categories"], result[0]["categories"])
        self.assertCountEqual(EXPECTED_REQUEST_RESULT_1["plugins"], result[0]["plugins"])
        self.assertCountEqual(EXPECTED_REQUEST_RESULT_2["categories"], result[1]["categories"])
        self.assertCountEqual(EXPECTED_REQUEST_RESULT_2["plugins"], result[1]["plugins"])

    def test_check_and_replace_plugins_with_category_validation_error_plugins(self):
        event_parser = EventParser(None, services_loc=self.services_loc)

        self.assertRaises(
            ValidationError,
            event_parser._check_and_replace_plugins_with_category,
            [TEST_REQUEST_VALIDATION_ERROR_PLUGIN],
            TEST_CATEGORY_LIST,
            [],
        )

    def test_check_and_replace_plugins_with_category_validation_error_categories(self):
        event_parser = EventParser(None, services_loc=self.services_loc)

        self.assertRaises(
            ValidationError,
            event_parser._check_and_replace_plugins_with_category,
            [TEST_REQUEST_VALIDATION_ERROR_CATEGORY],
            TEST_CATEGORY_LIST,
            [],
        )

    def test_check_and_replace_plugins_with_category_empty_categories(self):
        event_parser = EventParser(None, services_loc=self.services_loc)

        expected_result = list(TEST_CATEGORY_LIST.keys())
        result = event_parser._check_and_replace_plugins_with_category([{"categories": []}], TEST_CATEGORY_LIST, [])
        self.assertEqual(sorted(expected_result), sorted(result[0]["categories"]))

    def test_check_and_replace_plugins_with_category_empty_plugins(self):
        self.maxDiff = None
        event_parser = EventParser(None, services_loc=self.services_loc)

        expected_result = {"categories": list(TEST_CATEGORY_LIST.keys()), "plugins": []}
        for category in TEST_CATEGORY_LIST:
            expected_result["plugins"].extend(list(TEST_CATEGORY_LIST[category].keys()))
        result = event_parser._check_and_replace_plugins_with_category([{"plugins": []}], TEST_CATEGORY_LIST, [])
        self.assertEqual(sorted(expected_result["categories"]), sorted(result[0]["categories"]))
        self.assertEqual(sorted(expected_result["plugins"]), sorted(result[0]["plugins"]))

    def test_parse_repo_body_repo_in_path(self):
        event_parser = EventParser(TEST_EVENT_1, services_loc=self.services_loc)

        result = event_parser._parse_repo_body(True)

        self.assertCountEqual(EXPECTED_EVENT_RESULT_1["categories"], result[0]["categories"])
        self.assertCountEqual(EXPECTED_EVENT_RESULT_1["plugins"], result[0]["plugins"])

    def test_parse_repo_body_repo_not_in_path(self):
        event = {"body": json.dumps({"categories": ["static_analysis"], "repo": "test_repo"}), "service_id": "test_id"}
        event_parser = EventParser(event, services_loc=self.services_loc)

        result = event_parser._parse_repo_body(False)

        # Take the expected event and add the repo key before doing the assertion
        expected_event = deepcopy(EXPECTED_EVENT_RESULT_1)
        expected_event["repo"] = "test_repo"

        self.assertCountEqual(expected_event["categories"], result[0]["categories"])
        self.assertCountEqual(expected_event["plugins"], result[0]["plugins"])

    def test_check_and_replace_plugins_with_category_feature_flags(self):
        test_cases = [
            (FEATURE_FLAG_IDENTIY_1, TEST_FEATURE_FLAG_REQUEST_1, EXPECTED_FEATURE_FLAGS_REQUEST_RESULT_1),
            (FEATURE_FLAG_IDENTIY_2, TEST_FEATURE_FLAG_REQUEST_2, EXPECTED_FEATURE_FLAGS_REQUEST_RESULT_2),
            (FEATURE_FLAG_IDENTIY_3, TEST_FEATURE_FLAG_REQUEST_3, EXPECTED_FEATURE_FLAGS_REQUEST_RESULT_3),
            (FEATURE_FLAG_IDENTIY_4, TEST_FEATURE_FLAG_REQUEST_4, EXPECTED_FEATURE_FLAGS_REQUEST_RESULT_4),
            (FEATURE_FLAG_IDENTIY_5, TEST_FEATURE_FLAG_REQUEST_5, EXPECTED_FEATURE_FLAGS_REQUEST_RESULT_5),
        ]
        for test_case in test_cases:
            with self.subTest(test_case=test_case):
                event_parser = EventParser(None, services_loc=self.services_loc, identity=test_case[0])
                result = event_parser._check_and_replace_plugins_with_category(
                    [test_case[1]], TEST_CATEGORY_LIST_FEATURE_FLAGS, []
                )

                self.assertCountEqual(test_case[2]["categories"], result[0]["categories"])
                self.assertCountEqual(test_case[2]["plugins"], result[0]["plugins"])
