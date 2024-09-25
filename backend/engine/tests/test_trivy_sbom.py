import json
import os.path
import unittest
import pytest
import secrets
from docker import builder, remover
from subprocess import CompletedProcess
from unittest.mock import patch
from engine.plugins.trivy_sbom import main as Trivy
from engine.plugins.lib.sbom_common.go_installer import go_mod_download
from engine.plugins.lib.sbom_common.yarn_installer import yarn_install
from engine.plugins.lib.utils import convert_string_to_json
from engine.plugins.lib.utils import setup_logging

logger = setup_logging("trivy_sbom_test")

TEST_DIR = os.path.dirname(os.path.abspath(__file__))

TEST_ROOT = os.path.abspath(os.path.join(TEST_DIR, "..", ".."))

DOWNLOAD_GO_PREFIX = "engine.plugins.lib.sbom_common.go_installer."

DOWNLOAD_YARN_PREFIX = "engine.plugins.lib.sbom_common.yarn_installer."

TEST_DATA = os.path.join(TEST_DIR, "data")

TRIVY_DATA = os.path.join(TEST_DATA, "trivy")

TEST_OUTPUT = os.path.join(TRIVY_DATA, "demo-results.json")

TEST_IMAGE = os.path.join(TEST_DATA, "image", "test_file_for_docker")

TEST_CHECK_OUTPUT_SBOM_FILE = {
    "$schema": "http://cyclonedx.org/schema/bom-1.5.schema.json",
    "bomFormat": "CycloneDX",
    "specVersion": "1.5",
    "serialNumber": "urn:uuid:51f14561-5344-43f4-9ed5-d7ac6386df7f",
    "version": 1,
    "metadata": {
        "timestamp": "2024-02-01T15:14:54+00:00",
        "tools": [{"vendor": "aquasecurity", "name": "trivy", "version": "0.49.1"}],
        "component": {
            "bom-ref": "7a718bdf-33b2-40b3-aae1-9f79ec8b4145",
            "type": "application",
            "name": ".",
            "properties": [{"name": "aquasecurity:trivy:SchemaVersion", "value": "2"}],
        },
    },
    "components": [
        {
            "bom-ref": "pkg",
            "type": "library",
            "name": "test",
            "version": "0.16.2",
            "licenses": [{"license": {"name": "MIT"}}],
            "purl": "pkgurl",
            "properties": [
                {"name": "aquasecurity:trivy:PkgID", "value": "pkgtestID"},
                {"name": "aquasecurity:trivy:PkgType", "value": "npm"},
            ],
        }
    ],
    "dependencies": [
        {
            "ref": "56a86101-8c62-4e28-8abf-c583dfbc6ddd",
            "dependsOn": ["test_data1", "test_data2", "test_data3", "test_data4", "test_data5", "test_data6"],
        }
    ],
    "vulnerabilities": [],
}
TEST_CHECK_OUTPUT_SBOM_FILE_PARSED = [
    {"bom-ref": "pkg", "name": "test", "version": "0.16.2", "licenses": [{"id": "MIT", "name": "MIT"}], "type": "npm"}
]

TEST_CHECK_OUTPUT_SBOM_FILE_PARSED_WITH_GROUP = [
    {
        "bom-ref": "pkg",
        "name": "@test-group/test",
        "version": "0.16.2",
        "licenses": [{"id": "MIT", "name": "MIT"}],
        "type": "npm",
    }
]

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

    def test_go_download(self):
        with patch(f"{DOWNLOAD_GO_PREFIX}glob") as mock_glob:
            mock_glob.return_value = ["/mocked/path/go.mod"]
            with patch(f"{DOWNLOAD_GO_PREFIX}subprocess.run") as mock_proc:
                mock_proc.stderr = mock_proc.stdout = None
                mock_proc.return_value = CompletedProcess(args="", returncode=0)
                actual = go_mod_download("/mocked/path/")
        self.assertEqual(len(actual[1]), 1, "There should be a warning of a go.mod file being downloaded")

    def test_yarn_download(self):
        with patch(f"{DOWNLOAD_YARN_PREFIX}glob") as mock_glob:
            mock_glob.return_value = ["/mocked/path/yarn.lock"]
            with patch(f"{DOWNLOAD_YARN_PREFIX}subprocess.run") as mock_proc:
                mock_proc.stderr = mock_proc.stdout = None
                mock_proc.return_value = CompletedProcess(args="", returncode=0)
                actual = yarn_install("/mocked/path/")
        self.assertEqual(len(actual[1]), 1, "There should be a warning of a yarn.lock file being downloaded")

    def test_parser(self):
        check_parsed_output = Trivy.clean_output_application_sbom(TEST_CHECK_OUTPUT_SBOM_FILE)
        self.assertEqual(check_parsed_output, TEST_CHECK_OUTPUT_SBOM_FILE_PARSED)

    def test_parser_with_group_field(self):
        cyclone_dx_json = TEST_CHECK_OUTPUT_SBOM_FILE.copy()
        cyclone_dx_json["components"][0]["group"] = "@test-group"
        parsed_json = Trivy.clean_output_application_sbom(cyclone_dx_json)
        self.assertEqual(parsed_json, cyclone_dx_json)


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
        response = Trivy.execute_trivy_image_sbom("test-docker-doesnt-exist-t-1000")
        result = convert_string_to_json(response, logger)
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

    @pytest.mark.integtest
    def test_execute_trivy_no_files(self):
        result = Trivy.execute_trivy_application_sbom(os.path.abspath(os.path.join(TRIVY_DATA, "no_files")))
        self.assertEqual(None, result)

    @pytest.mark.integtest
    def test_execute_trivy_success(self):
        result = Trivy.execute_trivy_application_sbom(TEST_ROOT)
        self.assertIsInstance(result, str)

    @pytest.mark.integtest
    def test_convert_output_success(self):
        response = Trivy.execute_trivy_application_sbom(TEST_ROOT)
        result = convert_string_to_json(response, logger)
        self.assertNotIn(result, [[], None])
        self.assertIsInstance(result, list)
