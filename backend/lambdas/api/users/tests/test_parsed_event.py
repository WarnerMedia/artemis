import json
import unittest
from datetime import datetime

from users.util.events import ParsedEvent
from users.util.validators import ValidationError


class TestParsedEvent(unittest.TestCase):
    def setUp(self):
        self.email = "testuser@example.com"
        self.offset = 0
        self.limit = 20
        self.date_string = "2021-12-02"
        self.scope = "*"
        self.feature = "snyk"
        self.base_event = {
            "pathParameters": {},
            "requestContext": {"authorizer": {}},
        }
        self.identity = {"id": self.email}
        self.paging = {"offset": self.offset, "limit": self.limit}
        self.admin_authorizer = {"admin": "true"}

    def test_parse_event_id(self):
        body = {"scope": ["*"]}
        event = self.base_event.copy()
        event["body"] = json.dumps(body)
        event["pathParameters"] = {**event["pathParameters"], **self.identity}
        parsed_event = ParsedEvent(event, parse_body=True)

        self.assertEqual(parsed_event.user_id, self.email)
        self.assertEqual(parsed_event.body, body)

    def test_parse_event_paging(self):
        event = self.base_event.copy()
        event["requestContext"]["authorizer"] = {**event["requestContext"]["authorizer"], **self.admin_authorizer}
        event["queryStringParameters"] = {**self.paging}
        event = ParsedEvent(event)

        self.assertEqual(event.offset, self.offset)
        self.assertEqual(event.limit, self.limit)

    def test_parse_event_id_paging(self):
        event = self.base_event.copy()
        event["requestContext"]["authorizer"] = {**event["requestContext"]["authorizer"], **self.admin_authorizer}
        event["queryStringParameters"] = {**self.paging}
        event["pathParameters"] = {**event["pathParameters"], **self.identity}

        with self.assertRaises(ValidationError):
            ParsedEvent(event)

    def test_parse_event_duplicate_filter(self):
        duplicate_filter = {"email": self.email, "email__contains": self.email}
        event = self.base_event.copy()
        event["requestContext"]["authorizer"] = {**event["requestContext"]["authorizer"], **self.admin_authorizer}
        event["queryStringParameters"] = {**self.paging, **duplicate_filter}
        event["pathParameters"] = {**event["pathParameters"], **self.identity}
        with self.assertRaises(ValidationError):
            ParsedEvent(event)

    def test_parse_event_invalid_filter(self):
        random_field_filter = {"random_field": self.email}
        event = self.base_event.copy()
        event["requestContext"]["authorizer"] = {**event["requestContext"]["authorizer"], **self.admin_authorizer}
        event["queryStringParameters"] = {**self.paging, **random_field_filter}
        event["pathParameters"] = {**event["pathParameters"], **self.identity}
        with self.assertRaises(ValidationError):
            ParsedEvent(event)

    def test_parse_event_invalid_date_value_filter(self):
        last_login_filter = {"last_login": self.email}
        event = self.base_event.copy()
        event["requestContext"]["authorizer"] = {**event["requestContext"]["authorizer"], **self.admin_authorizer}
        event["queryStringParameters"] = {**self.paging, **last_login_filter}
        event["pathParameters"] = {**event["pathParameters"], **self.identity}
        with self.assertRaises(ValidationError):
            ParsedEvent(event)

    def test_parse_event_valid_date_value_filter(self):
        last_login_filter = {"last_login": self.date_string}
        event = self.base_event.copy()
        event["requestContext"]["authorizer"] = {**event["requestContext"]["authorizer"], **self.admin_authorizer}
        event["queryStringParameters"] = {**self.paging, **last_login_filter}
        parsed_event = ParsedEvent(event)
        self.assertEqual(len(parsed_event.filters), 1)
        self.assertIsInstance(parsed_event.filters[0]["value"], datetime)

    def test_parse_event_exclusion_filter(self):
        exclusion_filter = {"email": "-{}".format(self.email)}
        event = self.base_event.copy()
        event["requestContext"]["authorizer"] = {**event["requestContext"]["authorizer"], **self.admin_authorizer}
        event["queryStringParameters"] = {**self.paging, **exclusion_filter}
        parsed_event = ParsedEvent(event)

        self.assertEqual(len(parsed_event.filters), 1)
        self.assertEqual(parsed_event.filters[0]["operation"], "exclusion")
        self.assertEqual(parsed_event.filters[0]["value"], self.email)

    def test_parse_event_valid_filter(self):

        # adjust filters for any new added field for testing
        filters = {
            "admin": True,
            "email": self.email,
            "email__contains": self.email,
            "email__icontains": self.email,
            "scope": self.scope,
            "scope__contains": self.scope,
            "scope__icontains": self.scope,
            "features": self.feature,
            "features__contains": self.feature,
            "features__icontains": self.feature,
            "last_login": self.date_string,
            "last_login__eq": self.date_string,
            "last_login__gt": self.date_string,
            "last_login__lt": self.date_string,
        }

        # multiple filters on the same field filters raises an error
        event = self.base_event.copy()
        event["requestContext"]["authorizer"] = {**event["requestContext"]["authorizer"], **self.admin_authorizer}
        event["queryStringParameters"] = {**self.paging, **filters}
        with self.assertRaises(ValidationError):
            ParsedEvent(event)

        # field filter variants
        filter_suffixes = ["__eq", "__gt", "__lt", "__contains", "__icontains"]
        for filter_name in filters.keys():
            event = self.base_event.copy()
            event["requestContext"]["authorizer"] = {**event["requestContext"]["authorizer"], **self.admin_authorizer}
            event["queryStringParameters"] = {
                **self.paging,
                filter_name: filters[filter_name],
            }
            filter_type = "exact"
            for suffix in filter_suffixes:
                if str(filter_name).endswith(suffix):
                    filter_type = suffix[2:]
            parsed_event = ParsedEvent(event)
            # only one filter
            self.assertEqual(len(parsed_event.filters), 1)
            # assert filter type
            self.assertEqual(parsed_event.filters[0]["type"], filter_type)

    def test_parse_user_list(self):

        self_email_filter = {
            "email": self.email,
        }

        scope_filter = {
            "scope": self.scope,
        }

        # non-admin user with filter raises an error
        event = self.base_event.copy()
        event["queryStringParameters"] = {**self.paging, **scope_filter}
        event["pathParameters"] = {**event["pathParameters"], **self.identity}
        with self.assertRaises(ValidationError):
            ParsedEvent(event)

        # non-admin user with self email filter succeeds
        event = self.base_event.copy()
        event["queryStringParameters"] = {**self_email_filter}
        event["pathParameters"] = {**event["pathParameters"], **self.identity}
        parsed_event = ParsedEvent(event)
        self.assertEqual(len(parsed_event.filters), 1)

        # non-admin user with no filter parses only one filter, with email,
        # user has to be authorised/authenticated
        event = self.base_event.copy()
        event["queryStringParameters"] = {**self.paging}
        event["requestContext"]["authorizer"] = {"email": self.email}
        parsed_event = ParsedEvent(event)
        self.assertEqual(len(parsed_event.filters), 1)
        self.assertEqual(parsed_event.filters[0]["operation"], "inclusion")
        self.assertEqual(parsed_event.filters[0]["field"], "email")
        self.assertEqual(parsed_event.filters[0]["value"], self.email)

        # admin user with filter filter succeeds
        event = self.base_event.copy()
        event["requestContext"]["authorizer"] = {**event["requestContext"]["authorizer"], **self.admin_authorizer}
        event["queryStringParameters"] = {**self.paging, **scope_filter}
        parsed_event = ParsedEvent(event)
        self.assertEqual(len(parsed_event.filters), 1)
