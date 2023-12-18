import copy
import unittest
from unittest.mock import patch

import authorizer.handlers

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
    {
        "new_domain": "company5.com",
        "old_domains": ["company6.com", "company6andsuffix.com"],
        "email_transformation": {"new_email_regex": "[.]", "old_email_expr": "_"},
    },
    {"new_domain": "newcompany.com", "old_domains": ["company.com"]},
]


USERS = [
    {
        "id": 1,
        "email": "first.last@company.com",
        "deleted": False,
        "last_login": "2023-01-01 00:00:00.000000+00:00",
        "self_group": {"name": "first.last@company.com"},
    },
    {
        "id": 2,
        "email": "first_last@company1.com",
        "deleted": False,
        "last_login": "2023-01-01 00:00:00.000000+00:00",
        "self_group": {"name": "first_last@company1.com"},
    },
    {
        "id": 3,
        "email": "first.last.1@company.com",
        "deleted": True,
        "last_login": "2023-01-01 00:00:00.000000+00:00",
        "self_group": {"name": "first.last.1@company.com"},
    },
    {
        "id": 4,
        "email": "last.first@company2.com",
        "deleted": False,
        "last_login": "2023-01-01 00:00:00.000000+00:00",
        "self_group": {"name": "last.first@company2.com"},
    },
    {
        "id": 5,
        "email": "first.last@company4.com",
        "deleted": False,
        "last_login": "2023-01-01 00:00:00.000000+00:00",
        "self_group": {"name": "first_last@company3.com"},
    },
    {
        "id": 6,
        "email": "first_last@company6.com",
        "deleted": False,
        "last_login": "2023-01-01 00:00:00.000000+00:00",
        "self_group": {"name": "first_last@company6.com"},
    },
    {
        "id": 7,
        "email": "first2_last2@company6andsuffix.com",
        "deleted": False,
        "last_login": "2023-01-01 00:00:00.000000+00:00",
        "self_group": {"name": "first2_last2@company6andsuffix.com"},
    },
]

EVENT_IP = "0.0.0.0"


class MockGroup(object):
    def __init__(self, **kwargs):
        self.name = kwargs.get("name") or ""
        self.group_id = kwargs.get("group_id") or ""
        self.scope = kwargs.get("scope") or []
        self.features = kwargs.get("features") or {}
        self.admin = kwargs.get("admin") or False
        self.allowlist = kwargs.get("allowlist") or False

    def save(self):
        pass

    @classmethod
    def create_self_group(cls, user):
        user.self_group = MockGroup(name=user.email)


class MockUser(object):
    users = []

    def __init__(self, **kwargs):
        user_ids = [x["id"] for x in MockUser.users]
        next_id = sorted(user_ids)[-1] + 1
        self.id = kwargs.get("id") or next_id
        self.email = kwargs.get("email")
        self.deleted = kwargs.get("deleted") or False
        self.last_login = kwargs.get("last_login") or ""
        self_group = kwargs.get("self_group") or None
        if self_group:
            self.self_group = MockGroup(name=self_group.get("name"))
        self.scope = kwargs.get("scope") or []
        self.features = kwargs.get("features") or {}
        self.admin = kwargs.get("admin") or False

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


# We need to remove the "transaction.atomic" decorator in order for this function to work in the following tests
# Unwrapping the function accomplishes this
_get_update_or_create_user = authorizer.handlers._get_update_or_create_user.__wrapped__


@patch("authorizer.handlers.AuditLogger.group_created", lambda *x, **y: None)
@patch("authorizer.handlers.AuditLogger.group_modified", lambda *x, **y: None)
@patch("authorizer.handlers.AuditLogger.user_created", lambda *x, **y: None)
@patch("authorizer.handlers.AuditLogger.user_modified", lambda *x, **y: None)
@patch("authorizer.handlers.EMAIL_DOMAIN_ALIASES", EMAIL_DOMAIN_ALIASES)
@patch("authorizer.handlers.User", MockUser)
@patch("authorizer.handlers.Group", MockGroup)
class TestGetUser(unittest.TestCase):
    def test_get_existing_user(self):
        """
        Get a user with email that already exists in the database
        """
        MockUser.users = copy.deepcopy(USERS)
        email = "first.last@company.com"
        user = _get_update_or_create_user(email=email, source_ip=EVENT_IP)
        self.assertTrue(
            user.__dict__.get("id") == 1
            and user.__dict__.get("email") == email
            and user.__dict__.get("self_group").name == email
        )

    def test_get_deleted_user(self):
        """
        Get a user with email that already exists in the database, but was soft deleted
        """
        MockUser.users = copy.deepcopy(USERS)
        email = "first.last.1@company.com"
        user = _get_update_or_create_user(email=email, source_ip=EVENT_IP)
        self.assertTrue(user == None)

    def test_get_nonexistent_user(self):
        """
        Attempt to get a user that does not exist, and create an account for that user with the given email
        """
        MockUser.users = copy.deepcopy(USERS)
        email = "first.last@doesnotexist.com"
        expected_userid = MockUser.users[-1].get("id") + 1
        user = _get_update_or_create_user(email=email, source_ip=EVENT_IP)
        self.assertTrue(
            user.__dict__.get("id") == expected_userid
            and user.__dict__.get("email") == email
            and user.__dict__.get("self_group").name == email
        )

    def test_get_user_with_new_email(self):
        """
        User logs in with email "first.last@newcompany.com" and has an existing account with email "first.last@company.com"
        Existing account is found, and email and self group name are updated to the new email "first.last@newcompany.com"
        """
        MockUser.users = copy.deepcopy(USERS)
        email = "first.last@newcompany.com"
        user = _get_update_or_create_user(email=email, source_ip=EVENT_IP)
        self.assertTrue(
            user.__dict__.get("id") == 1
            and user.__dict__.get("email") == email
            and user.__dict__.get("self_group").name == email
        )

    def test_get_user_with_new_email_with_transformation(self):
        """
        User logs in with email "first.last@company1.com" and has an existing account with email "first_last@company1.com"
        Existing account is found, and email and self group name are updated to the new email "first.last@company1.com"
        """
        MockUser.users = copy.deepcopy(USERS)
        email = "first.last@company1.com"
        user = _get_update_or_create_user(email=email, source_ip=EVENT_IP)
        self.assertTrue(
            user.__dict__.get("id") == 2
            and user.__dict__.get("email") == email
            and user.__dict__.get("self_group").name == email
        )

    def test_get_user_with_new_email_with_transformation2(self):
        """
        User logs in with email "first.last@company2.com" and has an existing account with email "last.first@company2.com"
        Existing account is found, and email and self group name are updated to the new email "first.last@company2.com"
        """
        MockUser.users = copy.deepcopy(USERS)
        email = "first.last@company2.com"
        user = _get_update_or_create_user(email=email, source_ip=EVENT_IP)
        self.assertTrue(
            user.__dict__.get("id") == 4
            and user.__dict__.get("email") == email
            and user.__dict__.get("self_group").name == email
        )

    def test_get_user_with_new_email_with_transformation3(self):
        """
        User logs in with email "first_last@company3.com" and has an existing account with email "first.last@company.com"
        Existing account is found, and email and self group name are updated to the new email "first_last@company3.com"
        """
        MockUser.users = copy.deepcopy(USERS)
        email = "first_last@company3.com"
        user = _get_update_or_create_user(email=email, source_ip=EVENT_IP)
        self.assertTrue(
            user.__dict__.get("id") == 1
            and user.__dict__.get("email") == email
            and user.__dict__.get("self_group").name == email
        )

    def test_get_user_with_email_and_self_group_mismatch(self):
        """
        User logs in with email "first.last@company4.com" and has an existing account with email "first.last@company4.com", but self-group name does not match
        Existing account is found, and self group name is updated to the new email "first.last@company4.com"
        """
        MockUser.users = copy.deepcopy(USERS)
        email = "first.last@company4.com"
        user = _get_update_or_create_user(email=email, source_ip=EVENT_IP)
        self.assertTrue(
            user.__dict__.get("id") == 5
            and user.__dict__.get("email") == email
            and user.__dict__.get("self_group").name == email
        )

    def test_get_user_with_new_email_and_deleted_old_user(self):
        """
        User logs in with email "first.last.1@newcompany.com" and has an existing account with email "first.last.1@company.com"
        Existing account is found, but was deleted, so create a new account with the new email
        """
        MockUser.users = copy.deepcopy(USERS)
        email = "first.last.1@newcompany.com"
        expected_userid = MockUser.users[-1].get("id") + 1
        user = _get_update_or_create_user(email=email, source_ip=EVENT_IP)
        self.assertTrue(
            user.__dict__.get("id") == expected_userid
            and user.__dict__.get("email") == email
            and user.__dict__.get("self_group").name == email
        )

    def test_get_user_with_new_email_and_multiple_old_domains_first_domain(self):
        """
        User logs in with email "first.last@company5.com" and has an existing acount with email "first_last@company6.com"
        Existing account is found, and email and self group name are updated to the new email "first.last@company5.com"
        This is distinct from other tests because there are multiple old domains mapped to new domain company5.com
        """
        MockUser.users = copy.deepcopy(USERS)
        email = "first.last@company5.com"
        user = _get_update_or_create_user(email=email, source_ip=EVENT_IP)
        self.assertTrue(
            user.__dict__.get("id") == 6
            and user.__dict__.get("email") == email
            and user.__dict__.get("self_group").name == email
        )

    def test_get_user_with_new_email_and_multiple_old_domains_second_domain(self):
        """
        User logs in with email "first2.last2@company5.com" and has an existing acount with email "first2_last2@company6andsuffix.com"
        Existing account is found, and email and self group name are updated to the new email "first.last@company5.com"
        This is distinct from other tests because there are multiple old domains mapped to new domain company5.com
        """
        MockUser.users = copy.deepcopy(USERS)
        email = "first2.last2@company5.com"
        user = _get_update_or_create_user(email=email, source_ip=EVENT_IP)
        self.assertTrue(
            user.__dict__.get("id") == 7
            and user.__dict__.get("email") == email
            and user.__dict__.get("self_group").name == email
        )
