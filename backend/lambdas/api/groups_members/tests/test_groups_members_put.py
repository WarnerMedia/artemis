import json
import unittest
from http import HTTPStatus
from unittest.mock import PropertyMock, patch

from artemisapi.response import response
from artemisdb.artemisdb.models import Group, GroupMembership, User
from groups_members.put import put

EMAIL1 = "testuser1@example.com"
EMAIL2 = "testuser2@example.com"
GROUP_ID = "87879daa-e6cb-4bf9-8575-649b00aff132"

TEST_GROUP = Group(name="Test", scope=["*"], features={})
TEST_USER = User(email=EMAIL1, scope=["*"], features={})
TEST_USER2 = User(email=EMAIL2, scope=["*"], features={})

GROUP_MEMBER_RECORD = {"email": EMAIL1, "group_admin": False, "added": None}
GROUP_MEMBER_LIST_RECORD = [{"email": EMAIL1, "group_admin": True, "added": None}]

GROUP_AUTH_GROUP_ADMIN = {GROUP_ID: True}
GROUP_AUTH_NON_GROUP_ADMIN = {GROUP_ID: False}


class TestGroupsMembersPut(unittest.TestCase):
    def test_non_group_admin(self):
        event = {"pathParameters": {"id": GROUP_ID, "uid": EMAIL2}, "body": json.dumps({"group_admin": False})}
        resp = put(
            event,
            principal={"id": EMAIL1, "type": "user"},
            group_auth=GROUP_AUTH_NON_GROUP_ADMIN,
            admin=False,
            source_ip="127.0.0.1",
        )
        self.assertEqual(response(code=HTTPStatus.FORBIDDEN), resp)

    def test_artemis_admin(self):
        with patch("artemisdb.artemisdb.models.Group.objects.get") as mock_get_group, patch(
            "artemisdb.artemisdb.models.Group.groupmembership_set", new_callable=PropertyMock
        ) as mock_group_membership, patch("artemisdb.artemisdb.models.GroupMembership.save"):
            mock_get_group.return_value = TEST_GROUP
            mock_group_membership.return_value.get.return_value = GroupMembership(group=TEST_GROUP, user=TEST_USER)
            event = {"pathParameters": {"id": GROUP_ID, "uid": EMAIL2}, "body": json.dumps({"group_admin": False})}
            resp = put(
                event,
                principal={"id": EMAIL1, "type": "user"},
                group_auth=GROUP_AUTH_NON_GROUP_ADMIN,
                admin=True,
                source_ip="127.0.0.1",
            )
            self.assertEqual(response(GROUP_MEMBER_RECORD), resp)

    def test_put_group_member(self):
        with patch("artemisdb.artemisdb.models.Group.objects.get") as mock_get_group, patch(
            "artemisdb.artemisdb.models.Group.groupmembership_set", new_callable=PropertyMock
        ) as mock_group_membership, patch("artemisdb.artemisdb.models.GroupMembership.save"):
            mock_get_group.return_value = TEST_GROUP
            mock_group_membership.return_value.get.return_value = GroupMembership(
                group=TEST_GROUP, user=TEST_USER, group_admin=True
            )
            mock_group_membership.return_value.filter.return_value.exclude.return_value.count.return_value = 1
            event = {"pathParameters": {"id": GROUP_ID, "uid": EMAIL2}, "body": json.dumps({"group_admin": False})}
            resp = put(
                event,
                principal={"id": EMAIL1, "type": "user"},
                group_auth=GROUP_AUTH_GROUP_ADMIN,
                source_ip="127.0.0.1",
            )
            self.assertEqual(response(GROUP_MEMBER_RECORD), resp)

    def test_put_group_member_list(self):
        with patch("artemisdb.artemisdb.models.Group.objects.get") as mock_get_group, patch(
            "artemisdb.artemisdb.models.Group.groupmembership_set", new_callable=PropertyMock
        ) as mock_group_membership, patch("artemisdb.artemisdb.models.GroupMembership.objects.bulk_update"), patch(
            "artemisdb.artemisdb.models.GroupMembership.save"
        ):
            mock_get_group.return_value = TEST_GROUP
            mock_group_membership.return_value.filter.return_value.exclude.return_value.count.return_value = 1
            mock_group_membership.return_value.filter.return_value = [
                GroupMembership(group=TEST_GROUP, user=TEST_USER, group_admin=False)
            ]
            event = {
                "pathParameters": {"id": GROUP_ID},
                "body": json.dumps([{"email": EMAIL1, "group_admin": True}]),
            }
            resp = put(
                event,
                principal={"id": EMAIL1, "type": "user"},
                group_auth=GROUP_AUTH_GROUP_ADMIN,
                source_ip="127.0.0.1",
            )
            self.assertEqual(response(GROUP_MEMBER_LIST_RECORD), resp)
