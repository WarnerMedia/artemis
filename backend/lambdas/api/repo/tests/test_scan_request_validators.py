"""
Tests Validators API
"""

import os
import unittest

from artemisapi.validators import ValidationError
from repo.util.const import INVALID_REF_CHARS, MAX_DIFF_BASE
from repo.util.services import get_services_dict
from repo.util.validators import Validator

TEST_DIR = os.path.dirname(os.path.abspath(__file__))


class TestScanRequestValidators(unittest.TestCase):
    def setUp(self) -> None:
        services_loc = os.path.join(TEST_DIR, "data", "services.json")
        services_dict = get_services_dict(services_loc)
        self.validator = Validator(services_dict.get("services"), services_dict.get("repos"))

    def test_diff_base_valid(self):
        req = {"org": "testorg", "repo": "testrepo", "diff_base": "dev"}
        self.validator.validate_request_body([req], "github", self.validator._validate_request_item)

    def test_diff_base_invalid(self):
        req = {"org": "testorg", "repo": "testrepo", "diff_base": 1}
        with self.assertRaises(ValidationError):
            self.validator.validate_request_body([req], "github", self.validator._validate_request_item)

    def test_diff_base_none(self):
        req = {"org": "testorg", "repo": "testrepo", "diff_base": None}
        self.validator.validate_request_body([req], "github", self.validator._validate_request_item)

    def test_diff_base_long(self):
        req = {"org": "testorg", "repo": "testrepo", "diff_base": "A" * MAX_DIFF_BASE}
        self.validator.validate_request_body([req], "github", self.validator._validate_request_item)

    def test_diff_base_too_long(self):
        req = {"org": "testorg", "repo": "testrepo", "diff_base": "A" * (MAX_DIFF_BASE + 1)}
        with self.assertRaises(ValidationError):
            self.validator.validate_request_body([req], "github", self.validator._validate_request_item)

    def test_diff_base_empty(self):
        req = {"org": "testorg", "repo": "testrepo", "diff_base": ""}
        with self.assertRaises(ValidationError):
            self.validator.validate_request_body([req], "github", self.validator._validate_request_item)

    def test_diff_base_invalid_chars(self):
        req = {"org": "testorg", "repo": "testrepo", "diff_base": f"foo{INVALID_REF_CHARS[0]}"}
        with self.assertRaises(ValidationError):
            self.validator.validate_request_body([req], "github", self.validator._validate_request_item)


if __name__ == "__main__":
    unittest.main()
