# pylint: disable=too-many-public-methods
import copy
import os
import unittest
from string import Template
from unittest.mock import patch

import pytest

import repo.bitbucket_util.bitbucket_utils
from repo.util.const import (
    BITBUCKET_PRIVATE_BRANCH_QUERY,
    BITBUCKET_PRIVATE_REPO_QUERY,
    BITBUCKET_PUBLIC_BRANCH_QUERY,
    BITBUCKET_PUBLIC_REPO_QUERY,
)
from repo.util.identity import Identity
from repo.util.services import get_services_dict
from repo.util.utils import build_options_map

TEST_DIR = os.path.dirname(os.path.abspath(__file__))

TEST_BITBUCKET_SERVICE = "bitbucket"
TEST_BITBUCKET_URL = "www.bitbucket.org"
TEST_NOT_BITBUCKET_SERVICE = "not bitbucket"
TEST_NOT_BITBUCKET_URL = "www.notbitbucket.org"
TEST_ORG = "happy_org"
TEST_REPO = "sad_repo"
TEST_BRANCH = "branch_name"

TEST_PUBLIC_REQ_LIST = [{"org": "testorg", "repo": "testrepo"}]

TEST_PRIVATE_SERVICE = "git.example.com"
TEST_PRIVATE_REQ_LIST = [{"org": "testorg", "repo": "testrepo1"}, {"org": "testorg", "repo": "testrepo2"}]

TEST_AUTHZ = ["*"]

TEST_PRIVATE_REPO_RESPONSE = {
    "slug": "testrepo1",
    "id": 1,
    "name": "My repo",
    "description": "My repo description",
    "hierarchyId": "e3c939f9ef4a7fae272e",
    "scmId": "git",
    "state": "AVAILABLE",
    "statusMessage": "Available",
    "forkable": True,
    "project": {
        "key": "testorg",
        "id": 1,
        "name": "My Cool Project",
        "description": "The description for my cool project.",
        "public": True,
        "type": "NORMAL",
        "links": {"self": [{"href": "http://link/to/project"}]},
    },
    "public": True,
    "links": {
        "clone": [
            {"href": "ssh://git@<baseURL>/testorg/testrepo1.git", "name": "ssh"},
            {"href": "https://<baseURL>/scm/testorg/testrepo1.git", "name": "http"},
        ],
        "self": [{"href": "http://link/to/repository"}],
    },
}

TEST_IDENTITY = Identity("test@example.com", TEST_AUTHZ, {})


class TestBitbucketUtils(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.maxDiff = None
        services = os.path.join(TEST_DIR, "data", "services.json")
        cls.services = services
        cls.services_dict = get_services_dict(services).get("services")

    def test_construct_bitbucket_repo_url_public(self):
        expected_result = Template(BITBUCKET_PUBLIC_REPO_QUERY).substitute(
            service_url=TEST_BITBUCKET_URL, org=TEST_ORG, repo=TEST_REPO
        )

        result = repo.bitbucket_util.bitbucket_utils.construct_bitbucket_repo_url(
            TEST_BITBUCKET_SERVICE, TEST_BITBUCKET_URL, TEST_ORG, TEST_REPO
        )

        self.assertEqual(expected_result, result)

    def test_construct_bitbucket_repo_url_private(self):
        expected_result = Template(BITBUCKET_PRIVATE_REPO_QUERY).substitute(
            service_url=TEST_NOT_BITBUCKET_URL, org=TEST_ORG, repo=TEST_REPO
        )

        result = repo.bitbucket_util.bitbucket_utils.construct_bitbucket_repo_url(
            TEST_NOT_BITBUCKET_SERVICE, TEST_NOT_BITBUCKET_URL, TEST_ORG, TEST_REPO
        )

        self.assertEqual(expected_result, result)

    def test_construct_bitbucket_branch_url_public(self):
        expected_result = Template(BITBUCKET_PUBLIC_BRANCH_QUERY).substitute(
            service_url=TEST_BITBUCKET_URL, org=TEST_ORG, repo=TEST_REPO, branch=TEST_BRANCH
        )

        result = repo.bitbucket_util.bitbucket_utils.construct_bitbucket_branch_url(
            TEST_BITBUCKET_SERVICE, TEST_BITBUCKET_URL, TEST_ORG, TEST_REPO, TEST_BRANCH
        )

        self.assertEqual(expected_result, result)

    def test_construct_bitbucket_branch_url_private(self):
        expected_result = Template(BITBUCKET_PRIVATE_BRANCH_QUERY).substitute(
            service_url=TEST_NOT_BITBUCKET_URL, org=TEST_ORG, repo=TEST_REPO, branch=TEST_BRANCH
        )

        result = repo.bitbucket_util.bitbucket_utils.construct_bitbucket_branch_url(
            TEST_NOT_BITBUCKET_SERVICE, TEST_NOT_BITBUCKET_URL, TEST_ORG, TEST_REPO, TEST_BRANCH
        )

        self.assertEqual(expected_result, result)

    def test_get_clone_url_none(self):
        expected_result = None
        result = repo.bitbucket_util.bitbucket_utils.get_clone_url(None)

        self.assertEqual(expected_result, result)

    def test_get_clone_url_no_name(self):
        clone_list = [{"name": "jim"}]
        expected_result = None

        result = repo.bitbucket_util.bitbucket_utils.get_clone_url(clone_list)

        self.assertEqual(expected_result, result)

    def test_get_clone_url_no_href(self):
        clone_list = [{"name": "https"}]
        expected_result = None

        result = repo.bitbucket_util.bitbucket_utils.get_clone_url(clone_list)

        self.assertEqual(expected_result, result)

    def test_get_clone_url_no_username(self):
        href = "https://git.example.com/scm/testorg/testrepo.git"
        clone_list = [{"name": "https", "href": href}]
        expected_result = href

        result = repo.bitbucket_util.bitbucket_utils.get_clone_url(clone_list)

        self.assertEqual(expected_result, result)

    def test_get_clone_url_username(self):
        href = "https://git@git.example.com/scm/testorg/testrepo.git"
        clone_list = [
            {"name": "https", "href": href},
            {"href": "ssh://git@git.example.com/testorg/testrepo.git", "name": "ssh"},
        ]
        expected_result = "https://git.example.com/scm/testorg/testrepo.git"

        result = repo.bitbucket_util.bitbucket_utils.get_clone_url(clone_list)

        self.assertEqual(expected_result, result)

    def test_get_clone_url_server_repo(self):
        expected_result = "https://<baseURL>/scm/testorg/testrepo1.git"

        result = repo.bitbucket_util.bitbucket_utils.get_clone_url(TEST_PRIVATE_REPO_RESPONSE["links"]["clone"])

        self.assertEqual(expected_result, result)

    def test_get_repo_response_error_200_status_code(self):
        expected_result = None
        status_code = 200

        result = repo.bitbucket_util.bitbucket_utils.get_repo_response_error(status_code, None)

        self.assertEqual(expected_result, result)

    def test_get_repo_response_error_response_dict_none(self):
        expected_result = "Unknown error"
        status_code = 404

        result = repo.bitbucket_util.bitbucket_utils.get_repo_response_error(status_code, None)

        self.assertEqual(expected_result, result)

    def test_get_repo_response_error_response_dict_filled(self):
        error_message = "There was an error"
        expected_result = error_message
        status_code = 404
        response_dict = {"error": {"message": error_message}}

        result = repo.bitbucket_util.bitbucket_utils.get_repo_response_error(status_code, response_dict)

        self.assertEqual(expected_result, result)

    def test_verify_branch_exists_branch_name_none(self):
        expected_result = {"status": True, "response": None}
        result = repo.bitbucket_util.bitbucket_utils.verify_branch_exists_cloud(None, None, None)

        self.assertEqual(expected_result, result)

    @patch("repo.bitbucket_util.bitbucket_utils.query_bitbucket_api")
    def test_verify_branch_exists_status_code_404(self, branch_exists):
        self.assertEqual(repo.bitbucket_util.bitbucket_utils.query_bitbucket_api, branch_exists)
        branch_exists.return_value.status_code = 404
        return_text = "branch not found"
        branch_exists.return_value.text = return_text

        branch_name = "branch"

        expected_result = {"status": False, "response": return_text}
        result = repo.bitbucket_util.bitbucket_utils.verify_branch_exists_cloud(None, branch_name, None)

        self.assertEqual(expected_result, result)

    @patch("repo.bitbucket_util.bitbucket_utils.query_bitbucket_api")
    def test_verify_branch_exists_status_code_200(self, branch_exists):
        self.assertEqual(repo.bitbucket_util.bitbucket_utils.query_bitbucket_api, branch_exists)
        branch_exists.return_value.status_code = 200
        branch_exists.return_value.text = None
        branch_name = "branch"

        expected_result = {"status": True, "response": None}
        result = repo.bitbucket_util.bitbucket_utils.verify_branch_exists_cloud(branch_name, None, None)

        self.assertEqual(expected_result, result)

    def test_prep_for_repo_queue_private_repo_pass(self):
        test_branch = "monster"
        test_options_map = build_options_map(TEST_PRIVATE_REQ_LIST)
        name = "testorg/testrepo1"
        expected_queue_collection = repo.bitbucket_util.bitbucket_utils.RepoQueueFields(
            name,
            "https://<baseURL>/scm/testorg/testrepo1.git",
            0,
            "git.example.com",
            True,
            test_branch,
            test_options_map["testorg/testrepo1"],
        )

        repo_queue_collection = repo.bitbucket_util.bitbucket_utils.prep_for_repo_queue(
            TEST_PRIVATE_SERVICE, TEST_PRIVATE_REPO_RESPONSE, test_branch, test_options_map
        )
        self.assertTrue(expected_queue_collection == repo_queue_collection)
        # If you receive an error on this, installing testfixtures and uncommenting the line below will assist.
        # from testfixtures import compare
        # compare(repo_queue_collection, expected_queue_collection)

    @pytest.mark.integtest
    @patch("repo.bitbucket_util.bitbucket_utils.queue_repo")
    def test_process_public_bitbucket(self, queue_repo):
        self.assertEqual(repo.bitbucket_util.bitbucket_utils.queue_repo, queue_repo)
        queue_repo.return_value = "1111"
        service = "bitbucket"
        service_dict = self.services_dict.get(service)
        expected_queued_result = 1

        s_response = repo.bitbucket_util.bitbucket_utils.process_bitbucket(
            TEST_PUBLIC_REQ_LIST,
            service,
            service_dict.get("url"),
            service_dict.get("secret_loc"),
            False,
            identity=TEST_IDENTITY,
        )

        self.assertEqual(expected_queued_result, len(s_response.queued))

    @pytest.mark.skip("Skipping due to lack of valid integration")
    @pytest.mark.integtest
    @patch("repo.bitbucket_util.bitbucket_utils.queue_repo")
    def test_process_public_bitbucket_with_branch(self, queue_repo):
        self.assertEqual(repo.bitbucket_util.bitbucket_utils.queue_repo, queue_repo)
        queue_repo.return_value = "1111"
        service = "bitbucket"
        service_dict = self.services_dict.get(service)
        expected_queued_result = 1
        req_list = copy.deepcopy(TEST_PUBLIC_REQ_LIST)
        req_list[0]["branch"] = "master"

        s_response = repo.bitbucket_util.bitbucket_utils.process_bitbucket(
            req_list, service, service_dict.get("url"), service_dict.get("secret_loc"), False, identity=TEST_IDENTITY
        )

        self.assertEqual(expected_queued_result, len(s_response.queued))

    @pytest.mark.skip("Skipping due to lack of valid integration")
    @pytest.mark.integtest
    @patch("repo.bitbucket_util.bitbucket_utils.queue_repo")
    def test_process_private_bitbucket(self, queue_repo):
        # if test fails with AssertionError and includes "Error retrieving Bitbucket query: key is invalid"
        # Update the proxy key in nonprod
        self.assertEqual(repo.bitbucket_util.bitbucket_utils.queue_repo, queue_repo)
        queue_repo.return_value = "1111"

        service_dict = self.services_dict.get(TEST_PRIVATE_SERVICE)
        expected_queued_result = 1
        s_response = repo.bitbucket_util.bitbucket_utils.process_bitbucket(
            TEST_PRIVATE_REQ_LIST,
            TEST_PRIVATE_SERVICE,
            service_dict.get("url"),
            service_dict.get("secret_loc"),
            False,
            identity=TEST_IDENTITY,
        )

        self.assertEqual(expected_queued_result, len(s_response.queued))

    @pytest.mark.integtest
    @patch("repo.bitbucket_util.bitbucket_utils.queue_repo")
    def test_process_private_bitbucket_with_branch(self, queue_repo):
        # if test fails with AssertionError and includes "Error retrieving Bitbucket query: key is invalid"
        # Update the proxy key in nonprod
        self.assertEqual(repo.bitbucket_util.bitbucket_utils.queue_repo, queue_repo)
        queue_repo.return_value = "1111"
        req_list = copy.deepcopy(TEST_PRIVATE_REQ_LIST)
        req_list[0]["branch"] = "test-url-change-slack"

        service_dict = self.services_dict.get(TEST_PRIVATE_SERVICE)
        expected_queued_result = 1
        s_response = repo.bitbucket_util.bitbucket_utils.process_bitbucket(
            req_list,
            TEST_PRIVATE_SERVICE,
            service_dict.get("url"),
            service_dict.get("secret_loc"),
            False,
            identity=TEST_IDENTITY,
        )

        self.assertEqual(expected_queued_result, len(s_response.queued))
