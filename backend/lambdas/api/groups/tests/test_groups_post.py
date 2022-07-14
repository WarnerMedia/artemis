import unittest
from http import HTTPStatus
from unittest.mock import patch

from artemisapi.response import response
from groups import post as groups_post
from groups.util.messages import GROUP_POST_ERROR, PARENT_NOT_FOUND, USER_NOT_FOUND
from tests.stubs.mock_group import MockGroup
from tests.stubs.parsed_event import ParsedEventStub


class TestGroupsPost(unittest.TestCase):
    @patch.object(groups_post, "GroupsDBHelper")
    def test_post_group_with_parent(self, db_caller):
        self.assertEqual(groups_post.GroupsDBHelper, db_caller)
        mock_group = MockGroup()
        db_caller().get_user.return_value = "I am a user object"
        db_caller().get_group.return_value = mock_group
        db_caller().does_group_exist.return_value = False
        db_caller().create_group.return_value = mock_group
        result = groups_post.post_group(ParsedEventStub(), "test_email", "127.0.0.1")
        self.assertEqual(response(mock_group.to_dict()), result)

    @patch.object(groups_post, "GroupsDBHelper")
    def test_post_group_user_not_found(self, db_caller):
        self.assertEqual(groups_post.GroupsDBHelper, db_caller)
        db_caller().get_user.return_value = None
        result = groups_post.post_group(ParsedEventStub(), "test_email", "127.0.0.1")
        self.assertEqual(response({"message": USER_NOT_FOUND}, code=HTTPStatus.UNAUTHORIZED), result)

    @patch.object(groups_post, "GroupsDBHelper")
    def test_post_group_parent_not_found(self, db_caller):
        self.assertEqual(groups_post.GroupsDBHelper, db_caller)
        db_caller().get_user.return_value = "I am a user object"
        db_caller().get_group.return_value = None
        event = ParsedEventStub()
        result = groups_post.post_group(event, "test_email", "127.0.0.1")
        self.assertEqual(response({"message": PARENT_NOT_FOUND}, code=HTTPStatus.BAD_REQUEST), result)

    @patch.object(groups_post, "GroupsDBHelper")
    def test_post_group_without_parent(self, db_caller):
        self.assertEqual(groups_post.GroupsDBHelper, db_caller)
        mock_group = MockGroup()
        db_caller().get_user.return_value = "I am a user object"
        db_caller().does_group_exist.return_value = False
        db_caller().create_group.return_value = mock_group
        event = ParsedEventStub()
        event.body["parent"] = None
        result = groups_post.post_group(event, "test_email", "127.0.0.1")
        self.assertEqual(response(mock_group.to_dict()), result)

    @patch.object(groups_post, "GroupsDBHelper")
    def test_post_group_create_failed(self, db_caller):
        self.assertEqual(groups_post.GroupsDBHelper, db_caller)
        mock_group = MockGroup()
        db_caller().get_user.return_value = "I am a user object"
        db_caller().get_group.return_value = mock_group
        db_caller().does_group_exist.return_value = False
        db_caller().create_group.return_value = None
        result = groups_post.post_group(ParsedEventStub(), "test_email", "127.0.0.1")
        self.assertEqual(response({"message": GROUP_POST_ERROR}, code=HTTPStatus.BAD_REQUEST), result)
