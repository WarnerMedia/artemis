"""
Tests Owasp Dependency Check Plugin
"""

import os
import unittest
import json

from engine.plugins.owasp_dependency_check import main as owasp

TEST_DIR = os.path.dirname(os.path.abspath(__file__))
DEPENDENCY_CHECK_DIR = os.path.join(TEST_DIR, "data", "owasp_dependency_check/")
JAVA_DIR = os.path.join(TEST_DIR, "data", "java")


class TestPluginOWASPDependencyCheck(unittest.TestCase):
    def test_parse_build_results(self):
        with open(os.path.join(DEPENDENCY_CHECK_DIR, "parsed-output.json")) as json_file:
            parsed_report = json.load(json_file)
            scan_report = owasp.parse_scanner_output_json(DEPENDENCY_CHECK_DIR, 0)
            self.assertListEqual(scan_report["errors"], parsed_report["errors"])
            self.assertListEqual(scan_report["output"], parsed_report["output"])
            self.assertEqual(scan_report, parsed_report)

    def test_pom_exists(self):
        self.assertFalse(owasp.pom_exists(DEPENDENCY_CHECK_DIR))
        self.assertTrue(owasp.pom_exists(JAVA_DIR))
