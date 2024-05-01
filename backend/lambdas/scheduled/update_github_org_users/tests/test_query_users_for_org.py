import unittest
import responses
from data.introspection_json import introspection
from update_github_org_users.util.github import _get_client, _build_queries
from graphql import print_ast


def noop():
    pass


class TestQueryUsersForOrg(unittest.TestCase):
    @responses.activate()
    def test_query_single_user_for_org(self):
        expected_query = """query ($q1: String!, $org: String!) {
  q1: user(login: $q1) {
    organization(login: $org) {
      login
    }
  }
}"""
        responses.add(responses.POST, "https://api.github.com/graphql", json=introspection, status=200)
        client = _get_client("")
        with client as session:
            org = "artemis"
            github_users = [{"artemis_user_id": "1234", "username": "test-user", "query_name": "q1"}]
            query, variables = _build_queries(client, org, github_users)
            self.assertEqual(print_ast(query), expected_query)
            self.assertEqual(variables, {"org": "artemis", "q1": "test-user"})

    @responses.activate()
    def test_query_users_for_org(self):
        expected_query = """query ($q1: String!, $org: String!, $q2: String!, $q3: String!) {
  q1: user(login: $q1) {
    organization(login: $org) {
      login
    }
  }
  q2: user(login: $q2) {
    organization(login: $org) {
      login
    }
  }
  q3: user(login: $q3) {
    organization(login: $org) {
      login
    }
  }
}"""
        expected_vars = {"q1": "test-user1", "q2": "test-user2", "q3": "test-user3", "org": "artemis"}
        responses.add(responses.POST, "https://api.github.com/graphql", json=introspection, status=200)
        client = _get_client("")
        with client as session:
            org = "artemis"
            github_users = [
                {"artemis_user_id": "1234", "username": "test-user1", "query_name": "q1"},
                {"artemis_user_id": "12345", "username": "test-user2", "query_name": "q2"},
                {"artemis_user_id": "123456", "username": "test-user3", "query_name": "q3"},
            ]
            query, variables = _build_queries(client, org, github_users)
            self.assertEqual(print_ast(query), expected_query)
            self.assertEqual(variables, expected_vars)
