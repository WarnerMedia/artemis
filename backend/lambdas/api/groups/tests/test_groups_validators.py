import unittest
from unittest.mock import patch
from uuid import uuid4

from artemisapi.validators import ValidationError
from artemisdb.artemisdb.models import Group
from groups.util import validators
from groups.util.messages import (
    ADMIN_INVALID,
    ADMIN_UNAUTHORIZED,
    FEATURE_INVALID,
    PARENT_ADMIN_COMBO_INVALID,
    UNAUTHORIZED_SCOPE,
    USER_KEY_NOT_GROUP_KEY,
)
from groups.util.validators import REQUIRED_POST_GROUP_KEYS
from tests.stubs.mock_group import MOCK_GROUP_RESPONSE_1

TEST_BODY = {
    "parent": None,
    "name": "Heimdall Group",
    "description": "Test group meant for mocking purposes only",
    "permissions": {
        "scope": [
            "github/testorg/*",
        ],
        "features": {"super_feature": True, "base_feature": False},
    },
}
TEST_GROUP = Group(
    name="Heimdall Group",
    description="Test group meant for mocking purposes only",
    scope=["github/testorg/*"],
    features={"super_feature": True, "base_feature": False},
)

VALID_GROUP_SCOPE_FEATURES = [
    {
        "parent_id": 15,
        "permissions": {
            "scope": ["github/testorg/test_1", "github/testorg/test_2"],
            "features": {"super_feature": True},
        },
    },
    {"parent_id": None, "permissions": {"scope": ["github/test/repo"], "features": {"snyk": True}}},
    {"parent_id": None, "permissions": {"scope": ["*"], "features": {}}},
    {"parent_id": 15, "permissions": {"scope": ["github/testorg/*"], "features": {"new_feature": False}}},
]

INVALID_GROUP_SCOPE_FEATURES = [
    [
        {"parent_id": 15, "permissions": {"scope": ["github/testorg/test_1"], "features": {"basic_feature": True}}},
        f"{FEATURE_INVALID}: basic_feature",
    ],
    [
        {"parent_id": 15, "permissions": {"scope": ["github/test/repo"], "features": {}}},
        f"{UNAUTHORIZED_SCOPE}: github/test/repo",
    ],
    [{"parent_id": 17, "permissions": {"scope": ["*"], "features": {}}}, f"{UNAUTHORIZED_SCOPE}: *"],
    [{"parent_id": None, "permissions": {"scope": "github/testorg/*", "features": {}}}, "scope must be a list"],
    [{"parent_id": None, "permissions": {"scope": "", "features": {}}}, "scope must be a list"],
    [
        {
            "parent_id": 15,
            "permissions": {"scope": ["github/testorg/test_1", "github/testorg/test_2"], "features": None},
        },
        "features must be a dict",
    ],
]


class TestGroupsValidators(unittest.TestCase):
    def test_post_group_validation_invalid_body(self):
        with self.assertRaises(ValidationError) as context:
            validators.validate_post_group([], None, {})
        self.assertIn("Bad Request", context.exception.message)

    def test_post_group_validation_missing_required_key(self):
        for required_key in REQUIRED_POST_GROUP_KEYS:
            with self.subTest(required_key=required_key):
                test_body = dict(MOCK_GROUP_RESPONSE_1)
                del test_body[required_key]
                with self.assertRaises(ValidationError) as context:
                    validators.validate_post_group(test_body, None, {})
                self.assertIn(f'Missing key: "{required_key}"', context.exception.message)

    def test_post_group_validation_unsupported_key_id(self):
        test_body_root = dict(TEST_BODY)
        unsupported_keys = ["id", "created", "created_by"]
        for key in unsupported_keys:
            with self.subTest(key=key):
                test_body = dict(test_body_root)
                test_body[key] = ""
                with self.assertRaises(ValidationError) as context:
                    validators.validate_post_group(test_body, None, {})
                self.assertIn(f'Unsupported key: "{key}"', context.exception.message)

    def test_post_group_validation_admin_invalid(self):
        test_body = dict(TEST_BODY)
        test_body["permissions"]["admin"] = "1"
        with self.assertRaises(ValidationError) as context:
            validators.validate_post_group(test_body, True, {})
        self.assertIn(ADMIN_INVALID, context.exception.message)

    def test_post_group_validation_name_empty(self):
        test_body = dict(TEST_BODY)
        test_body["name"] = ""
        with self.assertRaises(ValidationError) as context:
            validators.validate_post_group(test_body, True, {})
        self.assertIn("non-empty string", context.exception.message)

    def test_post_group_validation_description_empty(self):
        test_body = dict(TEST_BODY)
        test_body["description"] = ""  # This is allowed
        validators.validate_post_group(test_body, True, {})

    def test_post_group_validation_admin_unauthorized(self):
        test_body = dict(TEST_BODY)
        test_body["parent"] = str(uuid4())
        test_body["permissions"]["admin"] = True
        with self.assertRaises(ValidationError) as context:
            validators.validate_post_group(test_body, False, {test_body["parent"]: True})
        self.assertIn(ADMIN_UNAUTHORIZED, context.exception.message)

    def test_validate_post_group_user_not_admin_parent_null(self):
        with self.assertRaises(ValidationError) as context:
            validators._validate_post_group_user(None, False, {})
        self.assertIn(PARENT_ADMIN_COMBO_INVALID, context.exception.message)

    @patch.object(validators, "GroupsDBHelper")
    def test_validate_post_group_user_not_group_admin(self, db_caller):
        self.assertEqual(validators.GroupsDBHelper, db_caller)
        db_caller().is_user_group_admin.return_value = False
        with self.assertRaises(ValidationError) as context:
            validators._validate_post_group_user(15, False, {})
        self.assertIn(USER_KEY_NOT_GROUP_KEY, context.exception.message)

    def test_validate_post_group_user_pass_admin(self):
        validators._validate_post_group_user(15, True, {})

    def test_validate_post_group_scope_features_no_parent_valid(self):
        validators._validate_permissions(None, {"scope": ["github/test/repo"], "features": {"snyk": True}})

    @patch.object(validators, "GroupsDBHelper")
    def test_validate_post_group_scope_features_valid(self, db_caller):
        self.assertEqual(validators.GroupsDBHelper, db_caller)
        db_caller().get_group.return_value = TEST_GROUP
        for args in VALID_GROUP_SCOPE_FEATURES:
            with self.subTest(key=args):
                validators._validate_permissions(**args)

    @patch.object(validators, "GroupsDBHelper")
    def test_validate_post_group_scope_features_invalid(self, db_caller):
        self.assertEqual(validators.GroupsDBHelper, db_caller)
        db_caller().get_group.return_value = TEST_GROUP
        for args in INVALID_GROUP_SCOPE_FEATURES:
            with self.subTest(key=args):
                with self.assertRaises(ValidationError) as context:
                    validators._validate_permissions(**args[0])
                self.assertIn(args[1], context.exception.message)

    # validators.validate_put_group_body
    def test_put_no_body(self):
        with self.assertRaises(ValidationError):
            # Body can't be None
            validators.validate_put_group_body(None)

    def test_put_invalid_keys_dict(self):
        with self.assertRaises(ValidationError):
            # Only support keys are allowed
            validators.validate_put_group_body({"foo": "bar"}, False)

    def test_put_valid_keys_dict(self):
        # Valid body parameters and values
        validators.validate_put_group_body(
            {
                "name": "test name",
                "description": "test description",
                "permissions": {"allowlist": True, "scope": ["*"], "features": {"snyk": True}},
            },
            False,
        )

    def test_put_name_empty(self):
        with self.assertRaises(ValidationError):
            # Name cannot be empty
            validators.validate_put_group_body(
                {
                    "name": "",
                    "description": "test description",
                    "permissions": {"allowlist": True, "scope": ["*"], "features": {"snyk": True}},
                }
            )

    def test_put_name(self):
        validators.validate_put_group_body({"name": "testname"}, False)

    def test_put_name_type(self):
        with self.assertRaises(ValidationError):
            # Name must be string
            validators.validate_put_group_body({"name": 1}, False)

    def test_put_description_type(self):
        with self.assertRaises(ValidationError):
            # Description must be string
            validators.validate_put_group_body({"description": 1}, False)

    def test_put_allowlist_type(self):
        with self.assertRaises(ValidationError):
            # Allowlist must be bool
            validators.validate_put_group_body({"permissions": {"allowlist": "test"}}, False)

    def test_put_scope_type(self):
        with self.assertRaises(ValidationError):
            # Scope must be list
            validators.validate_put_group_body({"permissions": {"scope": {}}}, False)

    def test_put_scope_item_type(self):
        with self.assertRaises(ValidationError):
            # Scope item must be string
            validators.validate_put_group_body({"permissions": {"scope": [1, 2]}}, False)

    def test_put_features_type(self):
        with self.assertRaises(ValidationError):
            # Features must be dict
            validators.validate_put_group_body({"permissions": {"features": []}}, False)

    def test_put_features_item_type(self):
        with self.assertRaises(ValidationError):
            # Features item dict value must be bool
            validators.validate_put_group_body({"permissions": {"features": {"snyk": 1}}}, False)
