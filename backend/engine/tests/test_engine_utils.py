import docker
import os
from typing import Any
import unittest
from unittest.mock import patch, Mock
import docker.errors
from pydantic import ValidationError

from engine.utils.plugin import (
    PluginSettings,
    Runner,
    get_plugin_settings,
    match_nonallowlisted_raw_secrets,
    process_event_info,
    temporary_volume,
    get_truncated_hash,
)
from utils.services import _get_services_from_file

TEST_DIR = os.path.dirname(os.path.abspath(__file__))
SERVICES_FILE = os.path.join(TEST_DIR, "data", "services.json")
PLUGIN_TEST_BASE_DIR = os.path.join(TEST_DIR, "data", "util")

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


@patch("engine.utils.plugin.ECR", "test.example.com")
class TestPluginSettings(unittest.TestCase):
    # Note: See test_get_plugin_settings_* below for additional tests.

    def test_image_expand_var(self):
        """
        Test that the container image ref expands the "$ECR" variable and trims
        initial slash.
        """
        actual = PluginSettings(name="Test", image="/$ECR/foo/bar:latest")
        self.assertEqual(actual.image, "test.example.com/foo/bar:latest")

    def test_disabled(self):
        """
        Test various allowed inputs on the "enabled" field.
        """
        # Set the ENV VARs for the test
        os.environ["TEST_VAR_TRUE"] = "1"
        os.environ["TEST_VAR_FALSE"] = "0"

        test_cases: list[tuple[Any, bool]] = [
            # input, expected
            (True, False),
            (False, True),
            ("$TEST_VAR_TRUE", False),
            ("$TEST_VAR_FALSE", True),
            (1, True),
            ("string", True),
            ("INVALID", True),
            ("$TEST_VAR_NOT_SET", False),
            (None, False),
        ]
        for test_case in test_cases:
            with self.subTest(test_case=test_case):
                actual = PluginSettings(name="Test", enabled=test_case[0])
                self.assertEqual(actual.disabled, test_case[1])


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

    @patch("engine.utils.plugin.ENGINE_DIR", PLUGIN_TEST_BASE_DIR)
    @patch("engine.utils.plugin.ECR", "test.example.com")
    def test_get_plugin_settings_normal(self):
        """
        Tests loading a fully-specified settings file.
        """
        actual = get_plugin_settings("normal")
        self.assertEqual(actual.name, "Test Plugin")
        self.assertEqual(actual.image, "test.example.com/normal:latest")
        self.assertEqual(actual.disabled, False)
        self.assertEqual(actual.plugin_type, "vulnerability")
        self.assertEqual(actual.build_images, True)
        self.assertEqual(actual.runner, Runner.CORE)
        self.assertEqual(actual.feature, "unit-test")
        self.assertEqual(actual.timeout, 300)
        self.assertEqual(actual.writable, True)

    @patch("engine.utils.plugin.ENGINE_DIR", PLUGIN_TEST_BASE_DIR)
    def test_get_plugin_settings_minimal(self):
        """
        Tests default values when loading a minimal settings file.
        """
        actual = get_plugin_settings("minimal")
        self.assertEqual(actual.name, "Test Minimal Plugin")
        self.assertEqual(actual.image, "")
        self.assertEqual(actual.disabled, False)
        self.assertEqual(actual.plugin_type, "misc")
        self.assertEqual(actual.build_images, False)
        self.assertEqual(actual.runner, Runner.CORE)
        self.assertIsNone(actual.feature)
        self.assertIsNone(actual.timeout)
        self.assertEqual(actual.writable, False)

    @patch("engine.utils.plugin.ENGINE_DIR", PLUGIN_TEST_BASE_DIR)
    def test_get_plugin_settings_nonexistent(self):
        """
        Tests an exception is raised when loading a nonexistent settings file.
        """
        with self.assertRaises(FileNotFoundError):
            get_plugin_settings("nonexistent")

    @patch("engine.utils.plugin.ENGINE_DIR", PLUGIN_TEST_BASE_DIR)
    def test_get_plugin_settings_invalid(self):
        """
        Tests an exception is raised when loading a malformed settings file.
        """
        with self.assertRaises(ValidationError) as ex:
            get_plugin_settings("invalid")
        self.assertEqual(ex.exception.error_count(), 4)

    def test_temporary_volume_normal(self):
        """
        Tests a temporary volume is created and automatically cleaned up.
        """
        docker_client = docker.from_env()
        with temporary_volume("test-prefix") as vol_name:
            self.assertTrue(vol_name.startswith("test-prefix"))
            docker_client.volumes.get(vol_name)
        with self.assertRaises(docker.errors.NotFound):
            docker_client.volumes.get(vol_name)

    def test_temporary_volume_cleanup(self):
        """
        Tests a temporary volume is cleaned up even if an exception is raised.
        """
        docker_client = docker.from_env()
        vol_name = ""
        with self.assertRaises(ValueError):
            with temporary_volume("test-prefix") as vol_name:
                raise ValueError("test")
        with self.assertRaises(docker.errors.NotFound):
            docker_client.volumes.get(vol_name)

    @patch("engine.utils.plugin.queue_event")
    @patch("engine.utils.plugin.SECRETS_EVENTS_ENABLED", True)
    @patch("engine.utils.plugin.PROCESS_SECRETS_WITH_PATH_EXCLUSIONS", True)
    @patch("engine.utils.plugin.get_truncated_hash")
    def test_process_event_info_secret_hash(self, mock_hash, mock_queue_event):
        """
        Test that process_event_info generates a secret_hash when secret details exist,
        and does not include secret_hash when no secret details are available.
        """
        mock_hash.return_value = "abcd1234567890abcd1234"

        mock_scan = Mock()
        mock_scan.repo.repo = "test-org/test-repo"
        mock_scan.repo.service = "github"
        mock_scan.ref = "main"
        mock_scan.branch_last_commit_timestamp = "2025-12-01T00:00:00Z"
        mock_scan.include_paths = None
        mock_scan.exclude_paths = None
        mock_scan.report_url = "https://example.com/report"

        # Test Result with secret details
        results = {
            "details": [
                {
                    "id": "secret-1",
                    "filename": "config.py",
                    "line": 42,
                    "commit": "abc123",
                    "author": "test-author",
                    "author-timestamp": "2025-12-01T00:00:00Z",
                }
            ],
            "event_info": {"secret-1": {"type": "api-key", "match": ["sk-1234567890abcdef"]}},
        }

        process_event_info(mock_scan, results, "secrets", "test-plugin", False)
        mock_hash.assert_called_once_with("sk-1234567890abcdef")

        # Verify that queue_event was called
        self.assertTrue(mock_queue_event.called)

        # Verify that the payload includes the secret_hash
        call_args = mock_queue_event.call_args[0]
        payload = call_args[2]
        self.assertIn("secret_hash", payload)
        self.assertEqual(payload["secret_hash"], "abcd1234567890abcd1234")

        # Reset mocks
        mock_queue_event.reset_mock()
        mock_hash.reset_mock()

        # Modify test result
        results["event_info"]["secret-1"]["match"] = [""]

        process_event_info(mock_scan, results, "secrets", "test-plugin", False)
        mock_hash.assert_called_once_with("")

        # Verify that the payload does NOT include secret_hash
        call_args = mock_queue_event.call_args[0]
        payload = call_args[2]
        self.assertNotIn("secret_hash", payload)

    @patch("engine.utils.plugin.AWSConnect")
    def test_get_truncated_hash_with_pepper(self, mock_aws_connect):
        """
        Test that get_truncated_hash uses the pepper from AWS secrets to generate hash.
        """
        mock_aws_instance = Mock()
        mock_aws_instance.get_secret_raw.return_value = (
            "11f450d9c976c012eeaac9eb8047ef5ad1963c12f8b928c6392d1306b9cf5796"
        )
        mock_aws_connect.return_value = mock_aws_instance

        test_value = "test-secret-value"
        result = get_truncated_hash(test_value)

        # Verify the same input produces the same output
        result2 = get_truncated_hash(test_value)
        self.assertEqual(result, result2)
