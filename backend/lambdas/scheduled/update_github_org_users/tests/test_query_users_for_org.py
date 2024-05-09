import unittest

from update_github_org_users.util.github import _build_queries

ORG = "org"


class TestQueryUsersForOrg(unittest.TestCase):
    def test_query_single_user_for_org(self):
        expected_query = """query GetUsers(
  $org: String!
  $q1: String!
) {
  q1: user(
    login: $q1
  ) {
    organization(
      login: $org
    ) {
      login
    }
  }
}"""
        github_users = [{"artemis_user_id": "1234", "username": "test-user", "query_name": "q1"}]
        query, variables = _build_queries(ORG, github_users)
        self.assertEqual(query, expected_query)
        self.assertEqual(variables, {"org": ORG, "q1": "test-user"})

    def test_query_users_for_org(self):
        expected_query = """query GetUsers(
  $org: String!
  $q1: String!
  $q2: String!
  $q3: String!
) {
  q1: user(
    login: $q1
  ) {
    organization(
      login: $org
    ) {
      login
    }
  }

  q2: user(
    login: $q2
  ) {
    organization(
      login: $org
    ) {
      login
    }
  }

  q3: user(
    login: $q3
  ) {
    organization(
      login: $org
    ) {
      login
    }
  }
}"""
        expected_vars = {"q1": "test-user1", "q2": "test-user2", "q3": "test-user3", "org": ORG}
        github_users = [
            {"artemis_user_id": "1234", "username": "test-user1", "query_name": "q1"},
            {"artemis_user_id": "12345", "username": "test-user2", "query_name": "q2"},
            {"artemis_user_id": "123456", "username": "test-user3", "query_name": "q3"},
        ]
        query, variables = _build_queries(ORG, github_users)
        self.assertEqual(query, expected_query)
        self.assertEqual(variables, expected_vars)
