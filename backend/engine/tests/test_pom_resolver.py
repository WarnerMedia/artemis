import os
import unittest

from engine.plugins.lib.line_numbers.resolver import PomResolver

TEST_DIR = os.path.dirname(os.path.abspath(__file__))
TEST_POM_FILE = os.path.join(TEST_DIR, "data", "java", "pom.xml")


class TestPomResolver(unittest.TestCase):
    def setUp(self) -> None:
        self.resolver = PomResolver(TEST_POM_FILE)

    def test_pom_parsing(self):
        test_cases = {
            "group1": {"filename": TEST_POM_FILE, "line": 23},
            "group2": {"filename": TEST_POM_FILE, "line": 27},
            "group3": {"filename": TEST_POM_FILE, "line": 31},
        }
        for test_case in test_cases:
            with self.subTest(test_case=test_case):
                actual = self.resolver.find(test_case)
                self.assertEqual(test_cases[test_case], actual)
