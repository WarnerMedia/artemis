import unittest
from datetime import datetime, timezone

from artemislib.datetime import from_iso_timestamp


class TestDatetime(unittest.TestCase):
    def test_from_iso_timestamp(self):
        test_cases = [
            # String -> Args to datetime() (must be serializable).
            ("2021-01-01T00:00:00+00:00", [2021, 1, 1]),
            ("2021-01-01T00:00:00Z", [2021, 1, 1]),
            ("2021-01-01T05:00:00+05:00", [2021, 1, 1]),
            ("2020-12-31T19:00:00-05:00", [2021, 1, 1]),
        ]
        for test_case in test_cases:
            with self.subTest(test_case=test_case):
                actual = from_iso_timestamp(test_case[0])
                expected = datetime(*test_case[1], tzinfo=timezone.utc)
                self.assertEqual(expected, actual)
