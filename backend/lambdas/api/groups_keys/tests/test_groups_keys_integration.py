import json
import time
import unittest
from http import HTTPStatus

import pytest
from test_utils_group_keys.create_records_group_keys import (
    create_group_keys,
    create_group_members,
    create_groups,
    create_user,
)

from artemisapi.response import response
from artemisdb.artemisdb.helpers.groups import GroupsDBHelper
from groups_keys.delete import delete
from groups_keys.get import get
from groups_keys.post import post
from groups_keys.util.validators import KEY_OUT_OF_USER_SCOPE

TEST_USER = {"email": f"{time.time_ns()}@testuser.com", "scope": ["service/org/repo"], "features": {}, "admin": True}
TEST_USER2 = {"email": f"{time.time_ns()}@testuser2.com", "scope": ["service/org/repo"], "features": {}, "admin": True}


@pytest.mark.integtest
class TestGroupsKeysDbCalls(unittest.TestCase):
    """
    Test Class relies on the artemisdb docker container being up.
    """

    @classmethod
    def setUpClass(cls) -> None:
        cls.db_caller = GroupsDBHelper()
        cls.test_user = create_user(db_caller=cls.db_caller, **TEST_USER)
        cls.test_user2 = create_user(db_caller=cls.db_caller, **TEST_USER2)
        groups = create_groups(cls.db_caller, cls.test_user, None, 2)

        cls.test_group_1 = groups[0]
        cls.test_group_2 = groups[1]

        cls.test_group_1_group_id = str(groups[0].group_id)
        cls.test_group_2_group_id = str(groups[1].group_id)

        create_group_members(
            cls.db_caller,
            [
                {"group": cls.test_group_1, "user": cls.test_user, "group_admin": True},
                {"group": cls.test_group_2, "user": cls.test_user2, "group_admin": True},
            ],
        )

        group_keys = create_group_keys(
            cls.db_caller,
            [
                {
                    "group": cls.test_group_1,
                    "user": cls.test_user,
                    "name": "test_key1",
                    "scope": ["github/testorg/test_scope"],
                    "features": {},
                    "admin": True,
                },
                {
                    "group": cls.test_group_1,
                    "user": cls.test_user2,
                    "name": "test_key2",
                    "scope": ["github/*"],
                    "features": {},
                    "admin": False,
                },
            ],
        )

        cls.test_group_key_1 = group_keys[0]
        cls.test_group_key_2 = group_keys[1]

        cls.test_group_1_key_id = str(group_keys[0].key_id)
        cls.test_group_2_key_id = str(group_keys[1].key_id)

        cls.delete_groups = []
        for group in groups:
            cls.delete_groups.append(str(group.group_id))

    @classmethod
    def tearDownClass(cls) -> None:
        cls.db_caller.user.objects.filter(email__in=[TEST_USER["email"], TEST_USER2["email"]]).delete()
        cls.db_caller.group.objects.filter(group_id__in=cls.delete_groups).delete()

    def test_get_group_key(self):
        get_event = {
            "pathParameters": {"id": self.test_group_1_group_id, "kid": self.test_group_1_key_id},
        }
        group_key = get(
            event=get_event,
            principal={"id": self.test_user.email},
            group_auth={self.test_group_1_group_id: True},
            admin=True,
        )
        self.assertIsInstance(group_key, dict)

    def test_get_group_key_admin_list(self):
        get_list_event = {
            "pathParameters": {"id": self.test_group_1_group_id},
        }
        group_keys = get(
            event=get_list_event,
            principal={"id": self.test_user.email},
            group_auth={self.test_group_1_group_id: True},
            admin=True,
        )
        body = json.loads(group_keys.get("body"))
        group_key_ids = {str(group_key["id"]) for group_key in body["results"]}
        self.assertEqual({self.test_group_1_key_id, self.test_group_2_key_id}, group_key_ids)

    def test_get_group_key_group_admin_list(self):
        get_list_event = {
            "pathParameters": {"id": self.test_group_1_group_id},
        }
        group_keys = get(
            event=get_list_event,
            principal={"id": self.test_user.email},
            group_auth={self.test_group_1_group_id: True},
            admin=False,
        )
        body = json.loads(group_keys.get("body"))
        group_key_ids = {str(group_key["id"]) for group_key in body["results"]}
        self.assertEqual({self.test_group_1_key_id, self.test_group_2_key_id}, group_key_ids)

    def test_create_delete_group_key_admin(self):
        # Post a group_key
        post_event = {
            "pathParameters": {"id": self.test_group_2_group_id},
            "body": json.dumps({"name": "test_key3", "scope": ["github/testorg/test_scope"]}),
        }

        group_key = post(
            event=post_event,
            principal={"id": self.test_user2.email},
            group_auth={self.test_group_2_group_id: False},
            authz=["*"],
            admin=True,
            features={},
        )
        body = json.loads(group_key.get("body"))
        # Parse the key_id from the full key.
        key_id = body["key"][0:36]

        # Make sure the post was successful by checking the group_key exists
        get_event = {
            "pathParameters": {"id": self.test_group_2_group_id, "kid": str(key_id)},
        }
        group_key = get(
            event=get_event,
            principal={"id": self.test_user2.email},
            group_auth={self.test_group_2_group_id: True},
            admin=True,
        )
        self.assertIsInstance(group_key, dict)
        body = json.loads(group_key.get("body"))

        # Delete the group_key
        delete_event = {"pathParameters": {"id": self.test_group_2_group_id, "kid": str(body["id"])}}
        delete_result = delete(
            event=delete_event,
            principal={"id": self.test_user2.email},
            group_auth={self.test_group_2_group_id: False},
            admin=True,
        )
        self.assertEqual(delete_result["statusCode"], HTTPStatus.NO_CONTENT)

    def test_create_delete_group_key_group_admin(self):
        # Post a group_key
        post_event = {
            "pathParameters": {"id": self.test_group_2_group_id},
            "body": json.dumps({"name": "test_key3", "scope": ["github/testorg/test_scope"]}),
        }

        group_key = post(
            event=post_event,
            principal={"id": self.test_user2.email},
            group_auth={self.test_group_2_group_id: True},
            authz=["*"],
            admin=False,
            features={},
        )
        body = json.loads(group_key.get("body"))
        # Parse the key_id from the full key.
        key_id = body["key"][0:36]

        # Make sure the post was successful by checking the group_key exists
        get_event = {
            "pathParameters": {"id": self.test_group_2_group_id, "kid": str(key_id)},
        }
        group_key = get(
            event=get_event,
            principal={"id": self.test_user2.email},
            group_auth={self.test_group_2_group_id: True},
            admin=False,
        )
        self.assertIsInstance(group_key, dict)
        body = json.loads(group_key.get("body"))

        # Delete the group_key
        delete_event = {"pathParameters": {"id": self.test_group_2_group_id, "kid": str(body["id"])}}
        delete_result = delete(
            event=delete_event,
            principal={"id": self.test_user2.email},
            group_auth={self.test_group_2_group_id: True},
            admin=False,
        )
        self.assertEqual(delete_result["statusCode"], HTTPStatus.NO_CONTENT)

    def test_invalid_request_scope_for_group(self):
        # Post a group_key
        post_event = {
            "pathParameters": {"id": self.test_group_2_group_id},
            "body": json.dumps({"name": "test_key3", "scope": ["github/*"]}),
        }

        resp = post(
            event=post_event,
            principal={"id": self.test_user2.email},
            group_auth={self.test_group_2_group_id: True},
            authz=["*"],
            admin=False,
            features={},
        )
        self.assertEqual(response({"message": KEY_OUT_OF_USER_SCOPE}, code=HTTPStatus.BAD_REQUEST), resp)
