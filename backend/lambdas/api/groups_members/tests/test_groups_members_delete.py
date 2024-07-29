import json
import unittest
from http import HTTPStatus
from unittest.mock import PropertyMock, patch
from uuid import UUID

from artemisapi.response import response
from artemisdb.artemisdb.models import Group, GroupMembership, User
from groups_members.delete import delete

EMAIL1 = "testuser1@example.com"
EMAIL2 = "testuser2@example.com"
GROUP_ID = "87879daa-e6cb-4bf9-8575-649b00aff132"

TEST_GROUP = Group(name="Test", scope=["*"], features={}, group_id=UUID(GROUP_ID))
TEST_USER = User(email=EMAIL1, scope=["*"], features={})
TEST_USER2 = User(email=EMAIL2, scope=["*"], features={})

GROUP_MEMBER_RECORD = {"email": EMAIL1, "group_admin": False, "added": None}
GROUP_MEMBER_LIST_RECORD = [{"email": EMAIL1, "group_admin": False, "added": None}]

GROUP_AUTH_GROUP_ADMIN = {GROUP_ID: True}
GROUP_AUTH_NON_GROUP_ADMIN = {GROUP_ID: False}


@patch("authorizer.handlers.AuditLogger.__init__", lambda *x, **y: None)
@patch("authorizer.handlers.AuditLogger.group_member_removed", lambda *x, **y: None)
class TestGroupsMembersDelete(unittest.TestCase):
    def test_only_admins_can_delete(self):
        with (
            patch("artemisdb.artemisdb.models.GroupMembership.objects.get") as mock_get_group_membership,
            patch("artemisdb.artemisdb.models.GroupMembership.delete"),
            patch("artemisdb.artemisdb.models.Group.objects.get") as mock_get_group,
            patch(
                "artemisdb.artemisdb.models.Group.groupmembership_set", new_callable=PropertyMock
            ) as mock_group_membership,
        ):
            mock_get_group_membership.return_value = GroupMembership(group=TEST_GROUP, user=TEST_USER)
            mock_get_group.return_value = TEST_GROUP
            mock_group_membership.return_value.filter.return_value.exclude.return_value.count.return_value = 1
            event = {"pathParameters": {"id": GROUP_ID, "uid": EMAIL2}}

            test_cases = [
                {"admin": True, "group_admin": True, "expected": response(code=HTTPStatus.NO_CONTENT)},
                {"admin": True, "group_admin": False, "expected": response(code=HTTPStatus.NO_CONTENT)},
                {"admin": False, "group_admin": True, "expected": response(code=HTTPStatus.NO_CONTENT)},
                {"admin": False, "group_admin": False, "expected": response(code=HTTPStatus.FORBIDDEN)},
            ]
            for test_case in test_cases:
                with self.subTest(test_case=test_case):
                    resp = delete(
                        event,
                        principal={"id": EMAIL1, "type": "user"},
                        group_auth={GROUP_ID: test_case["group_admin"]},
                        admin=test_case["admin"],
                        source_ip="127.0.0.1",
                    )
                    self.assertEqual(test_case["expected"], resp)

    def test_delete_group_member_list(self):
        with (
            patch("artemisdb.artemisdb.models.GroupMembership.objects.get") as mock_get_group_membership,
            patch("artemisdb.artemisdb.models.GroupMembership.delete"),
            patch("artemisdb.artemisdb.models.Group.objects.get") as mock_get_group,
            patch(
                "artemisdb.artemisdb.models.Group.groupmembership_set", new_callable=PropertyMock
            ) as mock_group_membership,
        ):
            mock_get_group_membership.return_value = GroupMembership(group=TEST_GROUP, user=TEST_USER)
            mock_get_group.return_value = TEST_GROUP
            mock_group_membership.return_value.filter.return_value.exclude.return_value.count.return_value = 1
            event = {"pathParameters": {"id": GROUP_ID}, "body": json.dumps([{"email": EMAIL2}])}
            resp = delete(
                event,
                principal={"id": EMAIL1, "type": "user"},
                group_auth=GROUP_AUTH_GROUP_ADMIN,
                admin=False,
                source_ip="127.0.0.1",
            )

        self.assertEqual(response(code=HTTPStatus.NO_CONTENT), resp)
