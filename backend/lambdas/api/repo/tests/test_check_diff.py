import os
import unittest

import pytest

from repo.bitbucket_util.bitbucket_utils import _check_diff as bitbucket_check_diff
from repo.github_util.github_utils import _check_diff as github_check_diff
from repo.gitlab_util.process_gitlab_utils import check_diff as gitlab_check_diff
from repo.util.services import get_services_dict
from repo.util.utils import get_api_key

TEST_DIR = os.path.dirname(os.path.abspath(__file__))


class TestCheckDiff(unittest.TestCase):
    def setUp(self) -> None:
        self.services = os.path.join(TEST_DIR, "data", "services.json")
        self.services_dict = get_services_dict(self.services).get("services")

    @pytest.mark.skip("Skipping due to lack of valid integration")
    @pytest.mark.integtest
    def test_github_check_diff_valid(self) -> None:
        service = self.services_dict["github"]
        key = get_api_key(service.get("secret_loc"))
        diff = github_check_diff(
            service.get("diff_url"),
            key,
            "testorg/testrepo",  # This needs to be replaced with a valid GitHub repo
            "XXXXX",  # Replace with valid commit hash
            "YYYYY",  # Replace with valid commit hash
        )
        self.assertTrue(diff)

    @pytest.mark.skip("Skipping due to lack of valid integration")
    @pytest.mark.integtest
    def test_github_check_diff_invalid(self) -> None:
        service = self.services_dict["github"]
        key = get_api_key(service.get("secret_loc"))
        diff = github_check_diff(
            service.get("diff_url"),
            key,
            "testorg/testrepo",  # This needs to be replaced with a valid GitHub repo
            "XXXXX",  # Replace with valid commit hash
            "1234567890abcdef1234567890abcdef12345567",  # This commit hash does not exist
        )
        self.assertFalse(diff)

    @pytest.mark.skip("Skipping due to lack of valid integration")
    @pytest.mark.integtest
    def test_gitlab_check_diff_valid(self) -> None:
        service = self.services_dict["gitlab"]
        key = get_api_key(service.get("secret_loc"))
        diff = gitlab_check_diff(
            service.get("diff_url"),
            key,
            "gitlab-org/gitlab",  # Public repo for ease of testing
            "a4b9b8a72fcb448969ef7885ead17e6fdcf3439c",  # This commit hash exists
            "500aa483ddd7ba797af7872864a8d45613dc297d",  # This commit hash does not exist
        )
        self.assertTrue(diff)

    @pytest.mark.skip("Skipping due to lack of valid integration")
    @pytest.mark.integtest
    def test_gitlab_check_diff_invalid(self) -> None:
        service = self.services_dict["gitlab"]
        key = get_api_key(service.get("secret_loc"))
        diff = gitlab_check_diff(
            service.get("diff_url"),
            key,
            "gitlab-org/gitlab",  # Public repo for ease of testing
            "a4b9b8a72fcb448969ef7885ead17e6fdcf3439c",  # This commit hash exists
            "1234567890abcdef1234567890abcdef12345567",  # This commit hash does not exist
        )
        self.assertFalse(diff)

    @pytest.mark.skip("Skipping due to lack of valid integration")
    @pytest.mark.integtest
    def test_bitbucket_check_diff_valid(self) -> None:
        service = self.services_dict["bitbucket"]
        key = get_api_key(service.get("secret_loc"))
        diff = bitbucket_check_diff(
            service.get("url"),
            key,
            "testorg/testrepo",  # This needs to be replaced with a valid Bitbucket repo
            "XXXXX",  # Replace with valid commit hash
            "YYYYY",  # Replace with valid commit hash
        )
        self.assertTrue(diff)

    @pytest.mark.skip("Skipping due to lack of valid integration")
    @pytest.mark.integtest
    def test_bitbucket_check_diff_invalid(self) -> None:
        service = self.services_dict["bitbucket"]
        key = get_api_key(service.get("secret_loc"))
        diff = bitbucket_check_diff(
            service.get("url"),
            key,
            "testorg/testrepo",  # This needs to be replaced with a valid Bitbucket repo
            "XXXXX",  # Replace with valid commit hash
            "1234567890abcdef1234567890abcdef12345567",  # This commit hash does not exist
        )
        self.assertFalse(diff)
