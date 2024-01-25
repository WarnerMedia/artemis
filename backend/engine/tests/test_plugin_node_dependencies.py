import os
import unittest
from subprocess import CompletedProcess
from tempfile import TemporaryDirectory
from unittest.mock import patch

import pytest

from engine.plugins.lib import utils
from engine.plugins.lib.cve import find_cves
from engine.plugins.lib.line_numbers.resolver import LineNumberResolver
from engine.plugins.lib import write_npmrc
from engine.plugins.node_dependencies.audit import npm_audit
from engine.plugins.node_dependencies.main import _extract_advisories, _load_lockfile
from engine.plugins.node_dependencies.parse import _find_versions_v1, _find_versions_v2, parse_advisory

log = utils.setup_logging("node_dependencies")

AUDIT_PREFIX = "engine.plugins.node_dependencies.audit."
CVE_PREFIX = "engine.plugins.node_dependencies.parse."

TEST_DIR = os.path.dirname(os.path.abspath(__file__))
NODE_DIR = os.path.join(TEST_DIR, "data", "node")
TEST_PACKAGE_FILE = os.path.join(NODE_DIR, "package.json")
TEST_LOCKFILE_V1 = os.path.join(NODE_DIR, "v1", "package-lock.json")
TEST_LOCKFILE_V2 = os.path.join(NODE_DIR, "v2", "package-lock.json")
TEST_PACKAGE_FILE_RELATIVE = TEST_PACKAGE_FILE.replace(f"{TEST_DIR}", "")
TEST_LOCKFILE_V1_RELATIVE = TEST_LOCKFILE_V1.replace(f"{TEST_DIR}", "")
TEST_LOCKFILE_V2_RELATIVE = TEST_LOCKFILE_V2.replace(f"{TEST_DIR}", "")

# NPM 7.x audit JSON advisory
ADV = {
    "name": "pkg3",
    "severity": "high",
    "via": [
        {
            "source": 1,
            "name": "pkg3",
            "dependency": "pkg3",
            "title": "Test vuln 1",
            "url": "https://npmjs.com/advisories/1",
            "severity": "high",
            "range": "<2.0.0",
        },
        {
            "source": 2,
            "name": "pkg3",
            "dependency": "pkg3",
            "title": "Test vuln 2",
            "url": "https://npmjs.com/advisories/2",
            "severity": "high",
            "range": "<2.0.0",
        },
    ],
    "effects": [],
    "range": "<2.0.0",
    "nodes": ["node_modules/pkg3", "node_modules/pkg2/node_modules/pkg3"],
    "fixAvailable": False,
}

TEST_SCOPE_CONFIG = [
    {
        "username": "user",
        "password": "I'm not a password",
        "email": "email@example.com",
        "token": "I am a password",
        "scope": "scope1",
        "registry": "irregistryforscope1",
    },
    {
        "username": "user",
        "password": "I'm not a password",
        "email": "email@example.com",
        "token": "I am a password",
        "scope": "scope2",
        "registry": "irregistryforscope2",
    },
]

VERSION_HEADER_LIST = ["path", "version", "integrity", "dev", "filename", "line"]
NPM_CONFIG_HEADER_LIST = ["scope", "registry", "token", "username", "email"]


def create_expected_dict(header_list, value_lists):
    result = []
    for v_list in value_lists:
        sub_list = {}
        for index in range(len(header_list)):
            sub_list[header_list[index]] = v_list[index]
        result.append(sub_list)
    if len(result) == 1:
        return result[0]
    return result


class TestNodeDependencyPlugin(unittest.TestCase):
    def setUp(self) -> None:
        from artemislib.db_cache import DBLookupCache

        # Set up the cache with a dummy item model class so that it doesn't hit the database during testing
        _ = DBLookupCache(cache_item_model=object)

    def test_npm_audit_file_exists(self):
        with patch(f"{AUDIT_PREFIX}os.path.exists", return_value=True):
            with patch(f"{AUDIT_PREFIX}subprocess.run") as mock_proc:
                mock_proc.stderr = mock_proc.stdout = None
                mock_proc.return_value = CompletedProcess(args="", returncode=0)

                actual = npm_audit("foo")

        self.assertNotIn("warning", actual["results"])
        self.assertFalse(actual["lockfile_missing"])

    def test_npm_audit_file_missing(self):
        with patch(f"{AUDIT_PREFIX}os.path.exists", return_value=False):
            with patch(f"{AUDIT_PREFIX}subprocess.run") as mock_proc:
                mock_proc.stderr = mock_proc.stdout = None
                mock_proc.return_value = CompletedProcess(args="", returncode=0)

                actual = npm_audit("foo")

        self.assertIn("warning", actual["results"])
        expected_msg = (
            "No package-lock.json file was found in path foo. "
            "Please consider creating a package-lock file for this project."
        )
        self.assertEqual(actual["results"]["warning"], expected_msg)
        self.assertTrue(actual["lockfile_missing"])

    def test_extract_advisories(self):
        # Basic structure of the NPM 7.x audit JSON output
        audit = {
            "auditReportVersion": 2,
            "vulnerabilities": {
                "pkg1": {"name": "pkg1", "via": [{}]},
                "pkg2": {"name": "pkg2", "via": [{}]},
                "pkg3": {"name": "pkg3", "via": ["pkg2"]},  # This one is ignored because it is an intermediate
            },
            "metadata": {},
        }
        expected = [{"name": "pkg1", "via": [{}]}, {"name": "pkg2", "via": [{}]}]
        actual = _extract_advisories(audit)
        self.assertListEqual(actual, expected)

    def test_load_lines_lockfile_v1(self):
        resolver = LineNumberResolver(TEST_LOCKFILE_V1)
        expected = {
            "sha512-deadbeef": {"filename": TEST_LOCKFILE_V1, "line": 10},
            "sha512-abcd1234": {"filename": TEST_LOCKFILE_V1, "line": 15},
            "sha512-5678abcd": {"filename": TEST_LOCKFILE_V1, "line": 20},
            "sha512-1234abcd": {"filename": TEST_LOCKFILE_V1, "line": 27},
            "sha512-5678aaaa": {"filename": TEST_LOCKFILE_V1, "line": 33},
        }
        self.assertDictEqual(resolver.resolvers[resolver.default_filename].lines, expected)

    def test_load_lines_lockfile_v2(self):
        resolver = LineNumberResolver(TEST_LOCKFILE_V2)
        expected = {
            "sha512-deadbeef": {"filename": TEST_LOCKFILE_V2, "line": 10},
            "sha512-abcd1234": {"filename": TEST_LOCKFILE_V2, "line": 15},
            "sha512-1234abcd": {"filename": TEST_LOCKFILE_V2, "line": 20},
            "sha512-5678abcd": {"filename": TEST_LOCKFILE_V2, "line": 26},
        }
        self.assertDictEqual(resolver.resolvers[resolver.default_filename].lines, expected)

    def test_load_lines_package_file(self):
        resolver = LineNumberResolver(TEST_PACKAGE_FILE)
        expected = {
            "pkg1": {"filename": TEST_PACKAGE_FILE, "line": 8},
            "pkg2": {"filename": TEST_PACKAGE_FILE, "line": 9},
            "pkg3": {"filename": TEST_PACKAGE_FILE, "line": 16},
        }
        self.assertDictEqual(resolver.resolvers[resolver.default_filename].lines, expected)

    def test_find_lines_package_file(self):
        resolver = LineNumberResolver(TEST_PACKAGE_FILE)
        expected = {"filename": TEST_PACKAGE_FILE, "line": 9}
        actual = resolver.find("pkg2>pkg3")
        self.assertDictEqual(actual, expected)

    def test_find_lines_lockfile(self):
        resolver = LineNumberResolver(TEST_LOCKFILE_V2)
        expected = {"filename": TEST_LOCKFILE_V2, "line": 15}
        actual = resolver.find("sha512-abcd1234")
        self.assertDictEqual(actual, expected)

    def test_find_versions_v1(self):
        lockfile = _load_lockfile(TEST_LOCKFILE_V1)
        component = "pkg3"
        resolver = LineNumberResolver(TEST_LOCKFILE_V1)
        expected = create_expected_dict(
            VERSION_HEADER_LIST,
            [
                ["pkg3", "1.0.0", "sha512-1234abcd", True, TEST_LOCKFILE_V1, 27],
                ["pkg2>pkg3", "1.0.1", "sha512-5678abcd", False, TEST_LOCKFILE_V1, 20],
            ],
        )
        actual = _find_versions_v1(lockfile, component, resolver)
        self.assertListEqual(actual, expected)

    def test_find_versions_v1_bundled(self):
        lockfile = _load_lockfile(TEST_LOCKFILE_V1)
        component = "pkg5"
        resolver = LineNumberResolver(TEST_LOCKFILE_V1)
        expected = create_expected_dict(
            VERSION_HEADER_LIST,
            [
                ["pkg4>pkg5", "1.0.2", "sha512-5678aaaa", False, TEST_LOCKFILE_V1, 33],
            ],
        )
        actual = _find_versions_v1(lockfile, component, resolver)
        self.assertListEqual(actual, [expected])

    def test_find_versions_v2(self):
        lockfile = _load_lockfile(TEST_LOCKFILE_V2)
        nodes = ["node_modules/pkg1", "node_modules/pkg2", "node_modules/pkg3", "node_modules/pkg2/node_modules/pkg3"]
        resolver = LineNumberResolver(TEST_LOCKFILE_V2)
        expected = create_expected_dict(
            VERSION_HEADER_LIST,
            [
                ["pkg1", "1.0.0", "sha512-deadbeef", False, TEST_LOCKFILE_V2, 10],
                ["pkg2", "1.0.0", "sha512-abcd1234", False, TEST_LOCKFILE_V2, 15],
                ["pkg3", "1.0.0", "sha512-1234abcd", True, TEST_LOCKFILE_V2, 20],
                ["pkg2>pkg3", "1.0.1", "sha512-5678abcd", False, TEST_LOCKFILE_V2, 26],
            ],
        )
        actual = _find_versions_v2(lockfile, nodes, resolver)
        self.assertListEqual(actual, expected)

    def test_parse_advisory_v2_lockfile_v1(self):
        self.maxDiff = None
        package_file = "package.json"
        lockfile = _load_lockfile(TEST_LOCKFILE_V1)
        resolver = LineNumberResolver(TEST_LOCKFILE_V1)

        expected = [
            {
                "component": "pkg3-1.0.0",
                "source": "package.json: pkg3",
                "id": "CVE-0000-0000",
                "description": "Test vuln 1",
                "severity": "high",
                "remediation": "",
                "filename": TEST_LOCKFILE_V1_RELATIVE,
                "line": 27,
                "inventory": {
                    "component": {"name": "pkg3", "version": "1.0.0", "type": "npm"},
                    "advisory_ids": [
                        "CVE-0000-0000",
                        "https://npmjs.com/advisories/1",
                    ],
                },
            },
            {
                "component": "pkg3-1.0.1",
                "source": "package.json: pkg2>pkg3",
                "id": "CVE-0000-0000",
                "description": "Test vuln 1",
                "severity": "high",
                "remediation": "",
                "filename": TEST_LOCKFILE_V1_RELATIVE,
                "line": 20,
                "inventory": {
                    "component": {"name": "pkg3", "version": "1.0.1", "type": "npm"},
                    "advisory_ids": [
                        "CVE-0000-0000",
                        "https://npmjs.com/advisories/1",
                    ],
                },
            },
            {
                "component": "pkg3-1.0.0",
                "source": "package.json: pkg3",
                "id": "CVE-0000-0000",
                "description": "Test vuln 2",
                "severity": "high",
                "remediation": "",
                "filename": TEST_LOCKFILE_V1_RELATIVE,
                "line": 27,
                "inventory": {
                    "component": {"name": "pkg3", "version": "1.0.0", "type": "npm"},
                    "advisory_ids": [
                        "CVE-0000-0000",
                        "https://npmjs.com/advisories/2",
                    ],
                },
            },
            {
                "component": "pkg3-1.0.1",
                "source": "package.json: pkg2>pkg3",
                "id": "CVE-0000-0000",
                "description": "Test vuln 2",
                "severity": "high",
                "remediation": "",
                "filename": TEST_LOCKFILE_V1_RELATIVE,
                "line": 20,
                "inventory": {
                    "component": {"name": "pkg3", "version": "1.0.1", "type": "npm"},
                    "advisory_ids": [
                        "CVE-0000-0000",
                        "https://npmjs.com/advisories/2",
                    ],
                },
            },
        ]

        with patch(f"{CVE_PREFIX}find_cves", return_value=True) as mock_find_cves:
            mock_find_cves.return_value = ["CVE-0000-0000"]
            actual = parse_advisory(ADV, package_file, lockfile, resolver, TEST_DIR)

        self.assertListEqual(actual, expected)

    def test_parse_advisory_v2_lockfile_v2(self):
        self.maxDiff = None
        package_file = "package.json"

        lockfile = _load_lockfile(TEST_LOCKFILE_V2)
        resolver = LineNumberResolver(TEST_LOCKFILE_V2)

        expected = [
            {
                "component": "pkg3-1.0.0",
                "source": "package.json: pkg3",
                "id": "CVE-0000-0000",
                "description": "Test vuln 1",
                "severity": "high",
                "remediation": "",
                "filename": TEST_LOCKFILE_V2_RELATIVE,
                "line": 20,
                "inventory": {
                    "component": {"name": "pkg3", "version": "1.0.0", "type": "npm"},
                    "advisory_ids": [
                        "CVE-0000-0000",
                        "https://npmjs.com/advisories/1",
                    ],
                },
            },
            {
                "component": "pkg3-1.0.1",
                "source": "package.json: pkg2>pkg3",
                "id": "CVE-0000-0000",
                "description": "Test vuln 1",
                "severity": "high",
                "remediation": "",
                "filename": TEST_LOCKFILE_V2_RELATIVE,
                "line": 26,
                "inventory": {
                    "component": {"name": "pkg3", "version": "1.0.1", "type": "npm"},
                    "advisory_ids": [
                        "CVE-0000-0000",
                        "https://npmjs.com/advisories/1",
                    ],
                },
            },
            {
                "component": "pkg3-1.0.0",
                "source": "package.json: pkg3",
                "id": "CVE-0000-0000",
                "description": "Test vuln 2",
                "severity": "high",
                "remediation": "",
                "filename": TEST_LOCKFILE_V2_RELATIVE,
                "line": 20,
                "inventory": {
                    "component": {"name": "pkg3", "version": "1.0.0", "type": "npm"},
                    "advisory_ids": [
                        "CVE-0000-0000",
                        "https://npmjs.com/advisories/2",
                    ],
                },
            },
            {
                "component": "pkg3-1.0.1",
                "source": "package.json: pkg2>pkg3",
                "id": "CVE-0000-0000",
                "description": "Test vuln 2",
                "severity": "high",
                "remediation": "",
                "filename": TEST_LOCKFILE_V2_RELATIVE,
                "line": 26,
                "inventory": {
                    "component": {"name": "pkg3", "version": "1.0.1", "type": "npm"},
                    "advisory_ids": [
                        "CVE-0000-0000",
                        "https://npmjs.com/advisories/2",
                    ],
                },
            },
        ]

        with patch(f"{CVE_PREFIX}find_cves", return_value=True) as mock_find_cves:
            mock_find_cves.return_value = ["CVE-0000-0000"]
            actual = parse_advisory(ADV, package_file, lockfile, resolver, TEST_DIR)

        self.assertListEqual(actual, expected)

    def test_parse_advisory_v2_lockfile_v2_generated(self):
        self.maxDiff = None
        lockfile = _load_lockfile(TEST_LOCKFILE_V2)
        resolver = LineNumberResolver(TEST_PACKAGE_FILE)

        expected = [
            {
                "component": "pkg3-1.0.0",
                "source": f"{TEST_PACKAGE_FILE_RELATIVE}: pkg3",
                "id": "CVE-0000-0000",
                "description": "Test vuln 1",
                "severity": "high",
                "remediation": "",
                "filename": TEST_PACKAGE_FILE_RELATIVE,
                "line": 16,
                "inventory": {
                    "component": {"name": "pkg3", "version": "1.0.0", "type": "npm"},
                    "advisory_ids": [
                        "CVE-0000-0000",
                        "https://npmjs.com/advisories/1",
                    ],
                },
            },
            {
                "component": "pkg3-1.0.1",
                "source": f"{TEST_PACKAGE_FILE_RELATIVE}: pkg2>pkg3",
                "id": "CVE-0000-0000",
                "description": "Test vuln 1",
                "severity": "high",
                "remediation": "",
                "filename": TEST_PACKAGE_FILE_RELATIVE,
                "line": 9,
                "inventory": {
                    "component": {"name": "pkg3", "version": "1.0.1", "type": "npm"},
                    "advisory_ids": [
                        "CVE-0000-0000",
                        "https://npmjs.com/advisories/1",
                    ],
                },
            },
            {
                "component": "pkg3-1.0.0",
                "source": f"{TEST_PACKAGE_FILE_RELATIVE}: pkg3",
                "id": "CVE-0000-0000",
                "description": "Test vuln 2",
                "severity": "high",
                "remediation": "",
                "filename": TEST_PACKAGE_FILE_RELATIVE,
                "line": 16,
                "inventory": {
                    "component": {"name": "pkg3", "version": "1.0.0", "type": "npm"},
                    "advisory_ids": [
                        "CVE-0000-0000",
                        "https://npmjs.com/advisories/2",
                    ],
                },
            },
            {
                "component": "pkg3-1.0.1",
                "source": f"{TEST_PACKAGE_FILE_RELATIVE}: pkg2>pkg3",
                "id": "CVE-0000-0000",
                "description": "Test vuln 2",
                "severity": "high",
                "remediation": "",
                "filename": TEST_PACKAGE_FILE_RELATIVE,
                "line": 9,
                "inventory": {
                    "component": {"name": "pkg3", "version": "1.0.1", "type": "npm"},
                    "advisory_ids": [
                        "CVE-0000-0000",
                        "https://npmjs.com/advisories/2",
                    ],
                },
            },
        ]

        with patch(f"{CVE_PREFIX}find_cves", return_value=True) as mock_find_cves:
            mock_find_cves.return_value = ["CVE-0000-0000"]
            actual = parse_advisory(ADV, TEST_PACKAGE_FILE_RELATIVE, lockfile, resolver, TEST_DIR)

        self.assertListEqual(actual, expected)

    @pytest.mark.integtest
    def test_find_cves_in_cves(self):
        advisory_url = "https://www.npmjs.com/advisories/1"
        actual = find_cves(advisory_url)
        expected = ["CVE-2014-7205"]
        self.assertEqual(actual, expected)

    @pytest.mark.integtest
    def test_find_cves_in_references(self):
        advisory_url = "https://www.npmjs.com/advisories/1555"
        actual = find_cves(advisory_url)
        expected = ["CVE-2020-8244"]
        self.assertEqual(actual, expected)

    def test_write_npmrc(self):
        scope_list = create_expected_dict(
            NPM_CONFIG_HEADER_LIST,
            [["scope_1", "reg_1", "pass_1", "user_1", "email_1"], ["scope_2", "reg_2", "pass_2", "user_2", "email_2"]],
        )
        expected_result = write_npmrc.build_npm_config(**scope_list[0]) + write_npmrc.build_npm_config(**scope_list[1])

        with TemporaryDirectory() as working_dir:
            npmrc = os.path.join(working_dir, ".npmrc")
            write_npmrc.write_npmrc(log, npmrc, scope_list)
            with open(npmrc) as npm_file:
                result = npm_file.read()

        self.assertEqual(expected_result, result)

    @patch.object(write_npmrc, "get_scope_configs")
    def test_get_config_matches_in_packages_scope1(self, mock_creds):
        self.assertEqual(write_npmrc.get_scope_configs, mock_creds)
        mock_creds.return_value = TEST_SCOPE_CONFIG
        paths = {os.path.join(NODE_DIR, "private_scope", "scope1")}

        expected_result = [TEST_SCOPE_CONFIG[0]]

        result = write_npmrc.get_config_matches_in_packages(log, paths)

        self.assertEqual(expected_result, result)

    @patch.object(write_npmrc, "get_scope_configs")
    def test_get_config_matches_in_packages_scope2(self, mock_creds):
        self.assertEqual(write_npmrc.get_scope_configs, mock_creds)
        mock_creds.return_value = TEST_SCOPE_CONFIG
        paths = {os.path.join(NODE_DIR, "private_scope", "scope2")}

        expected_result = [TEST_SCOPE_CONFIG[1]]

        result = write_npmrc.get_config_matches_in_packages(log, paths)

        self.assertEqual(expected_result, result)

    @patch.object(write_npmrc, "get_scope_configs")
    def test_handle_npmrc_creation(self, mock_creds):
        self.assertEqual(write_npmrc.get_scope_configs, mock_creds)
        mock_creds.return_value = TEST_SCOPE_CONFIG
        paths = {os.path.join(NODE_DIR, "private_scope", "scope2")}

        expected_result = write_npmrc.build_npm_config(**TEST_SCOPE_CONFIG[1])

        with TemporaryDirectory() as working_dir:
            npmrc = os.path.join(working_dir, ".npmrc")
            write_npmrc.handle_npmrc_creation(log, paths, home_dir=working_dir)
            with open(npmrc) as npm_file:
                result = npm_file.read()

        self.assertEqual(expected_result, result)

    def test_handle_npmrc_creation_file_exists(self):
        result = write_npmrc.handle_npmrc_creation(log, set(), os.path.join(NODE_DIR, "private_scope"))

        self.assertFalse(result)

    @patch.object(write_npmrc, "get_scope_configs")
    def test_handle_npmrc_creation_file_no_private_packages(self, mock_creds):
        self.assertEqual(write_npmrc.get_scope_configs, mock_creds)
        mock_creds.return_value = TEST_SCOPE_CONFIG

        result = write_npmrc.handle_npmrc_creation(log, set(), NODE_DIR)

        self.assertFalse(result)
