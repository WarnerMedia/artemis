import unittest
from unittest.mock import MagicMock

from ...src.rules import BranchEnforceAdmins
from ...src.utilities import Github

OWNER = "owner"
REPO = "repo"
BRANCH = "branch"


class TestBranchEnforceAdmins(unittest.TestCase):
    def test_enforce_admins(self):
        mock_github = Github(None)
        mock_response = {
            # No enforce admins
        }
        mock_github.get_branch_protection = MagicMock(return_value=mock_response)

        expected = {
            "type": BranchEnforceAdmins.identifier,
            "name": BranchEnforceAdmins.name,
            "description": BranchEnforceAdmins.description,
            "pass": False,
        }

        self.assertEqual(expected, BranchEnforceAdmins.check(mock_github, OWNER, REPO, BRANCH))

    def test_enforce_admins(self):
        mock_github = Github(None)
        mock_response = {"enforce_admins": {"enabled": True}}
        mock_github.get_branch_protection = MagicMock(return_value=mock_response)

        expected = {
            "type": BranchEnforceAdmins.identifier,
            "name": BranchEnforceAdmins.name,
            "description": BranchEnforceAdmins.description,
            "pass": True,
        }

        self.assertEqual(expected, BranchEnforceAdmins.check(mock_github, OWNER, REPO, BRANCH))
