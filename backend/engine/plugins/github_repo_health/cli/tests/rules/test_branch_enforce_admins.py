import unittest
from unittest.mock import MagicMock

from ...src.rules import BranchProtectionEnforceAdmins
from ...src.utilities import Github

OWNER = "owner"
REPO = "repo"
BRANCH = "branch"


class TestBranchEnforceAdmins(unittest.TestCase):
    def test_enforce_admins_disabled(self):
        mock_github = Github(None)
        mock_response = {
            # No enforce admins
        }
        mock_github.get_branch_protection = MagicMock(return_value=mock_response)

        expected = {
            "id": BranchProtectionEnforceAdmins.identifier,
            "name": BranchProtectionEnforceAdmins.name,
            "description": BranchProtectionEnforceAdmins.description,
            "pass": False,
        }

        self.assertEqual(expected, BranchProtectionEnforceAdmins.check(mock_github, OWNER, REPO, BRANCH))

    def test_enforce_admins_enabled(self):
        mock_github = Github(None)
        mock_response = {"enforce_admins": {"enabled": True}}
        mock_github.get_branch_protection = MagicMock(return_value=mock_response)

        expected = {
            "id": BranchProtectionEnforceAdmins.identifier,
            "name": BranchProtectionEnforceAdmins.name,
            "description": BranchProtectionEnforceAdmins.description,
            "pass": True,
        }

        self.assertEqual(expected, BranchProtectionEnforceAdmins.check(mock_github, OWNER, REPO, BRANCH))
