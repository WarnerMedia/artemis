import json
import os.path
import secrets
import unittest

import pytest

from docker import builder, remover
from engine.plugins.trivy import main as Trivy

TEST_DIR = os.path.dirname(os.path.abspath(__file__))

NODE_DIR = os.path.join(TEST_DIR, "data", "node")

TEST_ROOT = os.path.abspath(os.path.join(TEST_DIR, "..", ".."))

TEST_DATA = os.path.join(TEST_DIR, "data")

TRIVY_DATA = os.path.join(TEST_DATA, "trivy")

TEST_OUTPUT = os.path.join(TRIVY_DATA, "demo-results.json")

TEST_IMAGE = os.path.join(TEST_DATA, "image", "test_file_for_docker")


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
            "component": {"name": "libcrypto1.1", "version": "1.1.1i-r0", "type": "alpine"},
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
