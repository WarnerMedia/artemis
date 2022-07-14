import json
import unittest
from unittest.mock import PropertyMock, patch

from artemisdb.artemisdb.models import Group, User
from users.put import put

SERVICES = {"services": {"service1": {"allow_all": False}, "service2": {"allow_all": True}}, "repos": ["service1/org1"]}

EMAIL = "testuser@example.com"

AUTHZ = ["*"]
USER_RECORD = {
    "scan_orgs": ["service1/org1", "service2"],
    "email": EMAIL,
    "scope": AUTHZ,
    "admin": False,
    "features": {"foo": True},
    "last_login": None,
}


class TestPut(unittest.TestCase):
    def test_nonadmin(self):
        event = {"pathParameters": {"id": EMAIL}}

        resp = put(event, admin=False)

        self.assertEqual(resp["statusCode"], 403)
        body = json.loads(resp["body"])
        self.assertEqual(body["message"], "Unauthorized")

    def test_user_self(self):
        event = {
            "pathParameters": {"id": "self"},
            "body": json.dumps({"features": {"foo": True}}),
            "requestContext": {"identity": {"sourceIp": "127.0.0.1"}},
        }

        with patch("artemisdb.artemisdb.models.User.objects.get") as mock_get_user, patch(
            "artemislib.services.get_services_dict"
        ) as mock_get_dict, patch("artemisdb.artemisdb.models.User.save"), patch(
            "artemisdb.artemisdb.models.Group.save"
        ), patch(
            "artemisdb.artemisdb.models.User.groups", new_callable=PropertyMock
        ) as mock_groups:
            mock_get_user.return_value = User(email=EMAIL, scope=AUTHZ)
            mock_get_dict.return_value = SERVICES
            mock_groups.return_value.get.return_value = Group(name=EMAIL, scope=AUTHZ, self_group=True)
            mock_groups.return_value.filter.return_value = [Group(name=EMAIL, scope=AUTHZ, self_group=True)]
            resp = put(event, email=EMAIL, authz=AUTHZ, admin=True)

        self.assertEqual(resp["statusCode"], 200)
        body = json.loads(resp["body"])
        self.assertEqual(body, USER_RECORD)
