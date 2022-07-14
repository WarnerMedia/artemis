import json
import unittest
from copy import deepcopy
from unittest.mock import patch

from artemislib.datetime import get_utc_datetime
from users_services.handlers import handler

EMAIL = "testuser1@example.com"
EMPTY_OBJECT = type("", (), {})()
SERVICE_ID = "github"
SERVICE_USERNAME = "jdoe"
TIMESTAMP = get_utc_datetime()


class TestDelete(unittest.TestCase):
    def test_del_user_service(self):
        """
        Test deleting a linked service for a given user
        This test should be successful
        """
        event = {
            "httpMethod": "DELETE",
            "pathParameters": {"id": EMAIL, "sid": SERVICE_ID},
            "requestContext": {
                "authorizer": {"principal": json.dumps({"id": EMAIL, "type": "user"}), "admin": "false"},
                "identity": {"sourceIp": "127.0.0.1"},
            },
            "user_id": EMAIL,
        }

        with patch("artemisdb.artemisdb.models.UserService.objects.filter") as mock_users_services_filter:
            filter_obj = deepcopy(EMPTY_OBJECT)

            # 1 matching user service was found
            filter_obj.delete = lambda **x: (1, None)

            mock_users_services_filter.return_value = filter_obj

            resp = handler(event, {})

        self.assertEqual(resp["statusCode"], 204)
