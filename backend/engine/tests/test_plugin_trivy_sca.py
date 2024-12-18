import json
import os.path
import unittest
import pytest

from subprocess import CompletedProcess
from unittest.mock import patch
from oci import remover
from engine.plugins.trivy_sca import main as Trivy
from engine.plugins.lib.trivy_common.generate_locks import check_package_files
from engine.plugins.lib.utils import convert_string_to_json
from engine.plugins.lib.utils import setup_logging

logger = setup_logging("trivy_sca_test")

TEST_DIR = os.path.dirname(os.path.abspath(__file__))

NODE_DIR = os.path.join(TEST_DIR, "data", "node")

TEST_ROOT = os.path.abspath(os.path.join(TEST_DIR, "..", ".."))
GENERATE_LOCKS_PREFIX = "engine.plugins.lib.trivy_common.generate_locks."

TEST_DATA = os.path.join(TEST_DIR, "data")

TRIVY_DATA = os.path.join(TEST_DATA, "trivy")

TEST_OUTPUT = os.path.join(TRIVY_DATA, "demo-results.json")

TEST_CHECK_OUTPUT_GEMLOCK_FILE = {
    "component": "rest-client-1.7.3",
    "source": "ruby/dependency_vulnerability_samples/Gemfile.lock",
    "id": "CVE-2015-1820",
    "description": "REST client for Ruby (aka rest-client) before 1.8.0 allows remote attackers to conduct session "
    "fixation attacks or obtain sensitive cookie information by leveraging passage of cookies set in a "
    "response to a redirect.",
    "severity": "critical",
    "remediation": "Fixed Version: 1.8.0.",
    "inventory": {
        "component": {"name": "rest-client", "version": "1.7.3", "type": "gem"},
        "advisory_ids": [
            "CVE-2015-1820",
            "http://www.openwall.com/lists/oss-security/2015/03/24/3",
            "http://www.securityfocus.com/bid/73295",
            "https://avd.aquasec.com/nvd/cve-2015-1820",
            "https://bugzilla.redhat.com/show_bug.cgi?id=1205291",
            "https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2015-1820",
            "https://github.com/advisories/GHSA-3fhf-6939-qg8p",
            "https://github.com/rest-client/rest-client/issues/369",
            "https://nvd.nist.gov/vuln/detail/CVE-2015-1820",
        ],
    },
}

TEST_CHECK_OUTPUT_PACKAGE_LOCK = {
    "component": "braces-1.8.5",
    "source": "node/dependency_vulnerability_samples/package-lock.json",
    "id": "GHSA-g95f-p29q-9xw4",
    "description": "Versions of `braces` prior to 2.3.1 are vulnerable to Regular Expression Denial of Service ("
    "ReDoS). Untrusted input may cause catastrophic backtracking while matching regular expressions. "
    "This can cause the application to be unresponsive leading to Denial of Service.",
    "severity": "low",
    "remediation": "Fixed Version: 2.3.1. Upgrade to version 2.3.1 or higher.",
    "inventory": {
        "component": {"name": "braces", "version": "1.8.5", "type": "npm"},
        "advisory_ids": [
            "GHSA-g95f-p29q-9xw4",
            "https://github.com/advisories/GHSA-g95f-p29q-9xw4",
            "https://github.com/micromatch/braces/commit/abdafb0cae1e0c00f184abbadc692f4eaa98f451",
        ],
    },
}

TEST_VULN_LOCK_FILE_DICT = {
    "Target": "node/dependency_vulnerability_samples/package-lock.json",
    "Type": "npm",
    "Vulnerabilities": [
        {
            "VulnerabilityID": "GHSA-g95f-p29q-9xw4",
            "PkgName": "braces",
            "InstalledVersion": "1.8.5",
            "FixedVersion": "2.3.1",
            "PrimaryURL": "https://github.com/advisories/GHSA-g95f-p29q-9xw4",
            "Title": "Regular Expression Denial of Service in braces",
            "Description": "Versions of `braces` prior to 2.3.1 are vulnerable to Regular Expression Denial of "
            "Service (ReDoS). Untrusted input may cause catastrophic backtracking while matching "
            "regular expressions. This can cause the application to be unresponsive leading to Denial "
            "of Service.\n\n\n## Recommendation\n\nUpgrade to version 2.3.1 or higher.",
            "Severity": "LOW",
            "References": [
                "https://github.com/advisories/GHSA-g95f-p29q-9xw4",
                "https://github.com/micromatch/braces/commit/abdafb0cae1e0c00f184abbadc692f4eaa98f451",
            ],
        }
    ],
}

ARTEMIS_VULN = [{"Target": "Gemfile.lock", "Type": "bundler", "Vulnerabilities": None}]

TEST_BUILD_SCAN_PARSE_RESULT_DICT = {
    "component": "libcrypto1.1-1.1.1g-r0",
    "source": "/image/test_file_for_docker",
    "id": "CVE-2021-23839",
    "description": "",
    "severity": "low",
    "remediation": "Fixed Version: 1.1.1j-r0.",
}


class TestPluginTrivySCA(unittest.TestCase):
    def setUp(self) -> None:
        with open(TEST_OUTPUT) as output_file:
            self.demo_results_dict = json.load(output_file)

    def test_lock_file_exists(self):
        with patch(f"{GENERATE_LOCKS_PREFIX}glob") as mock_glob:
            mock_glob.return_value = ["/mocked/path/package.json"]
            with patch(f"{GENERATE_LOCKS_PREFIX}handle_npmrc_creation"):
                with patch(f"{GENERATE_LOCKS_PREFIX}os.path.exists", return_value=True):
                    with patch(f"{GENERATE_LOCKS_PREFIX}subprocess.run") as mock_proc:
                        mock_proc.stderr = mock_proc.stdout = None
                        mock_proc.return_value = CompletedProcess(args="", returncode=0)
                        actual = check_package_files("/mocked/path/", False, False)
        self.assertEqual(len(actual[1]), 0, "There should NOT be a warning of a lock file missing")

    def test_lock_file_missing(self):
        with patch(f"{GENERATE_LOCKS_PREFIX}glob") as mock_glob:
            mock_glob.return_value = ["/mocked/path/package.json"]
            with patch(f"{GENERATE_LOCKS_PREFIX}handle_npmrc_creation"):
                with patch(f"{GENERATE_LOCKS_PREFIX}os.path.exists", return_value=False):
                    with patch(f"{GENERATE_LOCKS_PREFIX}subprocess.run") as mock_proc:
                        mock_proc.stderr = mock_proc.stdout = None
                        mock_proc.return_value = CompletedProcess(args="", returncode=0)
                        actual = check_package_files("/mocked/path/", False, False)
        self.assertEqual(len(actual[1]), 1, "There should be a warning of a lock file missing")

    def test_check_output(self):
        check_output_list = Trivy.parse_output(self.demo_results_dict)
        self.assertIn(TEST_CHECK_OUTPUT_PACKAGE_LOCK, check_output_list)
        self.assertIn(TEST_CHECK_OUTPUT_GEMLOCK_FILE, check_output_list)

    def test_check_output_no_results(self):
        check_output_list = Trivy.parse_output(None)
        self.assertEqual([], check_output_list)

    def test_parse_output_one_file(self):
        result = Trivy.parse_output([TEST_VULN_LOCK_FILE_DICT])
        self.assertEqual([TEST_CHECK_OUTPUT_PACKAGE_LOCK], result)


@pytest.mark.integtest
class TestPluginTrivySCAIntegration(unittest.TestCase):
    def tearDown(self) -> None:
        for image in self.images["results"]:
            remover.remove_docker_image(image)

    @pytest.mark.integtest
    def test_execute_trivy_no_files(self):
        result = Trivy.execute_trivy_lock_scan(os.path.abspath(os.path.join(TRIVY_DATA, "no_files")))
        self.assertEqual(None, result)

    @pytest.mark.integtest
    def test_execute_trivy_success(self):
        result = Trivy.execute_trivy_lock_scan(TEST_ROOT)
        self.assertIsInstance(result, str)

    @pytest.mark.integtest
    def test_convert_output_success(self):
        response = Trivy.execute_trivy_lock_scan(TEST_ROOT)
        result = convert_string_to_json(response, logger)
        self.assertNotIn(result, [[], None])
        self.assertIsInstance(result, list)

    @pytest.mark.integtest
    def test_convert_output_output_correct(self):
        self.maxDiff = None
        response = Trivy.execute_trivy_lock_scan(TRIVY_DATA)
        result = convert_string_to_json(response, logger)
        self.assertIsInstance(result[0]["Vulnerabilities"], list)
        result[0]["Vulnerabilities"] = None
        self.assertEqual(ARTEMIS_VULN, result)
