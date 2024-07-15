import json
import time
import unittest
from http import HTTPStatus

import pytest
from test_utils_group_members.create_records_group_members import create_group_members, create_groups, create_user

from artemisapi.response import response
from artemisdb.artemisdb.helpers.groups import GroupsDBHelper
from groups_members.delete import GROUP_ADMIN_MUST_EXIST_MESSAGE, delete
from groups_members.get import get
from groups_members.post import post
from groups_members.put import put

TEST_USER = {"email": f"{time.time_ns()}@testuser.com", "scope": ["service/org/repo"], "features": {}, "admin": True}
TEST_USER2 = {"email": f"{time.time_ns()}@testuser2.com", "scope": ["service/org/repo"], "features": {}, "admin": True}
TEST_USER3 = {"email": f"{time.time_ns()}@testuser3.com", "scope": ["service/org/repo"], "features": {}, "admin": True}
TEST_USER4 = {"email": f"{time.time_ns()}@testuser4.com", "scope": ["service/org/repo"], "features": {}, "admin": True}


@pytest.mark.integtest
class TestGroupsMembersDbCalls(unittest.TestCase):
    """
    Test Class relies on the artemisdb docker container being up.
    """

    @classmethod
    def setUpClass(cls) -> None:
        cls.db_caller = GroupsDBHelper()
        cls.test_user = create_user(db_caller=cls.db_caller, **TEST_USER)
        cls.test_user2 = create_user(db_caller=cls.db_caller, **TEST_USER2)
        cls.test_user3 = create_user(db_caller=cls.db_caller, **TEST_USER3)
        cls.test_user4 = create_user(db_caller=cls.db_caller, **TEST_USER4)
        groups = create_groups(cls.db_caller, cls.test_user, None, 3)

        cls.test_group_1 = groups[0]
        cls.test_group_2 = groups[1]
        cls.test_group_3 = groups[2]

        cls.test_group_1_group_id = str(groups[0].group_id)
        cls.test_group_2_group_id = str(groups[1].group_id)
        cls.test_group_3_group_id = str(groups[2].group_id)

        create_group_members(
            cls.db_caller,
            [
                {"group": cls.test_group_1, "user": cls.test_user, "group_admin": True},
                {"group": cls.test_group_2, "user": cls.test_user3, "group_admin": True},
                {"group": cls.test_group_2, "user": cls.test_user4, "group_admin": True},
                {"group": cls.test_group_3, "user": cls.test_user3, "group_admin": True},
                {"group": cls.test_group_3, "user": cls.test_user4, "group_admin": True},
            ],
        )
        cls.delete_groups = []
        for group in groups:
            cls.delete_groups.append(str(group.group_id))

    @classmethod
    def tearDownClass(cls) -> None:
        cls.db_caller.user.objects.filter(
            email__in=[TEST_USER["email"], TEST_USER2["email"], TEST_USER3["email"], TEST_USER4["email"]]
        ).delete()
        cls.db_caller.group.objects.filter(group_id__in=cls.delete_groups).delete()

    def test_get_group_member(self):
        get_event = {"pathParameters": {"id": self.test_group_1_group_id, "uid": self.test_user.email}}
        group_member = get(
            event=get_event,
            principal={"id": self.test_user.email},
            group_auth={self.test_group_1_group_id: False},
            admin=True,
        )
        body = json.loads(group_member.get("body"))
        self.assertIsInstance(body, dict)

    def test_get_group_member_self_admin(self):
        get_event = {"pathParameters": {"id": self.test_group_1_group_id, "uid": self.test_user.email}}
        group_member = get(
            event=get_event,
            principal={"id": "self"},
            group_auth={self.test_group_1_group_id: False},
            admin=True,
        )
        body = json.loads(group_member.get("body"))
        self.assertIsInstance(body, dict)

    def test_get_group_member_list_admin(self):
        get_event = {"pathParameters": {"id": self.test_group_1_group_id}}
        group_members_list = get(
            event=get_event,
            principal={"id": self.test_user.email},
            group_auth={self.test_group_1_group_id: False},
            admin=True,
        )
        body = json.loads(group_members_list.get("body"))
        group_member_emails = {group_member["email"] for group_member in body["results"]}
        self.assertEqual({self.test_user.email}, group_member_emails)

    def test_get_group_member_list_group_admin(self):
        get_event = {"pathParameters": {"id": self.test_group_1_group_id}}
        group_members_list = get(
            event=get_event,
            principal={"id": self.test_user.email},
            group_auth={self.test_group_1_group_id: True},
            admin=False,
        )
        body = json.loads(group_members_list.get("body"))
        group_member_emails = {group_member["email"] for group_member in body["results"]}
        self.assertEqual({self.test_user.email}, group_member_emails)

    def test_create_delete_get_group_member_group_admin(self):
        post_event = {
            "pathParameters": {"id": self.test_group_1_group_id, "uid": self.test_user2.email},
            "body": json.dumps({"group_admin": True}),
        }
        group_member = post(
            event=post_event,
            principal={"id": self.test_user.email},
            group_auth={self.test_group_1_group_id: True},
            admin=False,
        )
        body = json.loads(group_member.get("body"))
        get_event = {"pathParameters": {"id": self.test_group_1_group_id, "uid": self.test_user2.email}}
        group_member = get(
            event=get_event,
            email=self.test_user2.email,
            group_auth={self.test_group_1_group_id: True},
            admin=False,
        )
        body = json.loads(group_member.get("body"))
        self.assertIsInstance(body, dict)

        delete_event = {"pathParameters": {"id": self.test_group_1_group_id, "uid": self.test_user2.email}}
        delete_result = delete(
            event=delete_event,
            principal={"id": self.test_user2.email},
            group_auth={self.test_group_1_group_id: True},
            admin=False,
        )
        self.assertEqual(delete_result["statusCode"], HTTPStatus.NO_CONTENT)

    def test_create_delete_get_group_member_admin(self):
        post_event = {
            "pathParameters": {"id": self.test_group_1_group_id, "uid": self.test_user2.email},
            "body": json.dumps({"group_admin": False}),
        }
        group_member = post(
            event=post_event,
            principal={"id": self.test_user.email},
            group_auth={self.test_group_1_group_id: False},
            admin=True,
        )
        body = json.loads(group_member.get("body"))
        get_event = {"pathParameters": {"id": self.test_group_1_group_id, "uid": self.test_user2.email}}
        group_member = get(
            event=get_event,
            principal={"id": self.test_user2.email},
            group_auth={self.test_group_1_group_id: False},
            admin=True,
        )
        body = json.loads(group_member.get("body"))
        self.assertIsInstance(body, dict)

        delete_event = {"pathParameters": {"id": self.test_group_1_group_id, "uid": self.test_user2.email}}
        delete_result = delete(
            event=delete_event,
            principal={"id": self.test_user2.email},
            group_auth={self.test_group_1_group_id: False},
            admin=True,
        )
        self.assertEqual(delete_result["statusCode"], HTTPStatus.NO_CONTENT)

    def test_delete_invalid_must_have_group_admin_single(self):
        delete_event = {"pathParameters": {"id": self.test_group_1_group_id, "uid": self.test_user.email}}
        delete_result = delete(
            event=delete_event,
            principal={"id": self.test_user.email},
            group_auth={self.test_group_1_group_id: True},
            admin=False,
        )
        self.assertEqual(response({"message": GROUP_ADMIN_MUST_EXIST_MESSAGE}, HTTPStatus.BAD_REQUEST), delete_result)

    def test_delete_invalid_must_have_group_admin_list(self):
        delete_event = {
            "pathParameters": {"id": self.test_group_2_group_id},
            "body": json.dumps([{"email": self.test_user3.email}, {"email": self.test_user4.email}]),
        }
        delete_result = delete(
            event=delete_event,
            principal={"id": self.test_user3.email},
            group_auth={self.test_group_2_group_id: True},
            admin=False,
        )
        self.assertEqual(response({"message": GROUP_ADMIN_MUST_EXIST_MESSAGE}, HTTPStatus.BAD_REQUEST), delete_result)

    def test_put_group_member_group_admin(self):
        put_event = {
            "pathParameters": {"id": self.test_group_3_group_id, "uid": self.test_user3.email},
            "body": json.dumps({"group_admin": False}),
        }
        group_member_group_admin = put(
            event=put_event,
            principal={"id": self.test_user3.email},
            group_auth={self.test_group_3_group_id: True},
            admin=False,
        )
        body = json.loads(group_member_group_admin.get("body"))
        # Make sure group_admin changed to False
        self.assertEqual(body["group_admin"], False)

    def test_put_invalid_must_have_group_admin(self):
        put_event = {
            "pathParameters": {"id": self.test_group_2_group_id, "uid": self.test_user3.email},
            "body": json.dumps({"group_admin": False}),
        }
        group_member_group_admin = put(
            event=put_event,
            principal={"id": self.test_user3.email},
            group_auth={self.test_group_2_group_id: True},
            admin=False,
        )
        self.assertEqual(
            response({"message": GROUP_ADMIN_MUST_EXIST_MESSAGE}, HTTPStatus.BAD_REQUEST), group_member_group_admin
        )

    def test_put_group_member_group_admin_list(self):
        put_event = {
            "pathParameters": {"id": self.test_group_3_group_id},
            "body": json.dumps(
                [
                    {"email": self.test_user3.email, "group_admin": True},
                    {"email": self.test_user4.email, "group_admin": True},
                ]
            ),
        }
        group_member_group_admin = put(
            event=put_event,
            principal={"id": self.test_user3.email},
            group_auth={self.test_group_3_group_id: True},
            admin=False,
        )
        body = json.loads(group_member_group_admin.get("body"))
        # Make sure group_admin changed to False
        self.assertEqual(body[0]["group_admin"], True)

    def test_put_invalid_must_have_group_admin_list(self):
        put_event = {
            "pathParameters": {"id": self.test_group_3_group_id},
            "body": json.dumps(
                [
                    {"email": self.test_user3.email, "group_admin": False},
                    {"email": self.test_user4.email, "group_admin": False},
                ]
            ),
        }
        group_member_group_admin = put(
            event=put_event,
            principal={"id": self.test_user3.email},
            group_auth={self.test_group_3_group_id: True},
            admin=False,
        )
        self.assertEqual(
            response({"message": GROUP_ADMIN_MUST_EXIST_MESSAGE}, HTTPStatus.BAD_REQUEST), group_member_group_admin
        )

    def test_put_group_member_admin(self):
        get_event = {"pathParameters": {"id": self.test_group_2_group_id, "uid": self.test_user4.email}}
        group_member_admin = get(
            event=get_event,
            principal={"id": self.test_user4.email},
            group_auth={self.test_group_2_group_id: False},
            admin=True,
        )
        # Make sure the group member exists
        self.assertIsInstance(group_member_admin, dict)
        body = json.loads(group_member_admin.get("body"))
        # Make sure group_admin was True before it's changed
        self.assertEqual(body["group_admin"], True)

        put_event = {
            "pathParameters": {"id": self.test_group_2_group_id, "uid": self.test_user4.email},
            "body": json.dumps({"group_admin": False}),
        }
        group_member_admin = put(
            event=put_event,
            principal={"id": self.test_user4.email},
            group_auth={self.test_group_2_group_id: False},
            admin=True,
        )
        body = json.loads(group_member_admin.get("body"))
        # Make sure group_admin changed to False
        self.assertEqual(body["group_admin"], False)
