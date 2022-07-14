import unittest

from users.util.validators import ValidationError, validate_post_body


class TestUserValidators(unittest.TestCase):
    def test_no_post_body(self):
        with self.assertRaises(ValidationError):
            # Body can't be None
            validate_post_body(None)

    def test_invalid_post_body(self):
        with self.assertRaises(ValidationError):
            # Body must be a dict
            validate_post_body([])

    def test_valid_keys(self):
        # Valid body parameters and values
        validate_post_body({"scope": ["*"], "admin": False, "features": {}})

    def test_invalid_keys(self):
        with self.assertRaises(ValidationError):
            # Only support keys are allowed
            validate_post_body({"foo": "bar"})

    def test_admin_type(self):
        with self.assertRaises(ValidationError):
            # Admin must be a boolean
            validate_post_body({"admin": 1})

    def test_scope_type(self):
        with self.assertRaises(ValidationError):
            # Scope must be a list
            validate_post_body({"scope": True})

    def test_scope_values(self):
        with self.assertRaises(ValidationError):
            # Scope must be a list of strings
            validate_post_body({"scope": [1]})

    def test_features_type(self):
        with self.assertRaises(ValidationError):
            # Features must be a dict
            validate_post_body({"features": []})

    def test_features_values(self):
        with self.assertRaises(ValidationError):
            # Features must be a dict of booleans
            validate_post_body({"features": {"foo": "bar"}})
