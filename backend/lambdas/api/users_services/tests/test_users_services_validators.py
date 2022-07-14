import unittest

from artemisapi.validators import ValidationError
from users_services.util.validators import validate_service


class TestValidators(unittest.TestCase):
    def test_valid_service(self):
        # Succeeds because github is a valid service
        validate_service("github")

    def test_invalid_service(self):
        # Fails because foohub is not a valid service
        with self.assertRaises(ValidationError):
            validate_service("foohub")
