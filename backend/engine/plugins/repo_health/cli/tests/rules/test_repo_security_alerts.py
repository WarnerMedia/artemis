import unittest
from unittest.mock import MagicMock

from utilities import Github

from rules import RepoSecurityAlerts

OWNER = "owner"
REPO = "repo"
BRANCH = "branch"


class TestRepoSecurityAlerts(unittest.TestCase):
    def test_an_error_message_is_returned(self):
        mock_github = Github(None)
        mock_response = {
            # It returns 404 with a message if vuln alerts are not enabled
            "message": "this is an error message"
        }
        mock_github.check_vulnerability_alerts = MagicMock(return_value=mock_response)

        expected = {
            "type": RepoSecurityAlerts.identifier,
            "name": RepoSecurityAlerts.name,
            "description": RepoSecurityAlerts.description,
            "pass": False,
        }

        self.assertEqual(expected, RepoSecurityAlerts.check(mock_github, OWNER, REPO, BRANCH))

    def test_nothing_is_returned(self):
        mock_github = Github(None)
        mock_response = {
            # It just returns 200 with no body when vuln alerts are enabled
        }
        mock_github.check_vulnerability_alerts = MagicMock(return_value=mock_response)

        expected = {
            "type": RepoSecurityAlerts.identifier,
            "name": RepoSecurityAlerts.name,
            "description": RepoSecurityAlerts.description,
            "pass": True,
        }

        self.assertEqual(expected, RepoSecurityAlerts.check(mock_github, OWNER, REPO, BRANCH))
