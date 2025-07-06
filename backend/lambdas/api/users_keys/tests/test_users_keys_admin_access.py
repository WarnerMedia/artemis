import unittest
from unittest.mock import patch
from users_keys.handlers import handler

class TestUsersKeysAdminAccess(unittest.TestCase):
    """Test admin access functionality for users_keys API."""

    def setUp(self):
        """Set up test fixtures."""
        self.base_event = {
            "httpMethod": "GET",
            "requestContext": {
                "authorizer": {
                    "principal": '{"id": "admin@example.com", "type": "user"}',
                    "admin": "true",
                    "scope": "[]",
                    "features": "{}"
                },
                "identity": {"sourceIp": "1.2.3.4"}
            },
            "pathParameters": {"id": "otheruser@example.com"},
            "queryStringParameters": {},
        }

    def test_admin_can_access_other_users_keys(self):
        """Test that an admin can access another user's keys."""
        with patch("users_keys.get.get", return_value={"statusCode": 200}) as mock_get, \
             patch("users_keys.util.parsers.parse_event", return_value={"user_id": "otheruser@example.com"}):
            resp = handler(self.base_event, None)
            self.assertEqual(resp["statusCode"], 200)
            mock_get.assert_called_with({"user_id": "otheruser@example.com"}, email="otheruser@example.com")

    def test_nonadmin_cannot_access_other_users_keys(self):
        """Test that a non-admin cannot access another user's keys."""
        event = dict(self.base_event)
        event["requestContext"] = dict(self.base_event["requestContext"])
        event["requestContext"]["authorizer"] = dict(self.base_event["requestContext"]["authorizer"])
        event["requestContext"]["authorizer"]["admin"] = "false"
        
        with patch("users_keys.util.parsers.parse_event", return_value={"user_id": "otheruser@example.com"}):
            resp = handler(event, None)
            self.assertEqual(resp["statusCode"], 403)

    def test_user_can_access_own_keys(self):
        """Test that a user can access their own keys."""
        event = dict(self.base_event)
        event["requestContext"] = dict(self.base_event["requestContext"])
        event["requestContext"]["authorizer"] = dict(self.base_event["requestContext"]["authorizer"])
        event["requestContext"]["authorizer"]["principal"] = '{"id": "user@example.com", "type": "user"}'
        event["pathParameters"] = {"id": "user@example.com"}
        
        with patch("users_keys.get.get", return_value={"statusCode": 200}) as mock_get, \
             patch("users_keys.util.parsers.parse_event", return_value={"user_id": "user@example.com"}):
            resp = handler(event, None)
            self.assertEqual(resp["statusCode"], 200)
            mock_get.assert_called_with({"user_id": "user@example.com"}, email="user@example.com")
