import unittest

from users_keys.util.parsers import parse_body
from artemisapi.validators import ValidationError
from users_keys.util.validators import _validate_scope, validate_admin, validate_features


class TestValidators(unittest.TestCase):
    def test_invalid_format(self):
        with self.assertRaises(ValidationError):
            # Fails validation because the scope is not a list
            _validate_scope("", ["service/org"])

    def test_invalid_contents(self):
        with self.assertRaises(ValidationError):
            # Fails validation because the scope is not a list of strings
            _validate_scope([1], ["service/org"])

    def test_invalid_scope(self):
        with self.assertRaises(ValidationError):
            # Fails because the scope is not a subset of the authz
            _validate_scope(["foobar"], ["service/org"])

    def test_invalid_scope_multiples(self):
        with self.assertRaises(ValidationError):
            # Fails because the scope is not a subset of the authz
            _validate_scope(["service/org/repo", "bar"], ["service/org"])

    def test_valid_scope(self):
        # Succeeds because the scope is a subset of the authz
        _validate_scope(["service/org/repo"], ["service/org"])

    def test_valid_scope_multiples(self):
        # Succeeds because the scope is a subset of the authz
        _validate_scope(["service/org1/repo", "service/org2/repo"], ["service/org1", "service/org2"])

    def test_valid_scope_wildcard(self):
        # Succeeds because the scope is the top level wildcard, which means the API key
        # can access anything the user can
        _validate_scope(["*"], ["service/org1"])

    def test_valid_admin_disable(self):
        # Admins can create non-admin keys
        validate_admin(False, True)

    def test_valid_admin_enable(self):
        # Admins can create admin keys
        validate_admin(True, True)

    def test_valid_nonadmin_disable(self):
        # Non-admins can create non-admin keys
        validate_admin(False, False)

    def test_invalid_admin_enable(self):
        with self.assertRaises(ValidationError):
            # Non-admins cannot create admin keys
            validate_admin(True, False)

    def test_valid_features_same(self):
        validate_features({"foo": True}, {"foo": True})

    def test_valid_features_lower(self):
        validate_features({"foo": False}, {"foo": True})

    def test_invalid_features_type(self):
        with self.assertRaises(ValidationError):
            # Fails because must be boolean values
            validate_features({"foo": "False"}, {"foo": True})

    def test_invalid_features_added(self):
        with self.assertRaises(ValidationError):
            # Fails because must be boolean values
            validate_features({"bar": True}, {"foo": True})

    def test_missing_expires_raises(self):
        event = {"body": '{"name": "test", "scope": ["service/org"]}'}
        with self.assertRaises(ValidationError):
            parse_body(event, admin=False, features=None, user_id="user1")

    def test_invalid_expires_type_raises(self):
        event = {"body": '{"name": "test", "scope": ["service/org"], "expires": 123}'}
        with self.assertRaises(ValidationError):
            parse_body(event, admin=False, features=None, user_id="user1")

    def test_invalid_expires_format_raises(self):
        event = {"body": '{"name": "test", "scope": ["service/org"], "expires": "notadate"}'}
        with self.assertRaises(ValidationError):
            parse_body(event, admin=False, features=None, user_id="user1")
