import os
import unittest
from copy import deepcopy

from processor import scan_details

TEST_DETAILS_MIN = {"url": "test_url", "scan_id": "23498sdf"}

TEST_DETAILS_ALL = {
    "url": "test_url",
    "scan_id": "23498sdf",
    "branch": "test_branch",
    "public": False,
    "repo_size": 2340985,
    "plugins": ["trivy", "eslint"],
    "depth": 1000,
    "include_dev": True,
}


class TestClassDetails(unittest.TestCase):
    def setUp(self) -> None:
        self.plugin_path = f"{scan_details.ENGINE_DIR}/plugins"
        dirs = os.listdir(self.plugin_path)
        plugins = [d for d in dirs if os.path.isdir(os.path.join(self.plugin_path, d))]
        plugins.remove("lib")  # skip the lib directory which is not a plugin
        self.plugins = set(plugins)

    def test_scan_details_min(self):
        errors = []
        details = scan_details.ScanDetails(TEST_DETAILS_MIN)
        if details.url != TEST_DETAILS_MIN["url"]:
            errors.append("url not set correctly")
        if details.scan_id != TEST_DETAILS_MIN["scan_id"]:
            errors.append("scan_id not set correctly")
        if details.scan_working_dir != os.path.join(scan_details.WORKING_DIR, TEST_DETAILS_MIN["scan_id"]):
            errors.append("scan_working_dir not set correctly")
        if details.branch is not None:
            errors.append("branch not set correctly")
        if details.repo_size != 0:
            errors.append("repo_size not set correctly")
        if sorted(details.plugins) != sorted(self.plugins):
            errors.append("plugins not set correctly")
        if details.depth != scan_details.DEFAULT_DEPTH:
            errors.append("depth not set correctly")
        if details.include_dev != scan_details.DEFAULT_INCLUDE_DEV:
            errors.append("include_dev not set correctly")

        # assert no error message has been registered, else print messages
        self.assertEqual(errors, [], "errors occured:\n{}".format("\n".join(errors)))

    def test_scan_details_all(self):
        errors = []
        details = scan_details.ScanDetails(TEST_DETAILS_ALL)
        if details.url != TEST_DETAILS_ALL["url"]:
            errors.append("url not set correctly")
        if details.branch != TEST_DETAILS_ALL["branch"]:
            errors.append("branch not set correctly")
        if details.repo_size != TEST_DETAILS_ALL["repo_size"]:
            errors.append("repo_size not set correctly")
        if sorted(details.plugins) != sorted(TEST_DETAILS_ALL["plugins"]):
            errors.append("plugins not set correctly")
        if details.depth != TEST_DETAILS_ALL["depth"]:
            errors.append("depth not set correctly")
        if details.include_dev != TEST_DETAILS_ALL["include_dev"]:
            errors.append("include_dev not set correctly")

        # assert no error message has been registered, else print messages
        self.assertEqual(errors, [], "errors occured:\n{}".format("\n".join(errors)))

    def test_get_plugins_none(self):
        plugins = None
        expected_result = self.plugins
        result = scan_details._get_plugins(self.plugin_path, plugins)
        self.assertListEqual(sorted(expected_result), sorted(result))

    def test_get_plugins_include(self):
        plugins = ["eslint", "gosec"]
        expected_result = plugins
        result = scan_details._get_plugins(self.plugin_path, plugins)
        self.assertListEqual(sorted(expected_result), sorted(result))

    def test_get_plugins_exclude(self):
        exclude_1 = "eslint"
        exclude_2 = "gitsecrets"
        plugins = [f"-{exclude_1}", f"-{exclude_2}"]
        expected_result = deepcopy(self.plugins)
        expected_result.remove(exclude_1)
        expected_result.remove(exclude_2)

        result = scan_details._get_plugins(self.plugin_path, plugins)
        self.assertListEqual(sorted(expected_result), sorted(result))

    def test_get_plugins_bad_names(self):
        exclude_1 = "eslint"
        expected_result = deepcopy(self.plugins)
        expected_result.remove(exclude_1)
        plugins = ["-bogus", f"-{exclude_1}"]
        result = scan_details._get_plugins(self.plugin_path, plugins)
        self.assertListEqual(sorted(expected_result), sorted(result))
