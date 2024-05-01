import json
import unittest
from http import HTTPStatus
from unittest.mock import patch

import groups_keys
from artemisapi.response import response
from artemisdb.artemisdb.models import Group, User
from groups_keys.post import post

EMAIL1 = "testuser1@example.com"
GROUP_ID = "87879daa-e6cb-4bf9-8575-649b00aff132"
GROUP_ID2 = "0b6a8a2e-6046-4435-9f7d-3dba29eb10da"
TEST_KEY_ID = "989f3a5b-dda8-46b7-80da-81a1f6120af7"
TEST_GROUP = Group(name="Test", scope=["*"], features={})
TEST_USER = User(email=EMAIL1, scope=["*"], features={})

GROUP_AUTH_GROUP_ADMIN = {GROUP_ID: True}
GROUP_AUTH_NON_GROUP_ADMIN = {GROUP_ID: False}


@patch("authorizer.handlers.AuditLogger.__init__", lambda *x, **y: None)
class TestGroupsKeysPost(unittest.TestCase):
    def test_key_id_provided(self):
        event = {
            "pathParameters": {"id": GROUP_ID, "kid": TEST_KEY_ID},
            "body": json.dumps({"name": "test_key", "scope": ["*"]}),
        }
        resp = post(
            event,
            principal={"id": EMAIL1, "type": "user"},
            group_auth=GROUP_AUTH_NON_GROUP_ADMIN,
            authz=["*"],
            features={},
            admin=False,
        )

        self.assertEqual(response(code=HTTPStatus.BAD_REQUEST), resp)

    def test_group_keys_post(self):
        with patch("groups_keys.post.generate_api_key") as mock_generate_api_key, patch(
            "artemisdb.artemisdb.models.User.objects.get"
        ) as mock_user_get, patch("artemisdb.artemisdb.models.Group.objects.get") as mock_group_get:
            self.assertEqual(groups_keys.post.generate_api_key, mock_generate_api_key)
            mock_user_get.return_value = TEST_USER
            mock_group_get.return_value = TEST_GROUP
            mock_generate_api_key.return_value = "test_key"
            event = {
                "pathParameters": {"id": GROUP_ID},
                "body": json.dumps({"name": "test_key", "scope": ["*"]}),
            }
            resp = post(
                event,
                principal={"id": EMAIL1, "type": "user"},
                group_auth=GROUP_AUTH_GROUP_ADMIN,
                authz=["*"],
                features={},
                admin=False,
                source_ip="127.0.0.1",
            )
            self.assertEqual(response({"key": "test_key"}), resp)
