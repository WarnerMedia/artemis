import unittest
from unittest.mock import PropertyMock, patch

from artemisapi.response import response
from artemisdb.artemisdb.models import Group, GroupMembership, User
from groups_members.get import get

EMAIL1 = "testuser1@example.com"
EMAIL2 = "testuser2@example.com"
GROUP_ID = "87879daa-e6cb-4bf9-8575-649b00aff132"

GROUP_MEMBER_RECORD = {
    "email": EMAIL1,
    "group_admin": False,
    "added": None,
}
GROUP_MEMBER_ADMIN_RECORD = {
    "email": EMAIL1,
    "group_admin": True,
    "added": None,
}

GROUP_MEMBER_LIST_PAGING_RECORD = {
    "results": [
        {"email": "testuser1@example.com", "group_admin": True, "added": None},
        {"email": "testuser2@example.com", "group_admin": False, "added": None},
    ],
    "count": 2,
    "next": None,
    "previous": None,
}

TEST_GROUP = Group(name="Test", scope=["*"], features={})
TEST_USER = User(email=EMAIL1, scope=["*"], features={})
TEST_USER2 = User(email=EMAIL2, scope=["*"], features={})

GROUP_AUTH_GROUP_ADMIN = {GROUP_ID: True}
GROUP_AUTH_NON_GROUP_ADMIN = {GROUP_ID: False}


class TestGroupsMembersGet(unittest.TestCase):
    def test_requester_email(self):
        with patch("artemisdb.artemisdb.models.Group.objects.get") as mock_get_group, patch(
            "artemisdb.artemisdb.models.Group.groupmembership_set", new_callable=PropertyMock
        ) as mock_group_membership:
            mock_get_group.return_value = TEST_GROUP
            mock_group_membership.return_value.get.return_value = GroupMembership(group=TEST_GROUP, user=TEST_USER)
            event = {"pathParameters": {"id": GROUP_ID, "uid": EMAIL1}}
            resp = get(event, email=EMAIL1, group_auth=GROUP_AUTH_NON_GROUP_ADMIN, admin=False)

        self.assertEqual(response(GROUP_MEMBER_RECORD), resp)

    def test_group_admin_lookup(self):
        with patch("artemisdb.artemisdb.models.Group.objects.get") as mock_get_group, patch(
            "artemisdb.artemisdb.models.Group.groupmembership_set", new_callable=PropertyMock
        ) as mock_group_membership:
            mock_get_group.return_value = TEST_GROUP
            mock_group_membership.return_value.get.return_value = GroupMembership(
                group=TEST_GROUP, user=TEST_USER, group_admin=True
            )
            event = {"pathParameters": {"id": GROUP_ID, "uid": EMAIL1}}
            resp = get(event, email=EMAIL2, group_auth=GROUP_AUTH_GROUP_ADMIN, admin=False)

        self.assertEqual(response(GROUP_MEMBER_ADMIN_RECORD), resp)

    def test_non_group_admin_lookup(self):
        with patch("artemisdb.artemisdb.models.Group.objects.get") as mock_get_group, patch(
            "artemisdb.artemisdb.models.Group.groupmembership_set", new_callable=PropertyMock
        ) as mock_group_membership:
            mock_get_group.return_value = TEST_GROUP
            mock_group_membership.return_value.get.return_value = GroupMembership(
                group=TEST_GROUP, user=TEST_USER, group_admin=True
            )
            event = {"pathParameters": {"id": GROUP_ID, "uid": EMAIL1}}
            resp = get(event, email=EMAIL2, group_auth=GROUP_AUTH_NON_GROUP_ADMIN, admin=False)

        self.assertEqual(response(GROUP_MEMBER_ADMIN_RECORD), resp)

    def test_group_admin_list_lookup(self):
        with patch("artemisdb.artemisdb.models.Group.objects.get") as mock_get_group, patch(
            "artemisdb.artemisdb.models.Group.groupmembership_set", new_callable=PropertyMock
        ) as mock_group_membership, patch("groups_members.get.apply_filters") as mock_apply_filters:
            mock_get_group.return_value = TEST_GROUP
            mock_group_membership.return_value.all.return_value = [
                GroupMembership(group=TEST_GROUP, user=TEST_USER, group_admin=True),
                GroupMembership(group=TEST_GROUP, user=TEST_USER2, group_admin=False),
            ]
            mock_apply_filters.return_value = mock_group_membership.return_value.all.return_value
            event = {"pathParameters": {"id": GROUP_ID}}
            resp = get(event, email=EMAIL2, group_auth=GROUP_AUTH_GROUP_ADMIN, admin=False)

        self.assertEqual(response(GROUP_MEMBER_LIST_PAGING_RECORD), resp)

    def test_non_group_admin_list_lookup(self):
        with patch("artemisdb.artemisdb.models.Group.objects.get") as mock_get_group, patch(
            "artemisdb.artemisdb.models.Group.groupmembership_set", new_callable=PropertyMock
        ) as mock_group_membership, patch("groups_members.get.apply_filters") as mock_apply_filters:
            mock_get_group.return_value = TEST_GROUP
            mock_group_membership.return_value.all.return_value = [
                GroupMembership(group=TEST_GROUP, user=TEST_USER, group_admin=True),
                GroupMembership(group=TEST_GROUP, user=TEST_USER2, group_admin=False),
            ]
            mock_apply_filters.return_value = mock_group_membership.return_value.all.return_value
            event = {"pathParameters": {"id": GROUP_ID}}
            resp = get(event, email=EMAIL2, group_auth=GROUP_AUTH_NON_GROUP_ADMIN, admin=False)

        self.assertEqual(response(GROUP_MEMBER_LIST_PAGING_RECORD), resp)
