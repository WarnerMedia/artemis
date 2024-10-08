import unittest
from unittest.mock import MagicMock

from requests import HTTPError, Response

from engine.plugins.gitlab_repo_health.rules import RepoFiles
from engine.plugins.gitlab_repo_health.utilities.gitlab import Gitlab

OWNER = "owner"
REPO = "repo"
BRANCH = "branch"
SERVICE_URL = "atom-git"
KEY = "test"

FILE_EXISTS_RESPONSE = {"ref": "branch"}


# When result from get_mock_content_fn is used, if path contains the string "exists", we will return
# a result as if it exists.
# Otherwise, it'll raise some sort of exception, defaulting to 404 - "Not Found"
def get_mock_content_fn(error_status=404, error_message="Not Found"):
    def mock_get_repository_content(owner, repo, branch, path):
        if "exists" in path:
            return FILE_EXISTS_RESPONSE
        else:
            error = HTTPError(error_message)
            response = Response()
            response.status_code = error_status
            error.response = response
            raise error

    return mock_get_repository_content


class TestRepoFilesExist(unittest.TestCase):
    def test_config_has_neither_all_of_nor_any_of(self):
        mock_gitlab = Gitlab(KEY, SERVICE_URL)
        mock_gitlab.get_repository_content = MagicMock(return_value=FILE_EXISTS_RESPONSE)

        bad_config = {}

        self.assertRaises(
            Exception,
            RepoFiles.check,
            [mock_gitlab, OWNER, REPO, BRANCH, bad_config],
        )

    def test_config_has_both_all_of_and_any_of(self):
        mock_gitlab = Gitlab(KEY, SERVICE_URL)
        mock_gitlab.get_repository_content = MagicMock(return_value=FILE_EXISTS_RESPONSE)

        config = {"files": {"all_of": [], "any_of": []}}

        try:
            RepoFiles.check(mock_gitlab, OWNER, REPO, BRANCH, config)
        except Exception:
            self.fail("Expected RepoSpecificFilesExist.check(...) not to raise an exception")

    def test_config_has_only_all_of(self):
        mock_gitlab = Gitlab(KEY, SERVICE_URL)
        mock_gitlab.get_repository_content = MagicMock(return_value=FILE_EXISTS_RESPONSE)

        config = {"files": {"all_of": []}}

        try:
            RepoFiles.check(mock_gitlab, OWNER, REPO, BRANCH, config)
        except Exception:
            self.fail("Expected RepoSpecificFilesExist.check(...) not to raise an exception")

    def test_config_has_only_any_of(self):
        mock_gitlab = Gitlab(KEY, SERVICE_URL)
        mock_gitlab.get_repository_content = MagicMock(return_value=FILE_EXISTS_RESPONSE)

        config = {"files": {"any_of": []}}

        try:
            RepoFiles.check(mock_gitlab, OWNER, REPO, BRANCH, config)
        except Exception:
            self.fail("Expected RepoSpecificFilesExist.check(...) not to raise an exception")

    def test_config_overrides_name(self):
        mock_gitlab = Gitlab(KEY, SERVICE_URL)
        mock_gitlab.get_repository_content = MagicMock(return_value=FILE_EXISTS_RESPONSE)

        override_name = "look_at_me_i_am_the_check_now"
        config = {"name": override_name}

        expected = {
            "id": RepoFiles.identifier,
            "name": override_name,
            "description": RepoFiles.description,
            "pass": True,
        }

        self.assertEqual(expected, RepoFiles.check(mock_gitlab, OWNER, REPO, BRANCH, config))

    def test_config_overrides_description(self):
        mock_gitlab = Gitlab(KEY, SERVICE_URL)
        mock_gitlab.get_repository_content = MagicMock(return_value=FILE_EXISTS_RESPONSE)

        override_description = "Look at me. I am the check now"
        config = {"description": override_description}

        expected = {
            "id": RepoFiles.identifier,
            "name": RepoFiles.name,
            "description": override_description,
            "pass": True,
        }

        self.assertEqual(expected, RepoFiles.check(mock_gitlab, OWNER, REPO, BRANCH, config))

    def test_any_of_one_exists(self):
        mock_gitlab = Gitlab(KEY, SERVICE_URL)
        mock_gitlab.get_repository_content = MagicMock(side_effect=get_mock_content_fn())

        config = {"files": {"any_of": ["exists.py"]}}

        expected = {
            "id": RepoFiles.identifier,
            "name": RepoFiles.name,
            "description": RepoFiles.description,
            "pass": True,
        }

        self.assertEqual(expected, RepoFiles.check(mock_gitlab, OWNER, REPO, BRANCH, config))

    def test_any_of_two_exist(self):
        mock_gitlab = Gitlab(KEY, SERVICE_URL)
        mock_gitlab.get_repository_content = MagicMock(side_effect=get_mock_content_fn())

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
        self.assertEqual(expected, RepoFiles.check(mock_gitlab, OWNER, REPO, BRANCH, config))

    def test_any_of_one_of_two_exists(self):
        mock_gitlab = Gitlab(KEY, SERVICE_URL)
        mock_gitlab.get_repository_content = MagicMock(side_effect=get_mock_content_fn())

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

        self.assertEqual(expected, RepoFiles.check(mock_gitlab, OWNER, REPO, BRANCH, config))

    def test_any_of_none_of_two_exist(self):
        mock_gitlab = Gitlab(KEY, SERVICE_URL)
        mock_gitlab.get_repository_content = MagicMock(side_effect=get_mock_content_fn())

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

        self.assertEqual(expected, RepoFiles.check(mock_gitlab, OWNER, REPO, BRANCH, config))

    def test_all_of_one_exists(self):
        mock_gitlab = Gitlab(KEY, SERVICE_URL)
        mock_gitlab.get_repository_content = MagicMock(side_effect=get_mock_content_fn())

        config = {"files": {"all_of": ["exists.py"]}}

        expected = {
            "id": RepoFiles.identifier,
            "name": RepoFiles.name,
            "description": RepoFiles.description,
            "pass": True,
        }

        self.assertEqual(expected, RepoFiles.check(mock_gitlab, OWNER, REPO, BRANCH, config))

    def test_all_of_two_exist(self):
        mock_gitlab = Gitlab(KEY, SERVICE_URL)
        mock_gitlab.get_repository_content = MagicMock(side_effect=get_mock_content_fn())

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

        self.assertEqual(expected, RepoFiles.check(mock_gitlab, OWNER, REPO, BRANCH, config))

    def test_all_of_one_of_two_exists(self):
        mock_gitlab = Gitlab(KEY, SERVICE_URL)
        mock_gitlab.get_repository_content = MagicMock(side_effect=get_mock_content_fn())

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

        self.assertEqual(expected, RepoFiles.check(mock_gitlab, OWNER, REPO, BRANCH, config))

    def test_all_of_none_of_two_exist(self):
        mock_gitlab = Gitlab(KEY, SERVICE_URL)
        mock_gitlab.get_repository_content = MagicMock(side_effect=get_mock_content_fn())

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

        self.assertEqual(expected, RepoFiles.check(mock_gitlab, OWNER, REPO, BRANCH, config))

    def test_all_of_with_any_of_both_true(self):
        mock_gitlab = Gitlab(KEY, SERVICE_URL)
        mock_gitlab.get_repository_content = MagicMock(side_effect=get_mock_content_fn())

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

        self.assertEqual(expected, RepoFiles.check(mock_gitlab, OWNER, REPO, BRANCH, config))

    def test_all_of_with_any_of_and_only_any_of_true(self):
        mock_gitlab = Gitlab(KEY, SERVICE_URL)
        mock_gitlab.get_repository_content = MagicMock(side_effect=get_mock_content_fn())

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

        self.assertEqual(expected, RepoFiles.check(mock_gitlab, OWNER, REPO, BRANCH, config))

    def test_all_of_with_any_of_and_only_all_of_true(self):
        mock_gitlab = Gitlab(KEY, SERVICE_URL)
        mock_gitlab.get_repository_content = MagicMock(side_effect=get_mock_content_fn())

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

        self.assertEqual(expected, RepoFiles.check(mock_gitlab, OWNER, REPO, BRANCH, config))

    def test_all_of_with_any_of_and_neither_true(self):
        mock_gitlab = Gitlab(KEY, SERVICE_URL)
        mock_gitlab.get_repository_content = MagicMock(side_effect=get_mock_content_fn())

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

        self.assertEqual(expected, RepoFiles.check(mock_gitlab, OWNER, REPO, BRANCH, config))

    def test_non_404_error_response(self):
        mock_gitlab = Gitlab(KEY, SERVICE_URL)

        err_msg = "Unauthorized"
        mock_gitlab.get_repository_content = MagicMock(
            side_effect=get_mock_content_fn(error_status=401, error_message=err_msg)
        )

        config = {"files": {"any_of": ["errors.py"]}}

        expected = {
            "id": RepoFiles.identifier,
            "name": RepoFiles.name,
            "description": RepoFiles.description,
            "pass": False,
            "error_message": err_msg,
        }

        self.assertEqual(expected, RepoFiles.check(mock_gitlab, OWNER, REPO, BRANCH, config))
