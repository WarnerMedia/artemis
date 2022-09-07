import unittest
from datetime import datetime, timezone

from artemisapi.validators import ValidationError
from artemisdb.artemisdb.consts import DEFAULT_PAGE_SIZE
from artemisdb.artemisdb.models import Repo, Scan
from artemisdb.artemisdb.paging import (
    Filter,
    FilterMap,
    FilterMapItem,
    FilterType,
    PageInfo,
    apply_filters,
    parse_paging_event,
)


class TestPageFiltering(unittest.TestCase):
    def test_parse_paging_event(self):
        event = {
            "queryStringParameters": {
                "test_key": "test_value",
                "test_key__contains": "test_substring",
                "test_key__icontains": "test_substring",
                "test_time": "2022-01-01T00:00:00+00:00",
                "test_time__lt": "2022-01-01T00:00:00+00:00",
                "test_time__gt": "2022-01-01T00:00:00+00:00",
                "test_null__isnull": "true",
                "test_boolean": "false",
                "order_by": "key1,key2,-key3",
            },
            "multiValueQueryStringParameters": {"test_in": ["test_value"]},
        }
        result = parse_paging_event(
            event,
            exact_filters=["test_key"],
            substring_filters=["test_key"],
            timestamp_filters=["test_time"],
            nullable_filters=["test_null"],
            mv_filters=["test_in"],
            boolean_filters=["test_boolean"],
            ordering_fields=["key1", "key2", "key3"],
        )
        expected = PageInfo(
            offset=0,
            limit=DEFAULT_PAGE_SIZE,
            filters=[
                Filter("test_key", "test_value", FilterType.EXACT),
                Filter("test_key", "test_substring", FilterType.CONTAINS),
                Filter("test_key", "test_substring", FilterType.ICONTAINS),
                Filter("test_time", datetime(2022, 1, 1, tzinfo=timezone.utc), FilterType.EXACT),
                Filter("test_time", datetime(2022, 1, 1, tzinfo=timezone.utc), FilterType.GREATER_THAN),
                Filter("test_time", datetime(2022, 1, 1, tzinfo=timezone.utc), FilterType.LESS_THAN),
                Filter("test_null", True, FilterType.IS_NULL),
                Filter("test_in", ["test_value"], FilterType.IS_IN),
                Filter("test_boolean", False, FilterType.EXACT),
            ],
            order_by=["key1", "key2", "-key3"],
        )
        self.assertEqual(expected.offset, result.offset)
        self.assertEqual(expected.limit, result.limit)
        self.assertEqual(expected.filters, result.filters)
        self.assertEqual(expected.order_by, result.order_by)

    def test_parse_paging_event_parsing(self):
        test_cases = [
            {"queryStringParameters": {"test_time": "foobar"}},
            {"queryStringParameters": {"test_time__gt": "foobar"}},
            {"queryStringParameters": {"test_time__lt": "foobar"}},
            {"queryStringParameters": {"test_null": "foobar"}},
            {"queryStringParameters": {"test_boolean": "foobar"}},
            {"queryStringParameters": {"not_supported": "foobar"}},
            {"queryStringParameters": {"order_by": "foobar"}},
        ]
        for test_case in test_cases:
            with self.subTest(test_case=test_case):
                with self.assertRaises(ValidationError):
                    parse_paging_event(
                        test_case,
                        timestamp_filters=["test_time"],
                        nullable_filters=["test_null"],
                        boolean_filters=["test_boolean"],
                        ordering_fields=["key"],
                    )

    def test_apply_filters(self):
        f = {"application_metadata__scheme__field-name__contains": "1234"}
        expected = (
            Repo.objects.filter(service="github")
            .filter(repo="testorg/testrepo")
            .filter(**f)
            .filter(scan__qualified=True, scan__created__gt=datetime(2022, 1, 1, tzinfo=timezone.utc))
            .order_by("repo")
            .distinct()
        )
        page_info = PageInfo(
            offset=0,
            limit=DEFAULT_PAGE_SIZE,
            filters=[
                Filter("service", "github", FilterType.EXACT),
                Filter("repo", "testorg/testrepo", FilterType.EXACT),
                Filter("field_name", "1234", FilterType.EXACT),
                Filter("last_qualified_scan", "2022-01-01T00:00:00+00:00", FilterType.GREATER_THAN),
            ],
            order_by=["repo"],
        )
        map = FilterMap()
        map.add("service", filter_type=FilterType.EXACT)
        map.add("repo", filter_type=FilterType.EXACT)
        map.add(
            "field_name",
            filter_type=FilterType.EXACT,
            item=FilterMapItem("application_metadata__scheme__field-name__contains"),
        )
        map.add(
            "last_qualified_scan",
            filter_type=FilterType.GREATER_THAN,
            item=FilterMapItem("scan__created__gt", others=[FilterMapItem("scan__qualified", value=True)]),
        )

        qs = Repo.objects.all()
        actual = apply_filters(qs, map, page_info)

        # Check that the SQL for the generated QuerySet matches the SQL of the expected QuerySet
        self.assertEqual(str(expected.query), str(actual.query))

    def test_field_alias(self):
        expected = Scan.objects.filter(repo__service="github").order_by("-created").distinct()
        page_info = PageInfo(
            offset=0,
            limit=DEFAULT_PAGE_SIZE,
            filters=[
                Filter("service", "github", FilterType.EXACT),
            ],
            order_by=["-created"],
        )
        map = FilterMap()
        map.add_string("repo__service", "service")

        qs = Scan.objects.all()
        actual = apply_filters(qs, map, page_info)

        # Check that the SQL for the generated QuerySet matches the SQL of the expected QuerySet
        self.assertEqual(str(expected.query), str(actual.query))

    def test_filter_generator(self):
        expected = Repo.objects.exclude(scan__qualified=True).order_by("service", "repo").distinct()
        page_info = PageInfo(
            offset=0,
            limit=DEFAULT_PAGE_SIZE,
            filters=[
                Filter("last_qualified_scan", True, FilterType.IS_NULL),
            ],
            order_by=["service", "repo"],
        )

        def _test(qs, filter):
            if filter.value:
                qs = qs.exclude(scan__qualified=True)
            else:
                qs = qs.filter(scan__qualified=True)
            return qs

        map = FilterMap()
        map.add(
            "last_qualified_scan",
            filter_type=FilterType.IS_NULL,
            item=FilterMapItem("last_qualified_scan", generator=_test),
        )

        qs = Repo.objects.all()
        actual = apply_filters(qs, map, page_info)

        # Check that the SQL for the generated QuerySet matches the SQL of the expected QuerySet
        self.assertEqual(str(expected.query), str(actual.query))
