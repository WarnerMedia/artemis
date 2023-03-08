import unittest
from unittest.mock import MagicMock

from ...src.rules import RepoFiles
from ...src.utilities import Github

OWNER = "owner"
REPO = "repo"
BRANCH = "branch"

FILE_EXISTS_RESPONSE = {"type": "file"}
NO_FILE_RESPONSE = {}


def mock_get_repository_content(owner, repo, path):
    if "exists" in path:
        return FILE_EXISTS_RESPONSE
    else:
        return NO_FILE_RESPONSE


class TestRepoFilesExist(unittest.TestCase):
    def test_config_has_neither_all_of_nor_any_of(self):
        mock_github = Github(None)
        mock_github.get_repository_content = MagicMock(return_value=FILE_EXISTS_RESPONSE)

        bad_config = {}

        self.assertRaises(
            Exception,
            RepoFiles.check,
            [mock_github, OWNER, REPO, BRANCH, bad_config],
        )

    def test_config_has_both_all_of_and_any_of(self):
        mock_github = Github(None)
        mock_github.get_repository_content = MagicMock(return_value=FILE_EXISTS_RESPONSE)

        config = {"files": {"all_of": [], "any_of": []}}

        try:
            RepoFiles.check(mock_github, OWNER, REPO, BRANCH, config)
        except Exception:
            self.fail("Expected RepoSpecificFilesExist.check(...) not to raise an exception")

    def test_config_has_only_all_of(self):
        mock_github = Github(None)
        mock_github.get_repository_content = MagicMock(return_value=FILE_EXISTS_RESPONSE)

        config = {"files": {"all_of": []}}

        try:
            RepoFiles.check(mock_github, OWNER, REPO, BRANCH, config)
        except Exception:
            self.fail("Expected RepoSpecificFilesExist.check(...) not to raise an exception")

    def test_config_has_only_any_of(self):
        mock_github = Github(None)
        mock_github.get_repository_content = MagicMock(return_value=FILE_EXISTS_RESPONSE)

        config = {"files": {"any_of": []}}

        try:
            RepoFiles.check(mock_github, OWNER, REPO, BRANCH, config)
        except Exception:
            self.fail("Expected RepoSpecificFilesExist.check(...) not to raise an exception")

    def test_config_overrides_name(self):
        mock_github = Github(None)
        mock_github.get_repository_content = MagicMock(return_value=FILE_EXISTS_RESPONSE)

        override_name = "look_at_me_i_am_the_check_now"
        config = {"name": override_name}

        expected = {
            "id": RepoFiles.identifier,
            "name": override_name,
            "description": RepoFiles.description,
            "pass": True,
        }

        self.assertEqual(expected, RepoFiles.check(mock_github, OWNER, REPO, BRANCH, config))

    def test_config_overrides_description(self):
        mock_github = Github(None)
        mock_github.get_repository_content = MagicMock(return_value=FILE_EXISTS_RESPONSE)

        override_description = "Look at me. I am the check now"
        config = {"description": override_description}

        expected = {
            "id": RepoFiles.identifier,
            "name": RepoFiles.name,
            "description": override_description,
            "pass": True,
        }

        self.assertEqual(expected, RepoFiles.check(mock_github, OWNER, REPO, BRANCH, config))

    def test_any_of_one_exists(self):
        mock_github = Github(None)
        mock_github.get_repository_content = MagicMock(side_effect=mock_get_repository_content)

        config = {"files": {"any_of": ["exists.py"]}}

        expected = {
            "id": RepoFiles.identifier,
            "name": RepoFiles.name,
            "description": RepoFiles.description,
            "pass": True,
        }

        self.assertEqual(expected, RepoFiles.check(mock_github, OWNER, REPO, BRANCH, config))

    def test_any_of_two_exist(self):
        mock_github = Github(None)
        mock_github.get_repository_content = MagicMock(side_effect=mock_get_repository_content)

        config = {
            "files": {
                "any_of": [
                    "exists.py",
                    "path/to/exists.txt",
                ]
            }
        }

        expected = {
            "id": RepoFiles.identifier,
            "name": RepoFiles.name,
            "description": RepoFiles.description,
            "pass": True,
        }

        self.assertEqual(expected, RepoFiles.check(mock_github, OWNER, REPO, BRANCH, config))

    def test_any_of_one_of_two_exists(self):
        mock_github = Github(None)
        mock_github.get_repository_content = MagicMock(side_effect=mock_get_repository_content)

        config = {
            "files": {
                "any_of": [
                    "exists.py",
                    "404.txt",
                ]
            }
        }

        expected = {
            "id": RepoFiles.identifier,
            "name": RepoFiles.name,
            "description": RepoFiles.description,
            "pass": True,
        }

        self.assertEqual(expected, RepoFiles.check(mock_github, OWNER, REPO, BRANCH, config))

    def test_any_of_none_of_two_exist(self):
        mock_github = Github(None)
        mock_github.get_repository_content = MagicMock(side_effect=mock_get_repository_content)

        config = {
            "files": {
                "any_of": [
                    "path/to/404.py",
                    "404.txt",
                ]
            }
        }

        expected = {
            "id": RepoFiles.identifier,
            "name": RepoFiles.name,
            "description": RepoFiles.description,
            "pass": False,
        }

        self.assertEqual(expected, RepoFiles.check(mock_github, OWNER, REPO, BRANCH, config))

    def test_all_of_one_exists(self):
        mock_github = Github(None)
        mock_github.get_repository_content = MagicMock(side_effect=mock_get_repository_content)

        config = {"files": {"all_of": ["exists.py"]}}

        expected = {
            "id": RepoFiles.identifier,
            "name": RepoFiles.name,
            "description": RepoFiles.description,
            "pass": True,
        }

        self.assertEqual(expected, RepoFiles.check(mock_github, OWNER, REPO, BRANCH, config))

    def test_all_of_two_exist(self):
        mock_github = Github(None)
        mock_github.get_repository_content = MagicMock(side_effect=mock_get_repository_content)

        config = {
            "files": {
                "all_of": [
                    "exists.py",
                    "path/to/exists.txt",
                ]
            }
        }

        expected = {
            "id": RepoFiles.identifier,
            "name": RepoFiles.name,
            "description": RepoFiles.description,
            "pass": True,
        }

        self.assertEqual(expected, RepoFiles.check(mock_github, OWNER, REPO, BRANCH, config))

    def test_all_of_one_of_two_exists(self):
        mock_github = Github(None)
        mock_github.get_repository_content = MagicMock(side_effect=mock_get_repository_content)

        config = {
            "files": {
                "all_of": [
                    "exists.py",
                    "404.txt",
                ]
            }
        }

        expected = {
            "id": RepoFiles.identifier,
            "name": RepoFiles.name,
            "description": RepoFiles.description,
            "pass": False,
        }

        self.assertEqual(expected, RepoFiles.check(mock_github, OWNER, REPO, BRANCH, config))

    def test_all_of_none_of_two_exist(self):
        mock_github = Github(None)
        mock_github.get_repository_content = MagicMock(side_effect=mock_get_repository_content)

        config = {
            "files": {
                "all_of": [
                    "path/to/404.py",
                    "404.txt",
                ]
            }
        }

        expected = {
            "id": RepoFiles.identifier,
            "name": RepoFiles.name,
            "description": RepoFiles.description,
            "pass": False,
        }

        self.assertEqual(expected, RepoFiles.check(mock_github, OWNER, REPO, BRANCH, config))

    def test_all_of_with_any_of_both_true(self):
        mock_github = Github(None)
        mock_github.get_repository_content = MagicMock(side_effect=mock_get_repository_content)

        config = {
            "files": {
                "any_of": [
                    "exists.txt",
                ],
                "all_of": [
                    "exists.py",
                ],
            }
        }

        expected = {
            "id": RepoFiles.identifier,
            "name": RepoFiles.name,
            "description": RepoFiles.description,
            "pass": True,
        }

        self.assertEqual(expected, RepoFiles.check(mock_github, OWNER, REPO, BRANCH, config))

    def test_all_of_with_any_of_and_only_any_of_true(self):
        mock_github = Github(None)
        mock_github.get_repository_content = MagicMock(side_effect=mock_get_repository_content)

        config = {
            "files": {
                "any_of": [
                    "exists.txt",
                ],
                "all_of": [
                    "404.py",
                ],
            }
        }

        expected = {
            "id": RepoFiles.identifier,
            "name": RepoFiles.name,
            "description": RepoFiles.description,
            "pass": False,
        }

        self.assertEqual(expected, RepoFiles.check(mock_github, OWNER, REPO, BRANCH, config))

    def test_all_of_with_any_of_and_only_all_of_true(self):
        mock_github = Github(None)
        mock_github.get_repository_content = MagicMock(side_effect=mock_get_repository_content)

        config = {
            "files": {
                "any_of": [
                    "404.txt",
                ],
                "all_of": [
                    "exists.py",
                ],
            }
        }

        expected = {
            "id": RepoFiles.identifier,
            "name": RepoFiles.name,
            "description": RepoFiles.description,
            "pass": False,
        }

        self.assertEqual(expected, RepoFiles.check(mock_github, OWNER, REPO, BRANCH, config))

    def test_all_of_with_any_of_and_neither_true(self):
        mock_github = Github(None)
        mock_github.get_repository_content = MagicMock(side_effect=mock_get_repository_content)

        config = {
            "files": {
                "any_of": [
                    "404.txt",
                ],
                "all_of": [
                    "404.py",
                ],
            }
        }

        expected = {
            "id": RepoFiles.identifier,
            "name": RepoFiles.name,
            "description": RepoFiles.description,
            "pass": False,
        }

        self.assertEqual(expected, RepoFiles.check(mock_github, OWNER, REPO, BRANCH, config))
