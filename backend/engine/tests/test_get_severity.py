import unittest
import pytest
from engine.plugins.lib import utils, nvd_utils

logger = utils.setup_logging("test_utils")


class TestGetSeverity(unittest.TestCase):
    @pytest.mark.integtest
    def test_get_cve_severity_success(self):
        test_cve = "CVE-2016-5385"
        expected_result = "high"

        result = nvd_utils.get_cve_severity(test_cve, logger)

        self.assertEqual(expected_result, result)

    def test_get_cve_severity_empty_cve(self):
        test_cve = ""
        expected_result = None

        result = nvd_utils.get_cve_severity(test_cve, logger)

        self.assertEqual(expected_result, result)

    def test_get_cve_severity_partial_cve(self):
        test_cve = "cve_187"
        expected_result = None

        result = nvd_utils.get_cve_severity(test_cve, logger)

        self.assertEqual(expected_result, result)
