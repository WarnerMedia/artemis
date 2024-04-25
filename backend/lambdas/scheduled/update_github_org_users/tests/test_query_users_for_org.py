import unittest
import requests
import responses
from update_github_org_users.util.github import query_users_for_org

def noop():
    pass

class TestQueryUsersForOrg(unittest.TestCase):
    @responses.activate
    def test_query_users_for_org(self):
        responses.add(
            responses.POST,
            "https://api.github.com/graphql",
            json={"data":{"q1":{"organization":{"login":"WarnerMedia"}}}},
            status=200,
        )
        authorization = "noauth"
        org = "WarnerMedia"
        github_users = []
        github_user = {}
        github_user["artemis_user_id"] = "1234"
        github_user["username"] = "test_user"
        github_user["query_name"] = "q1"
        github_users.append(github_user)
        query_response = query_users_for_org(authorization, github_users, org)
        data = query_response.get("data")
        if data:
            data_user = data.get(github_user["query_name"])
        if data_user:
            user_in_organization = data_user.get("organization")
        self.assertEqual(user_in_organization, {"login":"WarnerMedia"})
