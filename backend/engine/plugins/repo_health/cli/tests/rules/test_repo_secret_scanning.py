import unittest
from unittest.mock import MagicMock

from ...src.rules import RepoSecretScanning
from ...src.utilities import Github

OWNER = "owner"
REPO = "repo"
BRANCH = "branch"

PUSH_PROTECTION_CONFIG = {"require_push_protection": True}


class TestRepoSecretScanning(unittest.TestCase):
    def test_no_security_and_analysis(self):
        mock_github = Github(None)
        mock_response = {
            # No security_and_analysis
        }
        mock_github.get_repository = MagicMock(return_value=mock_response)

        expected = {
            "type": RepoSecretScanning.identifier,
            "name": RepoSecretScanning.name,
            "description": RepoSecretScanning.description,
            "pass": False,
            "error_message": "GitHub Advanced Security is not enabled",
        }

        self.assertEqual(expected, RepoSecretScanning.check(mock_github, OWNER, REPO, BRANCH))

    def test_no_push_protection_secret_scanning_enabled(self):
        mock_github = Github(None)
        mock_response = {
            "security_and_analysis": {
                "secret_scanning": {"status": "enabled"},
                "secret_scanning_push_protection": {"status": "disabled"},
            }
        }
        mock_github.get_repository = MagicMock(return_value=mock_response)

        expected = {
            "type": RepoSecretScanning.identifier,
            "name": RepoSecretScanning.name,
            "description": RepoSecretScanning.description,
            "pass": True,
        }

        self.assertEqual(expected, RepoSecretScanning.check(mock_github, OWNER, REPO, BRANCH))

    def test_no_push_protection_secret_scanning_disabled(self):
        mock_github = Github(None)
        mock_response = {
            "security_and_analysis": {
                "secret_scanning": {"status": "disabled"},
                "secret_scanning_push_protection": {"status": "disabled"},
            }
        }
        mock_github.get_repository = MagicMock(return_value=mock_response)

        expected = {
            "type": RepoSecretScanning.identifier,
            "name": RepoSecretScanning.name,
            "description": RepoSecretScanning.description,
            "pass": False,
        }

        self.assertEqual(expected, RepoSecretScanning.check(mock_github, OWNER, REPO, BRANCH))

    def test_secret_scanning_push_protection_enabled(self):
        mock_github = Github(None)
        mock_response = {
            "security_and_analysis": {
                "secret_scanning": {"status": "enabled"},
                "secret_scanning_push_protection": {"status": "enabled"},
            }
        }
        mock_github.get_repository = MagicMock(return_value=mock_response)

        expected = {
            "type": RepoSecretScanning.identifier,
            "name": RepoSecretScanning.name,
            "description": RepoSecretScanning.description,
            "pass": True,
        }

        self.assertEqual(
            expected,
            RepoSecretScanning.check(mock_github, OWNER, REPO, BRANCH, PUSH_PROTECTION_CONFIG),
        )

    def test_secret_scanning_push_protection_disabled(self):
        mock_github = Github(None)
        mock_response = {
            "security_and_analysis": {
                "secret_scanning": {"status": "enabled"},
                "secret_scanning_push_protection": {"status": "disabled"},
            }
        }
        mock_github.get_repository = MagicMock(return_value=mock_response)

        expected = {
            "type": RepoSecretScanning.identifier,
            "name": RepoSecretScanning.name,
            "description": RepoSecretScanning.description,
            "pass": False,
        }

        self.assertEqual(
            expected,
            RepoSecretScanning.check(mock_github, OWNER, REPO, BRANCH, PUSH_PROTECTION_CONFIG),
        )
