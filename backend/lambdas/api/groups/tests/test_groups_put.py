import json
import unittest
from copy import deepcopy
from http import HTTPStatus
from unittest.mock import patch

from artemisapi.response import response
from artemisdb.artemisdb.models import Group, GroupMembership, User
from groups.put import put, validate_scope, verify_put_item

EMAIL1 = "testuser1@example.com"
EMAIL2 = "testuser2@example.com"
GROUP_ID = "87879daa-e6cb-4bf9-8575-649b00aff132"

TEST_GROUP = Group(name="Test", scope=["*"], features={})
TEST_USER = User(email=EMAIL1, scope=["*"], features={})
PUT_REQUEST_BODY = {"name": "test", "permissions": {"scope": ["*"], "features": {"snyk": True}}}
GROUP_RECORD = {
    "group_id": "1",
    "name": "test",
    "description": "test_group",
    "created": None,
    "created_by": None,
    "updated": None,
    "permissions": {"scope": ["*"], "features": {"snyk": True}},
}

GROUP_1 = Group(group_id=1, name="test", description="test group", created_by=None, scope=["*"], features={})


class TestGroupsPut(unittest.TestCase):
    def test_non_group_admin(self):
        with patch("artemisdb.artemisdb.models.GroupMembership.objects.get") as mock_get_group_membership:
            mock_get_group_membership.return_value = GroupMembership(group=TEST_GROUP, user=TEST_USER)
            event = {"pathParameters": {"id": GROUP_ID}, "body": json.dumps(PUT_REQUEST_BODY)}
            resp = put(event, "email", False, {GROUP_ID: False})
        self.assertEqual(response(code=HTTPStatus.FORBIDDEN), resp)

    def test_artemis_admin(self):
        with patch("artemisdb.artemisdb.models.GroupMembership.objects.get") as mock_get_group_membership, patch(
            "artemisdb.artemisdb.models.Group.objects.get"
        ) as mock_get_group, patch("artemisdb.artemisdb.models.Group.save"), patch(
            "artemisdb.artemisdb.models.Group.to_dict"
        ) as mock_group_to_dict:
            mock_get_group_membership.return_value = GroupMembership(group=TEST_GROUP, user=TEST_USER)
            mock_get_group.return_value = deepcopy(GROUP_1)
            mock_group_to_dict.return_value = GROUP_RECORD
            event = {"pathParameters": {"id": GROUP_ID}, "body": json.dumps(PUT_REQUEST_BODY)}
            resp = put(event, {"id": "email", "type": "user"}, True, {}, source_ip="127.0.0.1")

        self.assertEqual(resp["statusCode"], HTTPStatus.OK)
        body = json.loads(resp["body"])
        self.assertEqual(body, GROUP_RECORD)

    def test_validate_scope(self):
        # Creates a group[*] -> sub_group["gitlab/*", "github/*"] -> sub_sub_group relationship
        # the scope ["github/testorg/*"] is inside the scope of its parents
        group = GROUP_1
        sub_group = deepcopy(group)
        sub_group.parent = group
        sub_group.scope = ["gitlab/*", "github/*"]
        sub_sub_group = deepcopy(group)
        sub_sub_group.parent = sub_group

        resp = validate_scope(sub_sub_group, ["github/testorg/*"])
        self.assertTrue(resp)

    def test_validate_scope_parent_outside_new_scope(self):
        # Creates a group[*] -> sub_group["gitlab/*", "github/*"] -> sub_sub_group relationship
        # the scope ["bitbucket/testorg/*"] is outside the sub_group scope
        group = GROUP_1
        sub_group = deepcopy(group)
        sub_group.parent = group
        sub_group.scope = ["gitlab/*", "github/*"]
        sub_sub_group = deepcopy(group)
        sub_sub_group.parent = sub_group

        resp = validate_scope(sub_sub_group, ["bitbucket/testorg/*"])
        self.assertFalse(resp)

    def test_validate_scope_parent_parent_outside_new_scope(self):
        # Creates a group[bitbucket/*] -> sub_group["gitlab/*", "github/*"] -> sub_sub_group relationship
        # the scope ["github/testorg/*"] is outside the group scope
        group = deepcopy(GROUP_1)
        group.scope = ["bitbucket/*"]
        sub_group = deepcopy(group)
        sub_group.parent = group
        sub_group.scope = ["gitlab/*", "github/*"]
        sub_sub_group = deepcopy(group)
        sub_sub_group.parent = sub_group

        resp = validate_scope(sub_sub_group, ["github/testorg/*"])
        self.assertFalse(resp)

    def test_verify_put_item(self):
        group = deepcopy(GROUP_1)
        output = "test value"
        variable = "scope"
        event_body = {variable: output}
        new_var = verify_put_item(group, variable, event_body)
        result_set = {new_var, group.scope, output}
        # checks if all values are the same.
        self.assertTrue(len(result_set) == 1)
