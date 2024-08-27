import unittest
from unittest.mock import MagicMock

from github_repo_health.rules import BranchProtectionStatusChecks
from github_repo_health.utilities import Github

OWNER = "owner"
REPO = "repo"
BRANCH = "branch"

EXPECTED_CHECK = "check"
EXPECTED_CHECK_2 = "check_2_still_checking"
SINGLE_CHECK_NO_OVERRIDE_CONFIG = {"checks": {"all_of": [EXPECTED_CHECK]}}
MULTI_CHECK_NO_OVERRIDE_CONFIG = {"checks": {"all_of": [EXPECTED_CHECK, EXPECTED_CHECK_2]}}

NO_STATUS_CHECKS_RESPONSE = {}


class TestBranchProtectionStatusChecks(unittest.TestCase):
    def test_no_required_status_checks(self):
        mock_github = Github(None)
        mock_response = {
            # No required_status_checks
        }
        mock_github.get_branch_protection = MagicMock(return_value=mock_response)

        expected = {
            "id": BranchProtectionStatusChecks.identifier,
            "name": BranchProtectionStatusChecks.name,
            "description": BranchProtectionStatusChecks.description,
            "pass": False,
        }

        self.assertEqual(
            expected,
            BranchProtectionStatusChecks.check(mock_github, OWNER, REPO, BRANCH),
        )

    def test_required_status_checks(self):
        mock_github = Github(None)
        mock_response = {"required_status_checks": {"contexts": []}}
        mock_github.get_branch_protection = MagicMock(return_value=mock_response)

        expected = {
            "id": BranchProtectionStatusChecks.identifier,
            "name": BranchProtectionStatusChecks.name,
            "description": BranchProtectionStatusChecks.description,
            "pass": True,
        }

        self.assertEqual(
            expected,
            BranchProtectionStatusChecks.check(mock_github, OWNER, REPO, BRANCH),
        )

    def test_no_checks_in_config(self):
        mock_github = Github(None)
        mock_github.get_branch_protection = MagicMock(return_value=NO_STATUS_CHECKS_RESPONSE)
        bad_config = {}

        self.assertRaises(
            Exception,
            BranchProtectionStatusChecks.check,
            [mock_github, OWNER, REPO, BRANCH, bad_config],
        )

    def test_override_check_name(self):
        mock_github = Github(None)
        mock_github.get_branch_protection = MagicMock(return_value=NO_STATUS_CHECKS_RESPONSE)

        override_name = "look_at_me_i_am_the_check_now"
        config = {"name": override_name}

        expected = {
            "id": BranchProtectionStatusChecks.identifier,
            "name": override_name,
            "description": BranchProtectionStatusChecks.description,
            "pass": False,
        }

        self.assertEqual(
            expected,
            BranchProtectionStatusChecks.check(mock_github, OWNER, REPO, BRANCH, config),
        )

    def test_override_check_description(self):
        mock_github = Github(None)
        mock_github.get_branch_protection = MagicMock(return_value=NO_STATUS_CHECKS_RESPONSE)

        override_description = "Look at me. I am the check now"
        config = {"description": override_description}

        expected = {
            "id": BranchProtectionStatusChecks.identifier,
            "name": BranchProtectionStatusChecks.name,
            "description": override_description,
            "pass": False,
        }

        self.assertEqual(
            expected,
            BranchProtectionStatusChecks.check(mock_github, OWNER, REPO, BRANCH, config),
        )

    def test_single_expected_check_exists(self):
        mock_github = Github(None)
        mock_response = {"required_status_checks": {"contexts": [EXPECTED_CHECK, "junk_check_nobody_cares_about"]}}
        mock_github.get_branch_protection = MagicMock(return_value=mock_response)

        expected = {
            "id": BranchProtectionStatusChecks.identifier,
            "name": BranchProtectionStatusChecks.name,
            "description": BranchProtectionStatusChecks.description,
            "pass": True,
        }

        self.assertEqual(
            expected,
            BranchProtectionStatusChecks.check(mock_github, OWNER, REPO, BRANCH, SINGLE_CHECK_NO_OVERRIDE_CONFIG),
        )

    def test_single_expected_check_does_not_exist(self):
        mock_github = Github(None)
        mock_response = {"required_status_checks": {"contexts": ["this_is_not_the_check_you_are_looking_for"]}}
        mock_github.get_branch_protection = MagicMock(return_value=mock_response)

        expected = {
            "id": BranchProtectionStatusChecks.identifier,
            "name": BranchProtectionStatusChecks.name,
            "description": BranchProtectionStatusChecks.description,
            "pass": False,
        }

        self.assertEqual(
            expected,
            BranchProtectionStatusChecks.check(mock_github, OWNER, REPO, BRANCH, SINGLE_CHECK_NO_OVERRIDE_CONFIG),
        )

    def test_multiple_expected_checks_exist(self):
        mock_github = Github(None)
        mock_response = {
            "required_status_checks": {
                "contexts": [
                    "junk_check_nobody_cares_about",
                    EXPECTED_CHECK,
                    EXPECTED_CHECK_2,
                ]
            }
        }
        mock_github.get_branch_protection = MagicMock(return_value=mock_response)

        expected = {
            "id": BranchProtectionStatusChecks.identifier,
            "name": BranchProtectionStatusChecks.name,
            "description": BranchProtectionStatusChecks.description,
            "pass": True,
        }

        self.assertEqual(
            expected,
            BranchProtectionStatusChecks.check(mock_github, OWNER, REPO, BRANCH, MULTI_CHECK_NO_OVERRIDE_CONFIG),
        )

    def test_multiple_expected_checks_do_not_exist(self):
        mock_github = Github(None)
        mock_response = {"required_status_checks": {"contexts": ["this_is_not_the_check_you_are_looking_for"]}}
        mock_github.get_branch_protection = MagicMock(return_value=mock_response)

        expected = {
            "id": BranchProtectionStatusChecks.identifier,
            "name": BranchProtectionStatusChecks.name,
            "description": BranchProtectionStatusChecks.description,
            "pass": False,
        }

        self.assertEqual(
            expected,
            BranchProtectionStatusChecks.check(mock_github, OWNER, REPO, BRANCH, MULTI_CHECK_NO_OVERRIDE_CONFIG),
        )

    def test_multiple_expected_checks_one_does_not_exist(self):
        mock_github = Github(None)
        mock_response = {"required_status_checks": {"contexts": [EXPECTED_CHECK_2, "junk_check_nobody_cares_about"]}}
        mock_github.get_branch_protection = MagicMock(return_value=mock_response)

        expected = {
            "id": BranchProtectionStatusChecks.identifier,
            "name": BranchProtectionStatusChecks.name,
            "description": BranchProtectionStatusChecks.description,
            "pass": False,
        }

        self.assertEqual(
            expected,
            BranchProtectionStatusChecks.check(mock_github, OWNER, REPO, BRANCH, MULTI_CHECK_NO_OVERRIDE_CONFIG),
        )
