import unittest
from unittest.mock import MagicMock

from ...src.rules import BranchRuleStatusChecks
from ...src.utilities import Github

OWNER = "owner"
REPO = "repo"
BRANCH = "branch"

EXPECTED_CHECK = "check"
EXPECTED_CHECK_2 = "check_2_still_checking"
SINGLE_CHECK_NO_OVERRIDE_CONFIG = {"checks": {"all_of": [EXPECTED_CHECK]}}
MULTI_CHECK_NO_OVERRIDE_CONFIG = {"checks": {"all_of": [EXPECTED_CHECK, EXPECTED_CHECK_2]}}

NO_STATUS_CHECKS_RESPONSE = [{"type": "required_status_checks", "parameters": {"required_status_checks": []}}]


class TestBranchRuleStatusChecks(unittest.TestCase):
    def test_no_checks_in_config(self):
        mock_github = Github(None)
        mock_github.get_branch_rules = MagicMock(return_value=NO_STATUS_CHECKS_RESPONSE)
        bad_config = {}

        self.assertRaises(
            Exception,
            BranchRuleStatusChecks.check,
            [mock_github, OWNER, REPO, BRANCH, bad_config],
        )

    def test_no_required_status_checks(self):
        mock_github = Github(None)
        mock_github.get_branch_rules = MagicMock(return_value=NO_STATUS_CHECKS_RESPONSE)

        expected = {
            "id": BranchRuleStatusChecks.identifier,
            "name": BranchRuleStatusChecks.name,
            "description": BranchRuleStatusChecks.description,
            "pass": False,
        }

        self.assertEqual(
            expected,
            BranchRuleStatusChecks.check(mock_github, OWNER, REPO, BRANCH, SINGLE_CHECK_NO_OVERRIDE_CONFIG),
        )

    def test_single_expected_check_exists(self):
        mock_github = Github(None)
        mock_response = [{"type": "required_status_checks", "parameters": {"required_status_checks": [ {"context": EXPECTED_CHECK}]}}]
        mock_github.get_branch_rules = MagicMock(return_value=mock_response)

        expected = {
            "id": BranchRuleStatusChecks.identifier,
            "name": BranchRuleStatusChecks.name,
            "description": BranchRuleStatusChecks.description,
            "pass": True,
        }

        self.assertEqual(
            expected,
            BranchRuleStatusChecks.check(mock_github, OWNER, REPO, BRANCH, SINGLE_CHECK_NO_OVERRIDE_CONFIG),
        )

    def test_single_expected_check_does_not_exist(self):
        mock_github = Github(None)
        mock_response = [{"type": "required_status_checks", "parameters": {"required_status_checks": [ {"context": "this_is_not_the_check_you_are_looking_for"}]}}]
        mock_github.get_branch_rules = MagicMock(return_value=mock_response)

        expected = {
            "id": BranchRuleStatusChecks.identifier,
            "name": BranchRuleStatusChecks.name,
            "description": BranchRuleStatusChecks.description,
            "pass": False,
        }

        self.assertEqual(
            expected,
            BranchRuleStatusChecks.check(mock_github, OWNER, REPO, BRANCH, SINGLE_CHECK_NO_OVERRIDE_CONFIG),
        )

    def test_multiple_expected_checks_exist(self):
        mock_github = Github(None)
        mock_response = [{"type": "required_status_checks", "parameters": {"required_status_checks": [ {"context": EXPECTED_CHECK}, {"context": EXPECTED_CHECK_2}]}}]
        mock_github.get_branch_rules = MagicMock(return_value=mock_response)

        expected = {
            "id": BranchRuleStatusChecks.identifier,
            "name": BranchRuleStatusChecks.name,
            "description": BranchRuleStatusChecks.description,
            "pass": True,
        }

        self.assertEqual(
            expected,
            BranchRuleStatusChecks.check(mock_github, OWNER, REPO, BRANCH, MULTI_CHECK_NO_OVERRIDE_CONFIG),
        )

    def test_multiple_expected_checks_one_does_not_exist(self):
        mock_github = Github(None)
        mock_response = [{"type": "required_status_checks", "parameters": {"required_status_checks": [ {"context": EXPECTED_CHECK}]}}]
        mock_github.get_branch_rules = MagicMock(return_value=mock_response)

        expected = {
            "id": BranchRuleStatusChecks.identifier,
            "name": BranchRuleStatusChecks.name,
            "description": BranchRuleStatusChecks.description,
            "pass": False,
        }

        self.assertEqual(
            expected,
            BranchRuleStatusChecks.check(mock_github, OWNER, REPO, BRANCH, MULTI_CHECK_NO_OVERRIDE_CONFIG),
        )
