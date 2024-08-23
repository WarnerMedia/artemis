import unittest
from unittest.mock import MagicMock

from gitlab_repo_health.rules import BranchProtectionEnforceAdmins
from gitlab_repo_health.utilities.gitlab import Gitlab

OWNER = "owner"
REPO = "repo"
BRANCH = "branch"


class TestBranchProtectionEnforceAdmins(unittest.TestCase):
    def test_enforce_admins_disabled(self):
        mock_gitlab = Gitlab("", "")
        mock_response = {
            # No enforce admins
        }
        mock_gitlab.get_branch_protection = MagicMock(return_value=mock_response)

        expected = {
            "id": BranchProtectionEnforceAdmins.identifier,
            "name": BranchProtectionEnforceAdmins.name,
            "description": BranchProtectionEnforceAdmins.description,
            "pass": False,
        }

        self.assertEqual(
            expected,
            BranchProtectionEnforceAdmins.check(mock_gitlab, OWNER, REPO, BRANCH),
        )

    def test_enforce_admins_enabled(self):
        mock_gitlab = Gitlab("", "")
        mock_response = {"enforce_admins": {"enabled": True}}
        mock_gitlab.get_branch_protection = MagicMock(return_value=mock_response)

        expected = {
            "id": BranchProtectionEnforceAdmins.identifier,
            "name": BranchProtectionEnforceAdmins.name,
            "description": BranchProtectionEnforceAdmins.description,
            "pass": True,
        }

        self.assertEqual(
            expected,
            BranchProtectionEnforceAdmins.check(mock_gitlab, OWNER, REPO, BRANCH),
        )
