import unittest
from http import HTTPStatus

from artemisapi.response import response
from groups_keys.util.validators import INVALID_KEY_PERMISSIONS
from groups_members.get import get

EMAIL1 = "testuser1@example.com"
GROUP_ID = "87879daa-e6cb-4bf9-8575-649b00aff132"
GROUP_ID2 = "0b6a8a2e-6046-4435-9f7d-3dba29eb10da"
TEST_KEY_ID = "989f3a5b-dda8-46b7-80da-81a1f6120af7"

GROUP_AUTH_GROUP_ADMIN = {GROUP_ID: True}
GROUP_AUTH_NON_GROUP_ADMIN = {GROUP_ID: False}


class TestGroupsKeysGet(unittest.TestCase):
    def test_no_group_permissions(self):
        event = {"pathParameters": {"id": GROUP_ID2, "kid": TEST_KEY_ID}}
        resp = get(event, principal={"id": EMAIL1, "type": "user"}, group_auth=GROUP_AUTH_NON_GROUP_ADMIN, admin=False)

        self.assertEqual(response({"message": INVALID_KEY_PERMISSIONS}, code=HTTPStatus.BAD_REQUEST), resp)
