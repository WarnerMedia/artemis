import unittest
from unittest.mock import patch

from engine.plugins.lib.common.system.allowlist import SystemAllowList


class TestSystemAllowList(unittest.TestCase):
    @patch("engine.plugins.lib.common.system.allowlist.SystemAllowList._load_al")
    def test_ignore_secret(self, mock_al):
        mock_al.return_value = [
            {"filename": "*/test.pem"},
            {"value": "AKIAIOSFODNN7EXAMPLE"},
            {"filename": "*/test.json", "value": "testkey"},
            {"value": "*$TEST:$TEST*"},
        ]
        al = SystemAllowList()

        # The singleton may have been previously initialized elsewhere in the unit tests
        # so reload the items with the mock data
        al._items = al._load_al("secret")

        test_cases = [
            ("path/to/test/test.pem", "anything", True),
            ("other/path/to/test/test.pem", "anything", True),
            ("any/path/to/file1", "AKIAIOSFODNN7EXAMPLE", True),
            ("any/path/to/file2", "AKIAIOSFODNN7EXAMPLE", True),
            ("path/to/test/test.json", "testkey", True),
            ("path/to/test/test.json", "otherkey", False),
            ("path/to/other/file", "abcde12345", False),
            ("any/path/to/file", "https://$TEST:$TEST@localhost", True),
            ("any/path/to/file", "https://$TEST:pass@localhost", False),
        ]
        for test_case in test_cases:
            with self.subTest(test_case=test_case):
                actual = al.ignore_secret(test_case[0], test_case[1])
                self.assertEqual(actual, test_case[2])
