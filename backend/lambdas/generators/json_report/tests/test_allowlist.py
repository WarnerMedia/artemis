import unittest

from json_report.results.vuln import allowlisted_vuln


class MockAllowListItem:
    def __init__(self, component, ident, source) -> None:
        self.value = {"component": component, "id": ident, "source": source}


ALLOW_LIST = [MockAllowListItem("component1", "id1", "file1")]


class TestAllowList(unittest.TestCase):
    def test_allowlist_vuln_str(self):
        test_cases = [
            ({"component": "component1", "id": "id1", "source": "file1"}, True),
            ({"component": "component1", "id": "id2", "source": "file1"}, False),
        ]
        for test_case in test_cases:
            with self.subTest(test_case=test_case):
                actual = allowlisted_vuln(test_case[0], ALLOW_LIST)
                self.assertEqual(actual, test_case[1])

    def test_allowlist_vuln_list(self):
        test_cases = [
            ({"component": "component1", "id": "id1", "source": ["file1"]}, True),
            ({"component": "component1", "id": "id2", "source": ["file2"]}, False),
            ({"component": "component1", "id": "id1", "source": ["file1", "file2"]}, False),
        ]
        for test_case in test_cases:
            with self.subTest(test_case=test_case):
                actual = allowlisted_vuln(test_case[0], ALLOW_LIST)
                self.assertEqual(actual, test_case[1])

    def test_allowlist_vuln_item_modified(self):
        test_case = {"component": "component1", "id": "id1", "source": ["file1", "file2"]}
        expected = {"component": "component1", "id": "id1", "source": ["file2"]}  # The hidden source is removed
        hidden = allowlisted_vuln(test_case, ALLOW_LIST)
        self.assertFalse(hidden)
        self.assertEqual(test_case, expected)
