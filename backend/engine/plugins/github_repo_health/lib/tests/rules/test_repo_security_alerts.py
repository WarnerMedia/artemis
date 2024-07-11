import unittest
from unittest.mock import MagicMock

from github_repo_health.rules import RepoSecurityAlerts
from github_repo_health.utilities import Github

OWNER = "owner"
REPO = "repo"
BRANCH = "branch"


class TestRepoSecurityAlerts(unittest.TestCase):
    def test_false_is_returned(self):
        mock_github = Github(None)
        mock_github.are_vulnerability_alerts_enabled = MagicMock(return_value=False)

        expected = {
            "id": RepoSecurityAlerts.identifier,
            "name": RepoSecurityAlerts.name,
            "description": RepoSecurityAlerts.description,
            "pass": False,
        }

        self.assertEqual(expected, RepoSecurityAlerts.check(mock_github, OWNER, REPO, BRANCH))

    def test_true_is_returned(self):
        mock_github = Github(None)
        mock_github.are_vulnerability_alerts_enabled = MagicMock(return_value=True)

        expected = {
            "id": RepoSecurityAlerts.identifier,
            "name": RepoSecurityAlerts.name,
            "description": RepoSecurityAlerts.description,
            "pass": True,
        }

        self.assertEqual(expected, RepoSecurityAlerts.check(mock_github, OWNER, REPO, BRANCH))
