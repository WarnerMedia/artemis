import authorizer.handlers
import copy
import unittest

from unittest.mock import patch

EMAIL_DOMAIN_ALIASES = [
    {
        "new_domain": "company1.com",
        "old_domains": ["company1.com"],
        "email_transformation": {"new_email_regex": "[.]", "old_email_expr": "_"},
    },
    {
        "new_domain": "company2.com",
        "old_domains": ["company2.com"],
        "email_transformation": {"new_email_regex": "([a-z]+)\.([a-z]+)", "old_email_expr": "\\2.\\1"},
    },
    {
        "new_domain": "company3.com",
        "old_domains": ["company.com"],
        "email_transformation": {"new_email_regex": "_", "old_email_expr": "."},
    },
    {"new_domain": "newcompany.com", "old_domains": ["company.com"]},
]


USERS = [
    {
        "id": 1,
        "email": "first.last@company.com",
        "deleted": False,
        "last_login": "2023-01-01 00:00:00.000000+00:00",
    },
    {
        "id": 2,
        "email": "first_last@company1.com",
        "deleted": False,
        "last_login": "2023-01-01 00:00:00.000000+00:00",
    },
    {
        "id": 3,
        "email": "first.last.1@company.com",
        "deleted": True,
        "last_login": "2023-01-01 00:00:00.000000+00:00",
    },
    {
        "id": 4,
        "email": "last.first@company2.com",
        "deleted": False,
        "last_login": "2023-01-01 00:00:00.000000+00:00",
    },
]


class MockUser(object):
    users = []

    def __init__(self, **kwargs):
        user_ids = [x["id"] for x in MockUser.users]
        next_id = sorted(user_ids)[-1] + 1
        self.id = kwargs.get("id") or next_id
        self.email = kwargs.get("email")
        self.deleted = kwargs.get("deleted") or False
        self.last_login = kwargs.get("last_login") or ""

    def save(self):
        for user in MockUser.users:
            if user["id"] == self.id:
                for key, value in self.__dict__.items():
                    user[key] = value

    class DoesNotExist(Exception):
        def __init__(self):
            self.message = f"User not found!"
            super().__init__(self.message)

    class objects:
        def create(email: str, **kwargs):
            mock_user = MockUser(email=email, **kwargs)
            MockUser.users.append(mock_user.__dict__)
            return mock_user

        def get(email: str, **kwargs):
            for user in MockUser.users:
                if user.get("email") == email:
                    return MockUser(**user)
            raise MockUser.DoesNotExist


# We need to remove the "transaction.atomic" decorator in order for functions to work in these tests
# This is why several functions following are unwraped
_get_update_or_create_user = authorizer.handlers._get_update_or_create_user.__wrapped__


@patch("authorizer.handlers.EMAIL_DOMAIN_ALIASES", EMAIL_DOMAIN_ALIASES)
@patch("authorizer.handlers.User", MockUser)
@patch("authorizer.handlers._create_user", authorizer.handlers._create_user.__wrapped__)
@patch("authorizer.handlers._update_login_timestamp", authorizer.handlers._update_login_timestamp.__wrapped__)
class TestGetUser(unittest.TestCase):
    def test_get_existing_user(self):
        """
        Get a user with email that already exists in the database
        """
        MockUser.users = copy.deepcopy(USERS)
        email = "first.last@company.com"
        user = _get_update_or_create_user(email=email)
        self.assertTrue(user.__dict__.get("id") == 1 and user.__dict__.get("email") == email)

    def test_get_deleted_user(self):
        """
        Get a user with email that already exists in the database, but was soft deleted
        """
        MockUser.users = copy.deepcopy(USERS)
        email = "first.last.1@company.com"
        user = _get_update_or_create_user(email=email)
        self.assertTrue(user == None)

    @patch("authorizer.handlers.Group.create_self_group")
    def test_get_nonexistent_user(self, mock_create_self_group):
        """
        Attempt to get a user that does not exist, and create an account for that user with the given email
        """
        MockUser.users = copy.deepcopy(USERS)
        mock_create_self_group.return_value = True
        email = "first.last@doesnotexist.com"
        user = _get_update_or_create_user(email=email)
        self.assertTrue(user.__dict__.get("id") == 5 and user.__dict__.get("email") == email)

    def test_get_user_with_new_email(self):
        """
        User logs in with email "first.last@newcompany.com" and has an existing account with email "first.last@company.com"
        Existing account is found, and email is updated to the new email "first.last@newcompany.com"
        """
        MockUser.users = copy.deepcopy(USERS)
        email = "first.last@newcompany.com"
        user = _get_update_or_create_user(email=email)
        self.assertTrue(user.__dict__.get("id") == 1 and user.__dict__.get("email") == email)

    def test_get_user_with_new_email_with_transformation(self):
        """
        User logs in with email "first.last@company1.com" and has an existing account with email "first_last@company1.com"
        Existing account is found, and email is updated to the new email "first.last@company1.com"
        """
        MockUser.users = copy.deepcopy(USERS)
        email = "first.last@company1.com"
        user = _get_update_or_create_user(email=email)
        self.assertTrue(user.__dict__.get("id") == 2 and user.__dict__.get("email") == email)

    def test_get_user_with_new_email_with_transformation2(self):
        """
        User logs in with email "first.last@company2.com" and has an existing account with email "last.first@company2.com"
        Existing account is found, and email is updated to the new email "first.last@company2.com"
        """
        MockUser.users = copy.deepcopy(USERS)
        email = "first.last@company2.com"
        user = _get_update_or_create_user(email=email)
        self.assertTrue(user.__dict__.get("id") == 4 and user.__dict__.get("email") == email)

    def test_get_user_with_new_email_with_transformation3(self):
        """
        User logs in with email "first_last@company3.com" and has an existing account with email "first.last@company.com"
        Existing account is found, and email is updated to the new email "first_last@company3.com"
        """
        MockUser.users = copy.deepcopy(USERS)
        email = "first_last@company3.com"
        user = _get_update_or_create_user(email=email)
        self.assertTrue(user.__dict__.get("id") == 1 and user.__dict__.get("email") == email)

    @patch("authorizer.handlers.Group.create_self_group")
    def test_get_user_with_new_email_and_deleted_old_user(self, mock_create_self_group):
        """
        User logs in with email "first.last.1@newcompany.com" and has an existing account with email "first.last.1@company.com"
        Existing account is found, but was deleted, so create a new account with the new email
        """
        MockUser.users = copy.deepcopy(USERS)
        mock_create_self_group.return_value = True
        email = "first.last.1@newcompany.com"
        user = _get_update_or_create_user(email=email)
        self.assertTrue(user.__dict__.get("id") == 5 and user.__dict__.get("email") == email)
