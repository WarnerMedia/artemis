import json
import unittest
from unittest.mock import patch

from artemisdb.artemisdb.models import User, UserService
from artemislib.datetime import format_timestamp, get_utc_datetime
from users_services.handlers import handler

EMAIL = "testuser1@example.com"
SERVICE_ID = "github"
SERVICE_USERNAME = "jdoe"

TIMESTAMP = get_utc_datetime()
TIMESTAMP_FORMATTED = format_timestamp(TIMESTAMP)

USER_SERVICE_BODY = {"name": SERVICE_ID, "username": SERVICE_USERNAME, "linked": TIMESTAMP_FORMATTED}
USER_SERVICES_BODY = [{"name": SERVICE_ID, "username": SERVICE_USERNAME, "linked": TIMESTAMP_FORMATTED}]


class TestGet(unittest.TestCase):
    def test_get_user_service(self):
        """
        Test getting a service for a given user
        """
        event = {
            "httpMethod": "GET",
            "pathParameters": {"id": EMAIL, "sid": SERVICE_ID},
            "requestContext": {
                "authorizer": {"principal": json.dumps({"id": EMAIL, "type": "user"}), "admin": "false"},
                "identity": {"sourceIp": "127.0.0.1"},
            },
            "user_id": EMAIL,
        }

        with (
            patch("artemisdb.artemisdb.models.User.objects.get") as mock_get_user,
            patch("artemisdb.artemisdb.models.UserService.objects.get") as mock_get_users_services,
            patch("artemisdb.artemisdb.models.UserService.objects.filter") as mock_filter_users_services,
        ):
            mock_get_user.return_value = User(email=EMAIL)

            mock_get_users_services.return_value = UserService(
                service=SERVICE_ID, username=SERVICE_USERNAME, created=TIMESTAMP
            )

            mock_filter_users_services.return_value = [
                UserService(service=SERVICE_ID, username=SERVICE_USERNAME, created=TIMESTAMP)
            ]

            resp = handler(event, {})

        self.assertEqual(resp["statusCode"], 200)
        body = json.loads(resp["body"])
        self.assertEqual(body, USER_SERVICE_BODY)

    def test_get_user_services(self):
        """
        Test getting all services for a given user
        """
        event = {
            "httpMethod": "GET",
            "pathParameters": {"id": EMAIL},
            "requestContext": {
                "authorizer": {"principal": json.dumps({"id": EMAIL, "type": "user"}), "admin": "false"},
                "identity": {"sourceIp": "127.0.0.1"},
            },
            "user_id": EMAIL,
        }

        with (
            patch("artemisdb.artemisdb.models.User.objects.get") as mock_get_user,
            patch("artemisdb.artemisdb.models.UserService.objects.get") as mock_get_users_services,
            patch("artemisdb.artemisdb.models.UserService.objects.filter") as mock_filter_users_services,
        ):
            mock_get_user.return_value = User(email=EMAIL)

            mock_get_users_services.return_value = UserService(
                service=SERVICE_ID, username=SERVICE_USERNAME, created=TIMESTAMP
            )

            mock_filter_users_services.return_value = [
                UserService(service=SERVICE_ID, username=SERVICE_USERNAME, created=TIMESTAMP)
            ]

            resp = handler(event, {})

        self.assertEqual(resp["statusCode"], 200)
        body = json.loads(resp["body"])
        self.assertEqual(body, USER_SERVICES_BODY)
