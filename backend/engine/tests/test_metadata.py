import os
import unittest
from unittest.mock import MagicMock, Mock, patch
from copy import deepcopy

from metadata import metadata, util

TEST_DIR = os.path.dirname(os.path.abspath(__file__))
TEST_REPO = "WarnerMedia/artemis"
TEST_SERVICE = "test_service"
TEST_APP_METADATA = {"test_metadata": {"include": ["*"], "exclude": []}}


class TestMetadata(unittest.TestCase):
    def test_get_all_metadata_default_schemes_empty(self):
        with patch.object(metadata, "default_schemes", {}):
            result, timestamps = metadata.get_all_metadata(TEST_APP_METADATA, TEST_SERVICE, TEST_REPO, TEST_DIR)
            self.assertEqual(result, {})
            self.assertEqual(timestamps, {})

    def test_get_all_metadata_default_schemes_loaded(self):
        plugin = MagicMock(return_value=({"foo": 1}, 12345))
        schemes = {"test_metadata": plugin}
        with patch.object(metadata, "default_schemes", schemes):
            result, timestamps = metadata.get_all_metadata(TEST_APP_METADATA, TEST_SERVICE, TEST_REPO, TEST_DIR)
            plugin.assert_called_with(TEST_SERVICE, TEST_REPO, TEST_DIR)
            self.assertEqual(result, {"test_metadata": {"foo": 1}})
            self.assertEqual(timestamps, {"test_metadata": 12345})

    def test_get_all_metadata_specified_schemes(self):
        plugin = MagicMock(return_value=({"bar": 2}, 67890))
        schemes = {"test_metadata": plugin}
        result, timestamps = metadata.get_all_metadata(TEST_APP_METADATA, TEST_SERVICE, TEST_REPO, TEST_DIR, schemes)
        plugin.assert_called_with(TEST_SERVICE, TEST_REPO, TEST_DIR)
        self.assertEqual(result, {"test_metadata": {"bar": 2}})
        self.assertEqual(timestamps, {"test_metadata": 67890})

    # Note: The "included" case is covered by above, so we only check the "excluded" cases.

    def test_get_all_metadata_settings_excluded(self):
        plugin = MagicMock(return_value=({"baz": 3}, 13579))
        schemes = {"test_metadata": plugin}
        app_metadata_excluded = deepcopy(TEST_APP_METADATA)
        app_metadata_excluded["test_metadata"]["exclude"] = ["WarnerMedia/*"]
        result, timestamps = metadata.get_all_metadata(
            app_metadata_excluded, TEST_SERVICE, TEST_REPO, TEST_DIR, schemes
        )
        plugin.assert_not_called()
        self.assertEqual(result, {})
        self.assertEqual(timestamps, {})

    def test_get_all_metadata_settings_blank(self):
        plugin = MagicMock(return_value=({"baz": 3}, 13579))
        schemes = {"test_metadata": plugin}
        result, timestamps = metadata.get_all_metadata({}, TEST_SERVICE, TEST_REPO, TEST_DIR, schemes)
        plugin.assert_not_called()
        self.assertEqual(result, {})
        self.assertEqual(timestamps, {})

    @patch.object(util, "METADATA_SCHEME_MODULES", ["xx_fake_metadata_plugin"])
    def test_load_schemes_default_invalid(self):
        with self.assertLogs("metadata.util", "ERROR") as lc:
            actual = metadata.load_schemes()
            self.assertEqual(actual, {})  # No valid modules.
            self.assertEqual(len(lc.output), 1)
            self.assertIn(
                "Unable to load metadata processing module xx_fake_metadata_plugin",
                lc.output[0],
            )

    def test_load_schemes_valid(self):
        mock_plugin = Mock()
        mock_plugin.SCHEME_NAME = "mock_metadata_plugin"
        mock_plugin.get_metadata = lambda: "foo_bar"
        with patch.dict("sys.modules", {"mock_metadata_plugin": mock_plugin}):
            actual = metadata.load_schemes(["mock_metadata_plugin"])
            self.assertEqual(actual["mock_metadata_plugin"](), "foo_bar")

    def test_load_schemes_incomplete_module(self):
        mock_plugin = {
            # No SCHEME_NAME or get_metadata defined.
        }
        with patch.dict("sys.modules", {"mock_invalid_metadata_plugin": mock_plugin}):
            with self.assertLogs("metadata.util", "ERROR") as lc:
                actual = metadata.load_schemes(["mock_invalid_metadata_plugin"])
                self.assertEqual(actual, {})  # No valid modules.
                self.assertEqual(len(lc.output), 1)
                self.assertIn(
                    "Unable to load metadata processing module mock_invalid_metadata_plugin",
                    lc.output[0],
                )
