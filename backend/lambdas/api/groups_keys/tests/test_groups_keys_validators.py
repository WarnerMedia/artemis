import unittest

from artemisapi.validators import ValidationError
from artemisdb.artemisdb.models import Group
from groups_keys.util.validators import (
    validate_features,
    validate_group_auth,
    validate_post_group_key_body,
    validate_scope,
)


class TestGroupsKeysValidators(unittest.TestCase):
    def test_required_body_field_missing(self):
        with self.assertRaises(ValidationError):
            # Fails validation because the scope is missing from the body.
            validate_post_group_key_body({"name": "testName"}, Group())

    def test_body_expired_not_string(self):
        with self.assertRaises(ValidationError):
            # Fails validation because expires has to be a string
            validate_post_group_key_body({"name": "testName", "scope": ["*"], "expires": 1}, Group())

    def test_body_expired_invalid_string(self):
        with self.assertRaises(ValidationError):
            # Fails validation because expires is not a valid string
            validate_post_group_key_body({"name": "testName", "scope": ["*"], "expires": "hi"}, Group(scope=["*"]))

    def test_invalid_format(self):
        with self.assertRaises(ValidationError):
            # Fails validation because the scope is not a list
            validate_post_group_key_body({"name": "testName", "scope": ""}, Group(scope=["*"]))

    def test_invalid_contents(self):
        with self.assertRaises(ValidationError):
            # Fails validation because the scope is not a list of strings
            validate_post_group_key_body({"name": "testName", "scope": [1]}, Group(scope=["*"]))

    def test_invalid_scope(self):
        with self.assertRaises(ValidationError):
            # Fails because the scope is not a subset of the authz
            validate_scope(["foobar"], ["foo"])

    def test_invalid_scope_multiples(self):
        with self.assertRaises(ValidationError):
            # Fails because the scope is not a subset of the authz
            validate_scope(["foo", "bar"], ["f*"])

    def test_valid_scope(self):
        # Succeeds because the scope is a subset of the authz
        validate_scope(["foo"], ["foo"])

    def test_valid_scope_multiples(self):
        # Succeeds because the scope is a subset of the authz
        validate_scope(["foo", "bar"], ["f*", "b*"])

    def test_valid_features_same(self):
        # Tests that it is valid to request a feature be enabled if the auth already has that feature enabled
        validate_features(req_features={"foo": True}, auth_features={"foo": True})

    def test_valid_features_lower(self):
        # Tests that it is valid to request a feature be disabled if the auth already has that feature enabled
        validate_features(req_features={"foo": False}, auth_features={"foo": True})

    def test_invalid_features_type(self):
        with self.assertRaises(ValidationError):
            # Fails because must be boolean values
            validate_features({"foo": "False"}, {"foo": True})

    def test_invalid_features_dict(self):
        with self.assertRaises(ValidationError):
            # Fails because features must be a dict.
            validate_features(None, {"foo": True})

    def test_invalid_features_added(self):
        with self.assertRaises(ValidationError):
            # Fails because the features in the first argument must be part of the features in the second.
            validate_features({"bar": True}, {"foo": True})

    def test_validate_group_auth_group_id(self):
        with self.assertRaises(ValidationError):
            # Raises exception if group_id not in group_auth.
            validate_group_auth(
                group_auth={"group_id2": False},
                group_id="group_id1",
                admin=False,
            )

    def test_validate_group_auth_admin(self):
        # Returns True if admin is True
        self.assertEqual(
            validate_group_auth(
                group_auth={"test123": False},
                group_id="group_id1",
                admin=True,
            ),
            True,
        )

    def test_validate_group_auth_group_admin(self):
        # Returns True if both group_admins are True
        self.assertEqual(
            validate_group_auth(
                group_auth={"group_id1": True, "group_id2": False},
                group_id="group_id1",
                admin=False,
            ),
            True,
        )
