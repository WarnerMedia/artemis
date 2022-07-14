import os
import unittest

from engine.plugins.detekt.main import run_detekt

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

KOTLIN_TEST_DIR1 = "data/detekt/test"
KOTLIN_TEST_DIR2 = "data/detekt/empty"
KOTLIN_TEST_DIR3 = "/doesnotexist"

TEST_RESPONSE1 = {
    "success": True,
    "truncated": False,
    "details": [
        {
            "filename": "Test.kt",
            "line": "6",
            "message": "Do not print an stack trace. These debug statements should be replaced with a logger or removed.",
            "severity": "medium",
            "type": "PrintStackTrace",
        }
    ],
    "errors": [],
}
TEST_RESPONSE2 = {"success": True, "truncated": False, "details": [], "errors": []}
TEST_RESPONSE3 = {
    "success": False,
    "truncated": False,
    "details": [],
    "errors": ["The detekt plugin encountered a fatal error"],
}


class TestDetekt(unittest.TestCase):
    def test_with_findings(self):
        response = run_detekt(f"{SCRIPT_DIR}/{KOTLIN_TEST_DIR1}")
        self.assertEqual(TEST_RESPONSE1, response)

    def test_without_findings(self):
        response = run_detekt(f"{SCRIPT_DIR}/{KOTLIN_TEST_DIR2}")
        self.assertEqual(TEST_RESPONSE2, response)

    def test_error(self):
        response = run_detekt(KOTLIN_TEST_DIR3)
        self.assertEqual(TEST_RESPONSE3, response)
