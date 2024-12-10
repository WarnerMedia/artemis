"""
Tests Owasp Dependency Check Plugin
"""

import json
from pathlib import Path
import unittest

from engine.plugins.owasp_dependency_check import main as owasp

TEST_DIR = Path(__file__).parent.absolute() / "data"
DEPENDENCY_CHECK_DIR = TEST_DIR / "owasp_dependency_check"
JAVA_DIR = TEST_DIR / "java"


class TestPluginOWASPDependencyCheck(unittest.TestCase):
    def test_parse_build_results(self):
        with (DEPENDENCY_CHECK_DIR / "parsed-output.json").open() as json_file:
            parsed_report = json.load(json_file)
            scan_report = owasp.parse_scanner_output_json(str(DEPENDENCY_CHECK_DIR / "dependency-check-report.json"), 0)
            self.assertListEqual(scan_report["errors"], parsed_report["errors"])
            self.assertListEqual(scan_report["output"], parsed_report["output"])
            self.assertEqual(scan_report, parsed_report)

    def test_parse_build_results_file_not_found(self):
        scan_report = owasp.parse_scanner_output_json(str(DEPENDENCY_CHECK_DIR / "nonexistent.json"), 0)
        self.assertEqual(len(scan_report["errors"]), 1)
        self.assertIn("No report file found", scan_report["errors"][0])

    def test_pom_exists(self):
        self.assertFalse(owasp.pom_exists(str(DEPENDENCY_CHECK_DIR)))
        self.assertTrue(owasp.pom_exists(str(JAVA_DIR)))
