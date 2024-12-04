import os
import unittest

from engine.plugins.swiftlint.main import run_swiftlint

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

SWIFT_TEST_DIR1 = "data/swiftlint/findings"
SWIFT_TEST_DIR2 = "data/swiftlint/nofindings"
SWIFT_TEST_DIR3 = "data/swiftlint/noswift"

SWIFT_RESPONSE1 = {
    "success": True,
    "truncated": False,
    "details": [
        {
            "filename": "findings.swift",
            "line": "1",
            "message": "Prefer `private` over `fileprivate` declarations. (private_over_fileprivate)",
            "severity": "low",
            "type": "Private over fileprivate Violation",
        }
    ],
    "errors": [],
}
SWIFT_RESPONSE2 = {"success": True, "truncated": False, "details": [], "errors": []}


class TestPluginSwiftLint(unittest.TestCase):
    def test_with_findings(self):
        response = run_swiftlint(f"{SCRIPT_DIR}/{SWIFT_TEST_DIR1}")
        self.assertEqual(response, SWIFT_RESPONSE1)

    def test_without_findings(self):
        response = run_swiftlint(f"{SCRIPT_DIR}/{SWIFT_TEST_DIR2}")
        self.assertEqual(response, SWIFT_RESPONSE2)

    def test_no_swift(self):
        response = run_swiftlint(f"{SCRIPT_DIR}/{SWIFT_TEST_DIR3}")
        self.assertEqual(response, SWIFT_RESPONSE2)
