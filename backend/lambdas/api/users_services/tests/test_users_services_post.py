import json
import unittest
from copy import deepcopy
from unittest.mock import MagicMock, patch

from artemislib.datetime import format_timestamp, get_utc_datetime
from users_services.handlers import handler

TIMESTAMP = get_utc_datetime()

EMAIL = "testuser1@example.com"
EMPTY_OBJECT = type("", (), {})()
GITHUB_AUTH_CODE = "0123456789abcdef0123"
SERVICE_ID = "github"
SERVICE_USERNAME = "jdoe"
TIMESTAMP_FORMATTED = format_timestamp(TIMESTAMP)

USER_SERVICES_BODY = {"name": SERVICE_ID, "username": SERVICE_USERNAME, "linked": TIMESTAMP_FORMATTED}


class TestPost(unittest.TestCase):
    def test_add_user_service_as_admin(self):
        """
        Test adding a new service for a given user as an admin, using a username rather than an auth code
        """
        user_services = lambda **x: []
        result = _add_user_service(user_services, True, {"username": SERVICE_USERNAME})
        self.assertEqual(result["statusCode"], 200)
        self.assertEqual(json.loads(result["body"]), USER_SERVICES_BODY)

    def test_add_user_service(self):
        """
        Test adding a new service for a given user
        """
        user_services = lambda **x: []
        result = _add_user_service(user_services, False, {"auth_code": GITHUB_AUTH_CODE})
        self.assertEqual(result["statusCode"], 200)
        self.assertEqual(json.loads(result["body"]), USER_SERVICES_BODY)

    def test_add_user_service_exists(self):
        """
        Test adding a service for a given user when the service already exists for that user
        """
        user_services = lambda **x: [type("", (), {"service": SERVICE_ID})()]
        result = _add_user_service(user_services, False, {"auth_code": GITHUB_AUTH_CODE})
        self.assertEqual(result["statusCode"], 409)


def _add_user_service(user_services, admin: bool, params: dict):
    """
    Add a given service for a given user
    """
    event = {
        "httpMethod": "POST",
        "pathParameters": {"id": EMAIL},
        "requestContext": {
            "authorizer": {"principal": json.dumps({"id": EMAIL, "type": "user"}), "admin": str(admin).lower()},
            "identity": {"sourceIp": "127.0.0.1"},
        },
        "user_id": EMAIL,
        "body": json.dumps({"name": SERVICE_ID, "params": params}),
    }

    with (
        patch("users_services.post.get_github_username") as mock_get_github_username,
        patch("users_services.post.AWSConnect") as mock_aws_connect,
        patch("artemisdb.artemisdb.models.User.objects.get") as mock_get_user,
    ):
        get_obj = deepcopy(EMPTY_OBJECT)
        get_obj.userservice_set = deepcopy(EMPTY_OBJECT)
        get_obj.userservice_set.all = user_services
        get_obj.userservice_set.create = lambda **x: type(
            "", (), {"service": x["service"], "username": x["username"], "created": TIMESTAMP}
        )()

        mock_aws_connect_inst = MagicMock()
        mock_aws_connect_inst.invoke_lambda.return_value = None
        mock_aws_connect.return_value = mock_aws_connect_inst

        mock_get_github_username.return_value = SERVICE_USERNAME
        mock_get_user.return_value = get_obj

        return handler(event, {})
