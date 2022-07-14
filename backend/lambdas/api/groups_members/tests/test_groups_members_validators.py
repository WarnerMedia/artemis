import unittest

from artemisapi.validators import ValidationError
from groups_members.util.validators import validate_group_auth, validate_group_members_body


class TestGroupMembersValidators(unittest.TestCase):
    def test_no_post_body(self):
        with self.assertRaises(ValidationError):
            # Body can't be None
            validate_group_members_body(None)

    def test_invalid_keys_dict(self):
        with self.assertRaises(ValidationError):
            # Only support keys are allowed
            validate_group_members_body({"foo": "bar"})

    def test_invalid_keys_list(self):
        with self.assertRaises(ValidationError):
            # Only support keys are allowed
            validate_group_members_body([{"foo": "bar"}])

    def test_valid_keys_dict(self):
        # Valid body parameters and values
        validate_group_members_body({"group_admin": True})

    def test_valid_keys_list(self):
        # Valid body parameters and values
        validate_group_members_body([{"email": "test@example.com", "group_admin": True}])

    def test_group_admin_type_dict(self):
        with self.assertRaises(ValidationError):
            # Group Admin must be bool
            validate_group_members_body({"group_admin": 1})

    def test_email_type_list(self):
        with self.assertRaises(ValidationError):
            # Email must be string
            validate_group_members_body([{"email": 1, "group_admin": True}])

    def test_group_admin_type_list(self):
        with self.assertRaises(ValidationError):
            # Group Admin must be bool
            validate_group_members_body([{"email": "test@example.com", "group_admin": 1}])

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
