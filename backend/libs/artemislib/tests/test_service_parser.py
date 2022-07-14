import unittest

# pylint: disable=no-name-in-module
from artemislib.services import ServiceParser


class TestServiceParser(unittest.TestCase):
    def setUp(self):
        orgs = [
            "someservice/*",
            "bitbucket/orgfoo/*",
            "github/orgbar",
            "github/orgbaz",
            "github/some-org/*",
            "github/some-other-org",
        ]
        self.services_parser = ServiceParser(orgs)

    def test_parse_services_for_user_unrestricted(self):
        # * will match all services and orgs
        authz = ["*"]
        expected_orgs = [
            "bitbucket/orgfoo",
            "github/orgbar",
            "github/orgbaz",
            "github/some-org",
            "github/some-other-org",
            "someservice",
        ]

        scan_orgs = self.services_parser.get_services_and_orgs(authz)

        self.assertEqual(scan_orgs, expected_orgs)

    def test_parse_services_for_user_service_org_wildcard(self):
        # <service>/<org>*
        authz = ["bitbucket/orgfoo/*", "github/ORGFOO/*"]
        expected_orgs = [
            "bitbucket/orgfoo",
        ]

        scan_orgs = self.services_parser.get_services_and_orgs(authz)

        self.assertEqual(scan_orgs, expected_orgs)

    def test_parse_services_for_user_service_org_repo(self):
        # <service>/<org>/repo
        authz = ["github/some-org/repo-a*", "github/some-org/rep-b*", "github/some-org/demo-repo"]
        expected_orgs = [
            "github/some-org",
        ]

        scan_orgs = self.services_parser.get_services_and_orgs(authz)

        self.assertEqual(scan_orgs, expected_orgs)

    def test_parse_more_restricted(self):
        # Test when the authz is more restrictive than the org
        authz = ["someservice/org/*"]
        expected_orgs = ["someservice"]

        scan_orgs = self.services_parser.get_services_and_orgs(authz)

        self.assertEqual(scan_orgs, expected_orgs)

    def test_parse_wildcard_org(self):
        # Test when the authz is more restrictive than the org
        authz = ["someservice/org*/*", "github/org*/*"]
        expected_orgs = ["github/orgbar", "github/orgbaz", "someservice"]

        scan_orgs = self.services_parser.get_services_and_orgs(authz)

        self.assertEqual(scan_orgs, expected_orgs)
