import unittest
from datetime import datetime, timedelta, timezone

import pytest

from artemisapi.response import response
from repo.util.const import PLUGIN_LIST_BY_CATEGORY
from repo.util.env import VERACODE_ENABLED
from repo.util.utils import GetProxySecret, get_api_key, get_ttl_expiration, is_qualified, is_sbom

TEST_STATIC_ANALYSIS_AL_ITEM = {"type": "static_analysis", "value": {"line": 1, "type": "test_type"}}

TEST_VULN_AL_ITEM = {"type": "vulnerability", "value": {"id": 1, "component": "test_component"}}


class TestUtils(unittest.TestCase):
    @pytest.mark.integtest
    def test_get_proxy_secret(self):
        result = GetProxySecret()

        self.assertIsInstance(result, str)

    @pytest.mark.integtest
    def test_get_api_key_properties_success(self):
        result = get_api_key("properties")

        self.assertIsInstance(result, str)

    def test_get_ttl_expiration(self):
        days_check = 12
        expected_result = datetime.now(timezone.utc) + timedelta(days=days_check)
        expected_result = expected_result.replace(minute=0, second=0, microsecond=0)

        result = get_ttl_expiration(days_check).replace(minute=0, second=0, microsecond=0)

        self.assertEqual(expected_result, result)

    def test_response_empty_list(self):
        expected = {
            "isBase64Encoded": "false",
            "statusCode": 200,
            "headers": {"Content-Type": "application/json"},
            "body": "[]",
        }
        actual = response(msg=[])

        self.assertEqual(expected, actual | expected)

    def test_is_sbom(self):
        if not VERACODE_ENABLED:
            # Veracode is not enabled by default but is needed for this test.
            PLUGIN_LIST_BY_CATEGORY["sbom"]["veracode_sbom"] = None

        test_cases = [
            (["veracode_sbom"], True),
            (["-veracode_sbom"], False),
        ]
        for test_case in test_cases:
            with self.subTest(test_case=test_case):
                self.assertEqual(is_sbom(test_case[0]), test_case[1])

        if not VERACODE_ENABLED:
            # Test over. Clean up from before.
            del PLUGIN_LIST_BY_CATEGORY["sbom"]["veracode_sbom"]

    def test_is_qualified(self):
        qualified_plugins = {
            "category1": [["plugin1"], ["plugin2", "plugin3"]],
            "category2": [["plugin4"]],
            "category3": [],  # This is the case where the only plugin in the cat is disabled
        }

        test_cases = [
            (["plugin1", "plugin2", "plugin4"], True),
            (["plugin1", "plugin3", "plugin4"], True),
            (["plugin1", "plugin2", "plugin3", "plugin4"], True),
            (["plugin1", "plugin2", "plugin3", "plugin4", "plugin5"], True),
            (["plugin1", "plugin4"], False),
            (["plugin2", "plugin3", "plugin4"], False),
            (["plugin1", "plugin2", "plugin3"], False),
        ]
        for test_case in test_cases:
            with self.subTest(test_case=test_case):
                self.assertEqual(is_qualified(test_case[0], qualified_plugins), test_case[1])
