import unittest

from repo.util.authorize import allowlist_is_denied
from repo.util.utils import auth

AUTHZ = [  # List of group chains
    [["service1/org/repo"]],  # Group chain 1 with a single group
    [["service2/org/repo"], ["service2/org/*"]],  # Group chain 2 with two groups
    [  # Group chain 3
        ["service3/org1/repo"],  # Child group in chain 3
        ["service3/org2/*"],  # Parent group in chain 3 with conflicting scope
    ],
]


class TestAuth(unittest.TestCase):
    def test_auth_fail_authz_empty(self):
        result = auth("repo", "service", [])

        self.assertFalse(result, False)

    def test_auth(self):
        test_cases = [
            {"service": "service1", "repo": "org/repo", "result": True},
            {"service": "service1", "repo": "org/repo2", "result": False},
            {"service": "service2", "repo": "org/repo", "result": True},
            {"service": "service2", "repo": "org/repo2", "result": False},
            {"service": "service3", "repo": "org1/repo", "result": False},
        ]

        for test_case in test_cases:
            with self.subTest(test_case=test_case):
                result = auth(test_case["repo"], test_case["service"], AUTHZ)
                self.assertEqual(result, test_case["result"])

    def test_wildcard_api_auth(self):
        # This is the authz from an API key where the key was generated with wildcard
        # scope but the user is restricted to a single repo
        api_auth = [[["*"], ["service/org1/repo1"], ["service/org1/repo*"], ["service/org1/*"]]]

        test_cases = [
            {"service": "service", "repo": "org1/repo1", "result": True},
            {"service": "service", "repo": "org2/repo1", "result": False},
        ]

        for test_case in test_cases:
            with self.subTest(test_case=test_case):
                result = auth(test_case["repo"], test_case["service"], api_auth)
                self.assertEqual(result, test_case["result"])

    def test_wildcard_api_auth_multiple_groups(self):
        # This is the authz from an API key where the key was generated with wildcard
        # scope but the user is restricted to a single repo directly and restricted to
        # a different repo via a group
        api_auth = [[["*"], ["service/org1/repo1"]], [["*"], ["service/org1/repo2"]]]

        test_cases = [
            {"service": "service", "repo": "org1/repo1", "result": True},
            {"service": "service", "repo": "org1/repo2", "result": True},
            {"service": "service", "repo": "org2/repo1", "result": False},
        ]

        for test_case in test_cases:
            with self.subTest(test_case=test_case):
                result = auth(test_case["repo"], test_case["service"], api_auth)
                self.assertEqual(result, test_case["result"])

    def test_wildcard_api_auth_no_scope(self):
        # This is the authz from an API key where the key was generated with wildcard
        # scope but the user has no scope and is restricted to a repo via a group
        api_auth = [[[]], [["*"], ["service/org1/repo2"]]]

        test_cases = [
            {"service": "service", "repo": "org1/repo1", "result": False},
            {"service": "service", "repo": "org1/repo2", "result": True},
            {"service": "service", "repo": "org2/repo1", "result": False},
        ]

        for test_case in test_cases:
            with self.subTest(test_case=test_case):
                result = auth(test_case["repo"], test_case["service"], api_auth)
                self.assertEqual(result, test_case["result"])

    def test_allowlist_deny(self):
        test_cases = [
            {"method": "GET", "resource": None, "result": False},
            {"method": "POST", "resource": None, "result": False},
            {"method": "PUT", "resource": None, "result": False},
            {"method": "DELETE", "resource": None, "result": False},
            {"method": "GET", "resource": "whitelist", "result": False},
            {"method": "POST", "resource": "whitelist", "result": True},
            {"method": "PUT", "resource": "whitelist", "result": True},
            {"method": "DELETE", "resource": "whitelist", "result": True},
        ]

        for test_case in test_cases:
            with self.subTest(test_case=test_case):
                result = allowlist_is_denied(test_case["method"], test_case["resource"], "service", "repo", ["*"])
                self.assertEqual(result, test_case["result"])
