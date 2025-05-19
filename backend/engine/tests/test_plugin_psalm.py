import os
import unittest

from engine.plugins.psalm import main as Psalm

TEST_DIR = os.path.dirname(os.path.abspath(__file__))
TEST_DATA = os.path.join(TEST_DIR, "data/psalm")
TEST_PARSE_RESULT_1 = [
    {
        "filename": "data/psalm/main.php",
        "line": 8,
        "message": "Detected tainted SQL",
        "severity": "high",
        "type": "psalm",
    },
    {
        "filename": "data/psalm/post.php",
        "line": 3,
        "message": "Detected tainted HTML",
        "severity": "high",
        "type": "psalm",
    },
    {
        "filename": "data/psalm/post.php",
        "line": 3,
        "message": "Detected tainted text with possible quotes",
        "severity": "high",
        "type": "psalm",
    },
]


class TestPHPPsalmPlugin(unittest.TestCase):
    def test_parse_results_with_vulnerabilities(self):
        error_msg = "Unable to run Psalm"
        errors, results = Psalm.parse_results(1, "", error_msg)
        self.assertTrue(error_msg in errors)
        self.assertEqual([], results)

    def test_parse_results_with_error(self):
        errors, results = Psalm.parse_results(0, TEST_DATA, "")
        self.assertEqual(errors, [])
        self.assertEqual(results, TEST_PARSE_RESULT_1)
