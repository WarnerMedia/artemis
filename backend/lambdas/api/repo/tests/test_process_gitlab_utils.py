import unittest
from unittest.mock import patch

from repo.gitlab_util import process_gitlab_utils

SERVICE = "gitlab"
AUTHZ = [[["gitlab/*"]]]

GITLAB_QUERY_WITH_BRANCH_EXPECTED = """query GetRepos(
  $repo0: ID!
  $branch0: String!
) {
  repo0: project(
    fullPath: $repo0
  ) {
    httpUrlToRepo
    fullPath
    visibility
    statistics {
      repositorySize
    }
    repository {
      tree(
        ref: $branch0
      ) {
        lastCommit {
          id
        }
      }
    }
  }
}"""
GITLAB_QUERY_NO_BRANCH_EXPECTED = """query GetRepos(
  $repo0: ID!
) {
  repo0: project(
    fullPath: $repo0
  ) {
    httpUrlToRepo
    fullPath
    visibility
    statistics {
      repositorySize
    }
  }
}"""
GITLAB_QUERY_NO_BRANCH_EXPECTED2 = """query GetRepos(
  $repo1: ID!
) {
  repo1: project(
    fullPath: $repo1
  ) {
    httpUrlToRepo
    fullPath
    visibility
    statistics {
      repositorySize
    }
  }
}"""
BATCH_GITLAB_QUERY1 = """query GetRepos(
  $repo0: ID!
  $branch0: String!
  $repo1: ID!
) {
  repo0: project(
    fullPath: $repo0
  ) {
    httpUrlToRepo
    fullPath
    visibility
    statistics {
      repositorySize
    }
    repository {
      tree(
        ref: $branch0
      ) {
        lastCommit {
          id
        }
      }
    }
  }

  repo1: project(
    fullPath: $repo1
  ) {
    httpUrlToRepo
    fullPath
    visibility
    statistics {
      repositorySize
    }
  }
}"""
TEST_SERVICE_URL = None
TEST_QUERY_LIST = [
    "query GetRepos(  $repo0: ID!) {  repo0: project(    fullPath: $repo0  ) {    httpUrlToRepo    fullPath    visibility    statistics {      repositorySize    }  }}"
]
TEST_QUERY_RESPONSE = {
    "data": {
        "repo0": {
            "httpUrlToRepo": "https://test_gitlab_instance/test/test_package.git",
            "fullPath": "test/test_package",
            "visibility": "internal",
            "statistics": {"repositorySize": 8787066},
        }
    }
}

TEST_RESPONSE_DICT = {"data": {"repo0": TEST_QUERY_RESPONSE["data"]["repo0"]}}


class TestGitlabUtils(unittest.TestCase):
    @patch.object(process_gitlab_utils, "_get_query_response")
    def test_process_query_list(self, get_query_response):
        self.assertEqual(process_gitlab_utils._get_query_response, get_query_response)
        get_query_response.return_value = TEST_QUERY_RESPONSE
        resp = process_gitlab_utils.process_query_list(None, TEST_SERVICE_URL, TEST_QUERY_LIST, {}, False)
        self.assertEqual(TEST_RESPONSE_DICT, resp)

    def test_build_query_no_branch(self):
        request_list = [{"org": "testorg", "repo": "artemis"}]

        query_list, variables, _, _ = process_gitlab_utils.build_queries(
            req_list=request_list, authz=AUTHZ, service=SERVICE, batch_queries=True
        )

        self.assertEqual(query_list[0], GITLAB_QUERY_NO_BRANCH_EXPECTED)
        self.assertEqual(variables, {"repo0": "testorg/artemis"})

    def test_build_queries_branch(self):
        request_list = [{"org": "testorg", "repo": "artemis", "branch": "main"}]
        query_list, variables, _, _ = process_gitlab_utils.build_queries(
            req_list=request_list, authz=AUTHZ, service=SERVICE, batch_queries=True
        )
        self.assertEqual(query_list[0], GITLAB_QUERY_WITH_BRANCH_EXPECTED)
        self.assertEqual(variables, {"repo0": "testorg/artemis", "branch0": "main"})

    def test_build_queries_branch_nobatch(self):
        request_list = [{"org": "testorg", "repo": "artemis", "branch": "main"}]
        query_list, variables, _, _ = process_gitlab_utils.build_queries(
            req_list=request_list, authz=AUTHZ, service=SERVICE, batch_queries=False
        )
        self.assertEqual(query_list[0], GITLAB_QUERY_WITH_BRANCH_EXPECTED)
        self.assertEqual(variables, {"repo0": "testorg/artemis", "branch0": "main"})

    def test_multi_repos_with_batch_queries_true(self):
        request_list = [
            {"org": "testorg", "branch": "main", "repo": "artemis1"},
            {"org": "testorg", "branch": "", "repo": "artemis2"},
        ]
        query, query_map, variables, _ = process_gitlab_utils.build_queries(
            req_list=request_list, authz=AUTHZ, service=SERVICE, batch_queries=True
        )
        print(query)

        self.assertEqual(query[0], BATCH_GITLAB_QUERY1)

    def test_multi_repos_with_batch_queries_false(self):
        self.maxDiff = None
        request_list = [
            {"org": "testorg", "branch": "main", "repo": "artemis1"},
            {"org": "testorg", "branch": "", "repo": "artemis2"},
        ]
        query, query_map, variables, _ = process_gitlab_utils.build_queries(
            req_list=request_list, authz=AUTHZ, service=SERVICE, batch_queries=False
        )
        self.assertEqual(query[0], GITLAB_QUERY_WITH_BRANCH_EXPECTED)
        self.assertEqual(query[1], GITLAB_QUERY_NO_BRANCH_EXPECTED2)
