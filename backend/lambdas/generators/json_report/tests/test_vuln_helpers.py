import unittest

from json_report.results.vuln import _get_summary_count, _merge_vuln, _most_severe

test_vulns_a = {
    "comp_name_1": {
        "CVE-1111-2222": {
            "source": ["file.txt"],
            "severity": "low",
            "description": "some desc",
            "remediation": "some remed",
        }
    },
    "comp_name_2": {
        "CVE-1111-2222": {
            "source": ["file.txt"],
            "severity": "medium",
            "description": "some desc",
            "remediation": "some remed",
        },
        "CVE-3333-4444": {
            "source": ["file.txt"],
            "severity": "medium",
            "description": "some desc",
            "remediation": "some remed",
        },
        "CVE-5555-6666": {
            "source": ["file.txt"],
            "severity": "high",
            "description": "some desc",
            "remediation": "some remed",
        },
    },
}

summary_a = {"critical": 0, "high": 1, "medium": 2, "low": 1, "negligible": 0, "": 0}

merge_it_a = {
    "source": ["file.txt"],
    "severity": "medium",
    "description": "",
    "remediation": "",
    "source_plugins": ["plugin1"],
}

merge_it_b = {
    "source": "file_string.txt",
    "severity": "high",
    "description": "some desc",
    "remediation": "some remed",
}

merge_it_c = {
    "source": ["file.txt"],
    "severity": "medium",
    "description": "",
    "remediation": "",
    "source_plugins": ["plugin1"],
}

merge_it_d = {
    "source": ["a.txt", "b.txt"],
    "severity": "low",
    "description": "some desc",
    "remediation": "some remed",
}


class TestJSONReportHelpers(unittest.TestCase):
    def test_most_severe(self):
        test_cases = [
            ({"item_severity": "High", "cached_severity": "Low"}, "High"),
            ({"item_severity": "Low", "cached_severity": "High"}, "High"),
            ({"item_severity": "Nonsense", "cached_severity": "High"}, "High"),
            ({"item_severity": "Medium", "cached_severity": "Nonsense"}, "Medium"),
            ({"item_severity": "Medium", "cached_severity": "Low"}, "Medium"),
            ({"item_severity": "Nonsense", "cached_severity": ""}, "Nonsense"),
            ({"item_severity": "", "cached_severity": "Nonsense"}, ""),
        ]

        for test_case in test_cases:
            with self.subTest(test_case=test_case):
                actual = _most_severe(test_case[0]["item_severity"], test_case[0]["cached_severity"])
                self.assertEqual(actual, test_case[1])

    def test_get_summary_count(self):
        actual = _get_summary_count(test_vulns_a)
        self.assertEqual(actual, summary_a)

    def test_merge_file_str(self):
        actual = _merge_vuln(merge_it_a, merge_it_b, "plugin2")
        expect = {
            "source": ["file_string.txt", "file.txt"],
            "severity": "high",
            "description": "some desc",
            "remediation": "some remed",
            "source_plugins": ["plugin1", "plugin2"],
        }

        self.assertEqual(actual["severity"], expect["severity"])
        self.assertEqual(actual["description"], expect["description"])
        self.assertEqual(actual["remediation"], expect["remediation"])
        self.assertCountEqual(actual["source"], expect["source"])
        self.assertEqual(actual["source_plugins"], expect["source_plugins"])

    def test_merge_list_source(self):
        actual = _merge_vuln(merge_it_c, merge_it_d, "plugin2")
        expect = {
            "source": ["file.txt", "a.txt", "b.txt"],
            "severity": "medium",
            "description": "some desc",
            "remediation": "some remed",
            "source_plugins": ["plugin1", "plugin2"],
        }
        self.assertEqual(actual["severity"], expect["severity"])
        self.assertEqual(actual["description"], expect["description"])
        self.assertEqual(actual["remediation"], expect["remediation"])
        self.assertCountEqual(actual["source"], expect["source"])
        self.assertEqual(actual["source_plugins"], expect["source_plugins"])
