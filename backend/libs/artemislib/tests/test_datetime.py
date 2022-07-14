import unittest
from datetime import datetime, timezone

from artemislib.datetime import from_iso_timestamp


class TestDatetime(unittest.TestCase):
    def test_from_iso_timestamp(self):
        test_cases = [
            ("2021-01-01T00:00:00+00:00", datetime(2021, 1, 1, tzinfo=timezone.utc)),
            ("2021-01-01T00:00:00Z", datetime(2021, 1, 1, tzinfo=timezone.utc)),
            ("2021-01-01T05:00:00+05:00", datetime(2021, 1, 1, tzinfo=timezone.utc)),
            ("2020-12-31T19:00:00-05:00", datetime(2021, 1, 1, tzinfo=timezone.utc)),
        ]
        for test_case in test_cases:
            with self.subTest(test_case=test_case):
                actual = from_iso_timestamp(test_case[0])
                self.assertEqual(test_case[1], actual)
