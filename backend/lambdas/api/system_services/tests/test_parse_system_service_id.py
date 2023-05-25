import unittest

from system_services.util.events import ParsedEvent


class TestParseSystemServiceId(unittest.TestCase):
    def test_parse_service_id(self):
        test_cases = [
            ("github/warnermedia", {"item_id": "github/warnermedia", "stats_request": False}),
            ("github/warnermedia/stats", {"item_id": "github/warnermedia", "stats_request": True}),
            ("github/stats", {"item_id": "github/stats", "stats_request": False}),
            ("example.com", {"item_id": "example.com", "stats_request": False}),
            ("example.com/stats", {"item_id": "example.com", "stats_request": True}),
        ]

        for test_case in test_cases:
            with self.subTest(test_case=test_case):
                expected = test_case[1]
                event = ParsedEvent({"pathParameters": {"id": test_case[0]}})
                actual = {"item_id": event.item_id, "stats_request": event.stats_request}
                self.assertEqual(actual, expected)
