import unittest

from artemisdb.artemisdb.consts import AllowListType
from artemisdb.artemisdb.models import AllowListItem


class TestAllowListItem(unittest.TestCase):
    def test_get_cache_key_static_analysis(self):
        item = AllowListItem()
        item.item_type = AllowListType.STATIC_ANALYSIS.value
        item.value = {"type": "foo", "line": 1}
        expected_result = "static_analysis:severity:foo:1"
        self.assertEqual(expected_result, item._severity_cache_key)

    def test_get_cache_key_vulnerability(self):
        item = AllowListItem()
        item.item_type = AllowListType.VULN.value
        item.value = {"id": "1234"}
        expected_result = "vulnerability:severity:1234"
        self.assertEqual(expected_result, item._severity_cache_key)

    def test_get_cache_key_vulnerability_raw(self):
        item = AllowListItem()
        item.item_type = AllowListType.VULN_RAW.value
        item.value = {"id": "1234"}
        expected_result = "vulnerability:severity:1234"
        self.assertEqual(expected_result, item._severity_cache_key)
