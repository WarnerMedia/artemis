import unittest
from repo.gitlab_util.process_gitlab_utils import build_queries

ORG = "org"
SERVICE = "gitlab"
AUTHZ = [[["gitlab/*"]]]


class TestGitLab(unittest.TestCase):
    def test_single_repo_with_no_branch(self):
        expected_query = """query GetRepos(
  $org: String!
  $repo0: String!
) {
  repo0: repository(
    owner: $org
    name: $repo0
  ) {
    url
    nameWithOwner
    isPrivate
    diskUsage
  }
}"""
        expected_vars = {"org": ORG, "repo0": "artemis"}
        req_list = [{"org": ORG, "branch": "", "repo": "artemis"}]
        query, _, variables, _ = build_queries(ORG, req_list, SERVICE, AUTHZ)
        self.assertEqual(query, expected_query)
        self.assertEqual(variables, expected_vars)

    def test_single_repo_with_branch(self):
        pass

    def test_multi_repos_with_no_branches(self):
        pass

    def test_multi_repos_with_some_branches(self):
        expected_query = """query GetRepos(
  $org: String!
  $repo0: String!
  $branch0: String!
  $repo1: String!
  $repo2: String!
  $branch2: String!
  $repo3: String!
  $branch3: String!
) {
  repo0: repository(
    owner: $org
    name: $repo0
  ) {
    url
    nameWithOwner
    isPrivate
    diskUsage
    ref(
      qualifiedName: $branch0
    ) {
      name
    }
  }

  repo1: repository(
    owner: $org
    name: $repo1
  ) {
    url
    nameWithOwner
    isPrivate
    diskUsage
  }

  repo2: repository(
    owner: $org
    name: $repo2
  ) {
    url
    nameWithOwner
    isPrivate
    diskUsage
    ref(
      qualifiedName: $branch2
    ) {
      name
    }
  }

  repo3: repository(
    owner: $org
    name: $repo3
  ) {
    url
    nameWithOwner
    isPrivate
    diskUsage
    ref(
      qualifiedName: $branch3
    ) {
      name
    }
  }
}"""
        expected_vars = {
            "org": ORG,
            "repo0": "artemis1",
            "branch0": "main",
            "repo1": "artemis2",
            "repo2": "artemis3",
            "branch2": "main",
            "repo3": "artemis4",
            "branch3": "main",
        }
        req_list = [
            {"org": ORG, "branch": "main", "repo": "artemis1"},
            {"org": ORG, "branch": "", "repo": "artemis2"},
            {"org": ORG, "branch": "main", "repo": "artemis3"},
            {"org": ORG, "branch": "main", "repo": "artemis4"},
        ]
        query, query_map, variables, _ = build_queries(ORG, req_list, SERVICE, AUTHZ)
        self.assertEqual(query, expected_query)
        self.assertEqual(len(query_map), 4)
        self.assertEqual(variables, expected_vars)
