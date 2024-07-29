import json
import unittest
from http import HTTPStatus
from unittest.mock import PropertyMock, patch

from artemisapi.response import response
from artemisdb.artemisdb.models import Group, GroupMembership, User
from groups_members.post import USER_ALREADY_MEMBER_MESSAGE, post

EMAIL1 = "testuser1@example.com"
EMAIL2 = "testuser2@example.com"
GROUP_ID = "87879daa-e6cb-4bf9-8575-649b00aff132"

TEST_GROUP = Group(name="Test", scope=["*"], features={})
TEST_USER = User(email=EMAIL1, scope=["*"], features={})
TEST_USER2 = User(email=EMAIL2, scope=["*"], features={})

GROUP_MEMBER_RECORD = {"email": EMAIL2, "group_admin": False, "added": None}
GROUP_MEMBER_LIST_RECORD = [{"email": EMAIL2, "group_admin": False, "added": None}]

GROUP_AUTH_GROUP_ADMIN = {GROUP_ID: True}
GROUP_AUTH_NON_GROUP_ADMIN = {GROUP_ID: False}


@patch("authorizer.handlers.AuditLogger.__init__", lambda *x, **y: None)
@patch("authorizer.handlers.AuditLogger.group_member_added", lambda *x, **y: None)
class TestGroupsMembersPost(unittest.TestCase):
    def test_non_group_admin(self):
        event = {"pathParameters": {"id": GROUP_ID, "uid": EMAIL2}, "body": json.dumps({"group_admin": False})}
        resp = post(
            event,
            principal={"id": EMAIL1, "type": "user"},
            group_auth=GROUP_AUTH_NON_GROUP_ADMIN,
            admin=False,
            source_ip="127.0.0.1",
        )
        self.assertEqual(response(code=HTTPStatus.FORBIDDEN), resp)

    def test_artemis_admin(self):
        with (
            patch("artemisdb.artemisdb.models.User.objects.get") as mock_get_user,
            patch("artemisdb.artemisdb.models.Group.objects.get") as mock_get_group,
            patch(
                "artemisdb.artemisdb.models.Group.groupmembership_set", new_callable=PropertyMock
            ) as mock_group_membership,
        ):
            mock_get_user.return_value = TEST_USER2
            mock_get_group.return_value = TEST_GROUP
            mock_group_membership.return_value.filter.return_value.exists.return_value = False
            mock_group_membership.return_value.create.return_value = GroupMembership(
                group=TEST_GROUP, user=TEST_USER2, group_admin=False
            )
            event = {"pathParameters": {"id": GROUP_ID, "uid": EMAIL2}, "body": json.dumps({"group_admin": False})}
            resp = post(
                event,
                principal={"id": EMAIL1, "type": "user"},
                group_auth=GROUP_AUTH_NON_GROUP_ADMIN,
                admin=True,
                source_ip="127.0.0.1",
            )
            self.assertEqual(response(GROUP_MEMBER_RECORD), resp)

    def test_group_membership_exists(self):
        with (
            patch("artemisdb.artemisdb.models.User.objects.get") as mock_get_user,
            patch("artemisdb.artemisdb.models.Group.objects.get") as mock_get_group,
            patch(
                "artemisdb.artemisdb.models.Group.groupmembership_set", new_callable=PropertyMock
            ) as mock_group_membership,
        ):
            mock_get_user.return_value = TEST_USER2
            mock_get_group.return_value = TEST_GROUP
            mock_group_membership.return_value.filter.return_value.exists.return_value = True
            event = {"pathParameters": {"id": GROUP_ID, "uid": EMAIL2}, "body": json.dumps({"group_admin": False})}
            resp = post(
                event,
                principal={"id": EMAIL1, "type": "user"},
                group_auth=GROUP_AUTH_GROUP_ADMIN,
                source_ip="127.0.0.1",
            )
            self.assertEqual(response({"message": USER_ALREADY_MEMBER_MESSAGE}, code=HTTPStatus.CONFLICT), resp)

    def test_post_group_member(self):
        with (
            patch("artemisdb.artemisdb.models.User.objects.get") as mock_get_user,
            patch("artemisdb.artemisdb.models.Group.objects.get") as mock_get_group,
            patch(
                "artemisdb.artemisdb.models.Group.groupmembership_set", new_callable=PropertyMock
            ) as mock_group_membership,
        ):
            mock_get_user.return_value = TEST_USER2
            mock_get_group.return_value = TEST_GROUP
            mock_group_membership.return_value.filter.return_value.exists.return_value = False
            mock_group_membership.return_value.create.return_value = GroupMembership(
                group=TEST_GROUP, user=TEST_USER2, group_admin=False
            )
            event = {"pathParameters": {"id": GROUP_ID, "uid": EMAIL2}, "body": json.dumps({"group_admin": False})}
            resp = post(
                event,
                principal={"id": EMAIL1, "type": "user"},
                group_auth=GROUP_AUTH_GROUP_ADMIN,
                source_ip="127.0.0.1",
            )
            self.assertEqual(response(GROUP_MEMBER_RECORD), resp)

    def test_post_group_member_list(self):
        with (
            patch("artemisdb.artemisdb.models.GroupMembership.objects.get") as mock_get_group_membership,
            patch("artemisdb.artemisdb.models.User.objects.filter") as mock_filter_user,
            patch("artemisdb.artemisdb.models.Group.objects.get") as mock_get_group,
            patch("artemisdb.artemisdb.models.GroupMembership.objects.filter") as mock_filter_group_membership,
            patch("artemisdb.artemisdb.models.GroupMembership.objects.bulk_create") as mock_create_group_membership,
        ):
            mock_get_group_membership.return_value = GroupMembership(group=TEST_GROUP, user=TEST_USER, group_admin=True)
            mock_filter_user.return_value = [TEST_USER2]
            mock_get_group.return_value = TEST_GROUP
            mock_filter_group_membership.return_value = GroupMembership.objects.none()
            mock_create_group_membership.return_value = GroupMembership(
                group=TEST_GROUP, user=TEST_USER2, group_admin=False
            )
            event = {
                "pathParameters": {"id": GROUP_ID},
                "body": json.dumps([{"email": EMAIL2, "group_admin": False}]),
            }
            resp = post(
                event,
                principal={"id": EMAIL1, "type": "user"},
                group_auth=GROUP_AUTH_GROUP_ADMIN,
                source_ip="127.0.0.1",
            )
            self.assertEqual(response(GROUP_MEMBER_LIST_RECORD), resp)
