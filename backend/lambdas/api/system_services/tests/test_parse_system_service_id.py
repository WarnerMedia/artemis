import unittest

from system_services.util.events import ParsedEvent


class TestParseSystemServiceId(unittest.TestCase):
    def test_parse_service_id(self):
        test_cases = [
            ("github/warnermedia", {"item_id": "github/warnermedia", "resource": None}),
            ("github/warnermedia/stats", {"item_id": "github/warnermedia", "resource": "stats"}),
            ("github/stats", {"item_id": "github/stats", "resource": None}),
            ("example.com", {"item_id": "example.com", "resource": None}),
            ("example.com/stats", {"item_id": "example.com", "resource": "stats"}),
        ]

        for test_case in test_cases:
            with self.subTest(test_case=test_case):
                expected = test_case[1]
                event = ParsedEvent({"pathParameters": {"id": test_case[0]}})
                actual = {"item_id": event.ids.get("system_service_id"), "resource": event.ids.get("resource")}
                self.assertEqual(actual, expected)
