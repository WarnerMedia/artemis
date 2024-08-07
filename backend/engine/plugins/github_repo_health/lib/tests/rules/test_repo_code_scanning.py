import unittest
from unittest.mock import MagicMock

from github_repo_health.rules import RepoCodeScanning
from github_repo_health.utilities import Github

OWNER = "owner"
REPO = "repo"
BRANCH = "branch"


class TestRepoCodeScanning(unittest.TestCase):
    def test_no_security_and_analysis(self):
        mock_github = Github(None)
        mock_response = {
            # No security_and_analysis
        }
        mock_github.get_repository = MagicMock(return_value=mock_response)

        expected = {
            "id": RepoCodeScanning.identifier,
            "name": RepoCodeScanning.name,
            "description": RepoCodeScanning.description,
            "pass": False,
            "error_message": "GitHub Advanced Security is not enabled",
        }

        self.assertEqual(expected, RepoCodeScanning.check(mock_github, OWNER, REPO, BRANCH))

    def test_security_and_analysis_disabled(self):
        mock_github = Github(None)
        mock_response = {"security_and_analysis": {"advanced_security": {"status": "disabled"}}}
        mock_github.get_repository = MagicMock(return_value=mock_response)

        expected = {
            "id": RepoCodeScanning.identifier,
            "name": RepoCodeScanning.name,
            "description": RepoCodeScanning.description,
            "pass": False,
        }

        self.assertEqual(expected, RepoCodeScanning.check(mock_github, OWNER, REPO, BRANCH))

    def test_security_and_analysis_enabled(self):
        mock_github = Github(None)
        mock_response = {"security_and_analysis": {"advanced_security": {"status": "enabled"}}}
        mock_github.get_repository = MagicMock(return_value=mock_response)

        expected = {
            "id": RepoCodeScanning.identifier,
            "name": RepoCodeScanning.name,
            "description": RepoCodeScanning.description,
            "pass": True,
        }

        self.assertEqual(expected, RepoCodeScanning.check(mock_github, OWNER, REPO, BRANCH))
