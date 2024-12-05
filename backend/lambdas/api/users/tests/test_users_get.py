import json
import unittest
from unittest.mock import PropertyMock, patch

from artemisdb.artemisdb.models import Group, User, UserService
from users.get import get

SERVICES = {
    "services": {"service1": {"allow_all": False}, "service2": {"allow_all": True}, "service3": {"allow_all": True}},
    "repos": ["service1/org1"],
}

EMAIL1 = "testuser1@example.com"
EMAIL2 = "testuser2@example.com"

AUTHZ = ["*"]
USER_RECORD = {
    "scan_orgs": ["service1/org1", "service2", "service3"],
    "email": EMAIL1,
    "scope": AUTHZ,
    "admin": False,
    "features": {},
    "last_login": None,
}
PAGE = {"results": [], "count": 0, "next": None, "previous": None}

LIMITED_AUTHZ = ["service2/*", "service3/org/*"]
LIMITED_USER_RECORD = {
    "scan_orgs": ["service2", "service3"],
    "email": EMAIL1,
    "scope": LIMITED_AUTHZ,
    "admin": False,
    "features": {},
    "last_login": None,
}


class TestGet(unittest.TestCase):
    def test_invalid_user_id(self):
        event = {"pathParameters": {"id": "foo"}}

        with patch("artemisdb.artemisdb.models.User.objects.get") as mock_get_user:
            mock_get_user.side_effect = User.DoesNotExist
            resp = get(event)

        self.assertEqual(resp["statusCode"], 404)
        body = json.loads(resp["body"])
        self.assertEqual(body["message"], "Not Found")

    def test_user_self(self):
        event = {"pathParameters": {"id": "self"}}

        with (
            patch("artemisdb.artemisdb.models.UserService.objects.filter") as mock_filter_userservice,
            patch("artemisdb.artemisdb.models.User.objects.get") as mock_get_user,
            patch("artemisdb.artemisdb.models.User.scan_orgs", USER_RECORD["scan_orgs"]),
            patch("artemisdb.artemisdb.models.UserService.objects.get") as mock_get_userservice,
            patch("artemislib.services.get_services_dict") as mock_get_dict,
        ):
            mock_filter_userservice.return_value = []
            mock_get_dict.return_value = SERVICES
            mock_get_user.return_value = User(email=EMAIL1, scope=AUTHZ)
            mock_get_userservice.return_value = UserService()

            resp = get(event, email=EMAIL1, authz=AUTHZ)

        self.assertEqual(resp["statusCode"], 200)
        body = json.loads(resp["body"])
        self.assertEqual(body, USER_RECORD)

    def test_user_id(self):
        event = {"pathParameters": {"id": EMAIL1}}

        with (
            patch("artemisdb.artemisdb.models.UserService.objects.filter") as mock_filter_userservice,
            patch("artemisdb.artemisdb.models.User.objects.get") as mock_get_user,
            patch("artemisdb.artemisdb.models.User.scan_orgs", USER_RECORD["scan_orgs"]),
            patch("artemisdb.artemisdb.models.UserService.objects.get") as mock_get_userservice,
            patch("artemislib.services.get_services_dict") as mock_get_dict,
        ):
            mock_filter_userservice.return_value = []
            mock_get_dict.return_value = SERVICES
            mock_get_user.return_value = User(email=EMAIL1, scope=AUTHZ)
            mock_get_userservice.return_value = UserService()

            resp = get(event, email=EMAIL1, authz=AUTHZ)

        self.assertEqual(resp["statusCode"], 200)
        body = json.loads(resp["body"])
        self.assertEqual(body, USER_RECORD)

    def test_user_limited_authz(self):
        event = {"pathParameters": {"id": "self"}}

        with (
            patch("artemisdb.artemisdb.models.UserService.objects.filter") as mock_filter_userservice,
            patch("artemisdb.artemisdb.models.User.objects.get") as mock_get_user,
            patch("artemisdb.artemisdb.models.User.scan_orgs", LIMITED_USER_RECORD["scan_orgs"]),
            patch("artemisdb.artemisdb.models.UserService.objects.get") as mock_get_userservice,
            patch("artemislib.services.get_services_dict") as mock_get_dict,
        ):
            mock_filter_userservice.return_value = []
            mock_get_dict.return_value = SERVICES
            mock_get_user.return_value = User(email=EMAIL1, scope=LIMITED_AUTHZ)
            mock_get_userservice.return_value = UserService()

            resp = get(event, email=EMAIL1, authz=LIMITED_AUTHZ)

        self.assertEqual(resp["statusCode"], 200)
        body = json.loads(resp["body"])
        self.assertEqual(body, LIMITED_USER_RECORD)

    def test_user_list_legacy_key(self):
        # Legacy API keys don't have email addresses attached
        resp = get(event={}, email=None, authz=AUTHZ, admin=False)

        self.assertEqual(resp["statusCode"], 200)
        body = json.loads(resp["body"])
        self.assertEqual(body, PAGE)
