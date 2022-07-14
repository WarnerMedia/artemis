import json
import os.path
import secrets
import unittest

import pytest

from docker import builder, remover
from engine.plugins.trivy import main as Trivy

TEST_DIR = os.path.dirname(os.path.abspath(__file__))

TEST_ROOT = os.path.abspath(os.path.join(TEST_DIR, "..", ".."))

TEST_DATA = os.path.join(TEST_DIR, "data")

TRIVY_DATA = os.path.join(TEST_DATA, "trivy")

TEST_OUTPUT = os.path.join(TRIVY_DATA, "demo-results.json")

TEST_IMAGE = os.path.join(TEST_DATA, "image", "test_file_for_docker")

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
        "component": {"name": "rest-client", "version": "1.7.3"},
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
        "component": {"name": "braces", "version": "1.8.5"},
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

TEST_IMAGE_VULN_DICT = {
    "Target": "test-docker-dcff6ea60ec3cbae155abaed414c033b-t-1000 (alpine 3.12.3)",
    "Type": "alpine",
    "Vulnerabilities": [
        {
            "VulnerabilityID": "CVE-2021-23839",
            "PkgName": "libcrypto1.1",
            "InstalledVersion": "1.1.1i-r0",
            "FixedVersion": "1.1.1j-r0",
            "Layer": {"DiffID": "sha256:777b2c648970480f50f5b4d0af8f9a8ea798eea43dbcf40ce4a8c7118736bdcf"},
            "SeveritySource": "nvd",
            "PrimaryURL": "https://avd.aquasec.com/nvd/cve-2021-23839",
            "Title": "openssl: incorrect SSLv2 rollback protection",
            "Description": "OpenSSL 1.0.2 supports SSLv2. If a client attempts to negotiate SSLv2...",
            "Severity": "HIGH",
            "CweIDs": ["CWE-326"],
            "CVSS": {
                "nvd": {
                    "V2Vector": "AV:N/AC:L/Au:N/C:N/I:P/A:N",
                    "V3Vector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:H/A:N",
                    "V2Score": 5,
                    "V3Score": 7.5,
                },
                "redhat": {"V3Vector": "CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:N/I:L/A:N", "V3Score": 3.7},
            },
            "References": [
                "https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2021-23839",
                "https://git.openssl.org/gitweb/?p=openssl.git;a=commitdiff;h=30919ab80a478f2d81f2e9acdcca3fa4740cd547",
                "https://security.netapp.com/advisory/ntap-20210219-0009/",
                "https://www.openssl.org/news/secadv/20210216.txt",
            ],
            "PublishedDate": "2021-02-16T17:15:00Z",
            "LastModifiedDate": "2021-02-24T00:56:00Z",
        }
    ],
}

TEST_IMAGE_VULN_RESULT = [
    {
        "component": "libcrypto1.1-1.1.1i-r0",
        "description": "OpenSSL 1.0.2 supports SSLv2. If a client attempts to " "negotiate SSLv2...",
        "id": "CVE-2021-23839",
        "remediation": "Fixed Version: 1.1.1j-r0.",
        "severity": "high",
        "source": "test-docker-dcff6ea60ec3cbae155abaed414c033b-t-1000 (alpine " "3.12.3)",
        "inventory": {
            "component": {"name": "libcrypto1.1", "version": "1.1.1i-r0"},
            "advisory_ids": [
                "CVE-2021-23839",
                "https://avd.aquasec.com/nvd/cve-2021-23839",
                "https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2021-23839",
                "https://git.openssl.org/gitweb/?p=openssl.git;a=commitdiff;h=30919ab80a478f2d81f2e9acdcca3fa4740cd547",
                "https://security.netapp.com/advisory/ntap-20210219-0009/",
                "https://www.openssl.org/news/secadv/20210216.txt",
            ],
        },
    }
]

ARTEMIS_VULN = [{"Target": "Gemfile.lock", "Type": "bundler", "Vulnerabilities": None}]

TEST_BUILD_SCAN_PARSE_RESULT_DICT = {
    "component": "libcrypto1.1-1.1.1g-r0",
    "source": "/image/test_file_for_docker",
    "id": "CVE-2021-23839",
    "description": "",
    "severity": "low",
    "remediation": "Fixed Version: 1.1.1j-r0.",
}


class TestTrivy(unittest.TestCase):
    def setUp(self) -> None:
        with open(TEST_OUTPUT) as output_file:
            self.demo_results_dict = json.load(output_file)

    def test_check_output(self):
        check_output_list = Trivy.parse_output(self.demo_results_dict)
        self.assertIn(TEST_CHECK_OUTPUT_PACKAGE_LOCK, check_output_list)
        self.assertIn(TEST_CHECK_OUTPUT_GEMLOCK_FILE, check_output_list)

    def test_parse_output_one_file(self):
        result = Trivy.parse_output([TEST_VULN_LOCK_FILE_DICT])
        self.assertEqual([TEST_CHECK_OUTPUT_PACKAGE_LOCK], result)

    def test_parse_output_image_output(self):
        result = Trivy.parse_output([TEST_IMAGE_VULN_DICT])
        self.assertEqual(TEST_IMAGE_VULN_RESULT, result)


@pytest.mark.integtest
class TestTrivyIntegration(unittest.TestCase):
    def setUp(self) -> None:
        image_builder = builder.ImageBuilder(".", "trivy-test", None, "00000")
        results = [image_builder.build_local_image(TEST_IMAGE, secrets.token_hex(16))]

        # Return the results
        self.images = {"results": results, "dockerfile_count": 1}

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
        result = Trivy.convert_output(response)
        self.assertNotIn(result, [[], None])
        self.assertIsInstance(result, list)

    @pytest.mark.integtest
    def test_convert_output_output_correct(self):
        self.maxDiff = None
        response = Trivy.execute_trivy_lock_scan(TRIVY_DATA)
        result = Trivy.convert_output(response)
        self.assertIsInstance(result[0]["Vulnerabilities"], list)
        result[0]["Vulnerabilities"] = None
        self.assertEqual(ARTEMIS_VULN, result)

    @pytest.mark.integtest
    def test_execute_trivy_image_no_image(self):
        response = Trivy.execute_trivy_image_scan("test-docker-doesnt-exist-t-1000")
        result = Trivy.convert_output(response)
        self.assertIsNone(result)

    @pytest.mark.integtest
    def test_build_scan_parse_images(self):
        results = Trivy.build_scan_parse_images(self.images)
        replace_root = TEST_DATA
        if replace_root.startswith("/"):
            replace_root = replace_root[1:]

        for result in results:
            if result["component"] == "libcrypto1.1-1.1.1g-r0" and result["id"] == "CVE-2021-23839":
                result["description"] = ""
                result["source"] = result["source"].replace(replace_root, "")
                self.assertEqual(TEST_BUILD_SCAN_PARSE_RESULT_DICT["source"], result["source"])
                self.assertEqual(TEST_BUILD_SCAN_PARSE_RESULT_DICT, result)
                return
        self.fail(f"Result not found and verified: {results}")
