import os.path
import unittest

from engine.plugins.shell_check.main import get_files, main

TEST_DIR = os.path.dirname(os.path.abspath(__file__))

TEST_BASEDIR = os.path.join(TEST_DIR, "data", "test_shell_check")
TEST_GET_FILES = os.path.join(TEST_BASEDIR, "files")
TEST_SHELL_ISSUES = os.path.join(TEST_BASEDIR, "issue_dir")
TEST_SHELL_NO_ISSUES = os.path.join(TEST_BASEDIR, "no_issue_dir")
TEST_SHELL_NO_FILES = os.path.join(TEST_BASEDIR, "no_shell_files")


class TestPluginShellCheck(unittest.TestCase):
    def test_get_files(self):
        """
        Test only shell scripts are included.

        The order of results is assumed not to matter.
        """
        actual = {os.path.normpath(x) for x in get_files(TEST_GET_FILES)}
        self.assertSetEqual(
            actual,
            {
                "subdir/foo.bashrc",
                ".bash_login",
                ".bash_logout",
                ".bash_profile",
                ".bashrc",
                "foo.bash",
                "foo.ksh",
                "foo.sh",
            },
        )

    def test_shell_check_no_issues(self):
        expected_result = {"details": [], "success": True}

        result = main(TEST_SHELL_NO_ISSUES)

        self.assertEqual(expected_result, result)

    def test_shell_check_issues(self):
        result = main(TEST_SHELL_ISSUES)

        expected = [
            {
                "filename": "./test_shell_check.sh",
                "line": 2,
                "severity": "medium",
                "message": "You need a space after the [ and before the ].",
                "type": "1035",
            },
            {
                "filename": "./test_shell_check.sh",
                "line": 2,
                "severity": "medium",
                "message": "Couldn't parse this test expression. Fix to allow more checks.",
                "type": "1073",
            },
            {
                "filename": "./test_shell_check.sh",
                "line": 2,
                "severity": "medium",
                "message": "Expected this to be an argument to the unary condition.",
                "type": "1019",
            },
            {
                "filename": "./test_shell_check.sh",
                "line": 2,
                "severity": "medium",
                "message": "You need a space before the ].",
                "type": "1020",
            },
            {
                "filename": "./test_shell_check.sh",
                "line": 2,
                "severity": "medium",
                "message": "Missing space before ]. Fix any mentioned problems and try again.",
                "type": "1072",
            },
        ]

        self.assertFalse(result["success"])
        self.assertEqual(expected, result["details"])

    def test_shell_check_no_shell_files(self):
        expected_result = {"details": [], "success": True}

        result = main(TEST_SHELL_NO_FILES)

        self.assertEqual(expected_result, result)
