import docker
import os
from typing import Any
import unittest
from unittest.mock import patch
import docker.errors
from pydantic import ValidationError

from engine.utils.plugin import (
    PluginSettings,
    Runner,
    get_plugin_settings,
    match_nonallowlisted_raw_secrets,
    temporary_volume,
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
