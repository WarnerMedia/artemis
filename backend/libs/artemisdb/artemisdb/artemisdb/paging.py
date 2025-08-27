import importlib
from enum import Enum
from http import HTTPStatus
from typing import Callable

from django.db.models.query import QuerySet

from artemisdb.artemisdb.consts import DEFAULT_PAGE_SIZE
from artemisdb.artemisdb.env import API_PATH, CUSTOM_FILTERING_MODULE
from artemislib.datetime import from_iso_timestamp
from artemislib.logging import Logger
from artemisapi.const import REPO_SEARCH_CICD_TOOL_PARAM

IGNORED_FIELDS = [REPO_SEARCH_CICD_TOOL_PARAM]

try:
    # If the Artemis API library is present load the response method and validation exception
    from artemisapi.response import response
    from artemisapi.validators import ValidationError
except ImportError:
    # Dummy response method
    def response(*_args, **_kwargs):
        return {"isBase64Encoded": "false", "statusCode": HTTPStatus.NOT_IMPLEMENTED}

    class ValidationError(Exception):
        def __init__(self, *_args, **_kwargs):
            super().__init__()


class FilterType(Enum):
    EXACT = "exact"
    CONTAINS = "contains"
    ICONTAINS = "icontains"
    GREATER_THAN = "gt"
    LESS_THAN = "lt"
    IS_NULL = "isnull"
    IS_IN = "in"


LOG = Logger(__name__)

CUSTOM_FILTERING = None


def load_custom_filtering():
    # This method loads the custom filtering once. This is done so that custom
    # filtering is loaded on-demand after artemisdb loads, removing circular
    # import problems with the Filter, FilterMap, etc. classes.
    global CUSTOM_FILTERING
    if CUSTOM_FILTERING is not None:
        return

    CUSTOM_FILTERING = {}
    if CUSTOM_FILTERING_MODULE:
        try:
            m = importlib.import_module(CUSTOM_FILTERING_MODULE)
            CUSTOM_FILTERING = m.CUSTOM_FILTERING
        except (ModuleNotFoundError, AttributeError) as e:
            LOG.error("Unable to load custom filtering module %s, Error: %s", CUSTOM_FILTERING_MODULE, e)


class Filter:
    def __init__(self, field: str, value: str, filter_type: FilterType) -> None:
        self.field = field
        self.value = value
        self.type = filter_type

    def __eq__(self, __o: object) -> bool:
        if not isinstance(__o, Filter):
            return False
        return self.field == __o.field and self.value == __o.value and self.type == __o.type

    def __str__(self) -> str:
        return f"Filter<{self.field}, {self.value}, {self.type.value}>"

    def __repr__(self) -> str:
        return str(self)


class FilterMapItem:
    def __init__(
        self,
        key: str,
        exclude: bool = False,
        value: object = None,
        others: list = None,
        generator: Callable[[Filter], QuerySet] = None,
    ) -> None:
        self.key = key
        self.exclude = exclude
        self.others = others or []

        # Override the value from the filter. This is when used in the "others" list
        self.value = value

        # Custom QuerySet filter generator overrides all for very complicated filtering
        self.generator = generator

    def __str__(self) -> str:
        return f"FilterMapItem<{self.key}, {self.exclude}>"

    def __repr__(self) -> str:
        return str(self)


class FilterMap:
    def __init__(self) -> None:
        self._map = {}

    def add(
        self, field: str, alias: str = None, filter_type: FilterType = FilterType.EXACT, item: FilterMapItem = None
    ) -> None:
        if alias is None:
            alias = field

        if alias not in self._map:
            self._map[alias] = {}

        if item is not None:
            # Non-standard lookup, such as when going through multiple tables
            self._map[alias][filter_type] = item
        else:
            # If a custom FilterMapItem is not provided use the default lookup format
            self._map[alias][filter_type] = FilterMapItem(f"{field}__{filter_type.value}")

    def add_string(self, field: str, alias: str = None, null: bool = False) -> None:
        for filter_type in [FilterType.EXACT, FilterType.CONTAINS, FilterType.ICONTAINS]:
            self.add(field, alias, filter_type)
        if null:
            self.add(field, alias, FilterType.IS_NULL)

    def add_timestamp(self, field: str, alias: str = None) -> None:
        for filter_type in [FilterType.EXACT, FilterType.GREATER_THAN, FilterType.LESS_THAN]:
            self.add(field, alias, filter_type)

    def add_boolean(self, field: str, alias: str = None) -> None:
        self.add(field, alias, FilterType.EXACT)

    def _lookup(self, filter: Filter) -> FilterMapItem:
        return self._map.get(filter.field, {}).get(filter.type)

    def apply(self, qs: QuerySet, filters: list[Filter], custom_filter_map=None) -> QuerySet:
        # Apply filters
        for filter in filters:
            item = self._lookup(filter)
            if item is None and custom_filter_map is not None:
                # Filter didn't match the built-in filters so check the custom ones
                item = custom_filter_map._lookup(filter)
            if item.generator is not None:
                # If the FilterMapItem has a generator function defined use that
                qs = item.generator(qs, filter)
            else:
                # Otherwise, apply the filter using the normal construction
                f = {item.key: filter.value}
                for other in item.others:
                    f[other.key] = other.value
                if item.exclude:
                    qs = qs.exclude(**f)
                else:
                    qs = qs.filter(**f)
        return qs


class PageInfo:
    def __init__(
        self, offset: int, limit: int, filters: list[Filter], order_by: list[str], query_str: str = None
    ) -> None:
        self.offset = offset
        self.limit = limit
        self.filters = filters
        self.order_by = order_by
        self.query_str = query_str

    def __str__(self) -> str:
        return (
            f"PageInfo<offset={self.offset}, limit={self.limit}, "
            f"filter_count={len(self.filters)}, order_by={self.order_by}"
        )

    def __repr__(self) -> str:
        return str(self)


def page(
    qs,
    offset: int,
    limit: int,
    api_resource: str,
    to_dict_kwargs: dict = None,
    extra_args: str = None,
    query_str: str = None,
    post_processor=None,
):
    end = offset + limit
    count = 0

    # Format the page of objects into a list
    obj_list = []
    if qs is not None:
        # .count() is more efficient than len() since we're slicing the QuerySet. Some unit tests actually end up
        # passing in a list as the result of the mocked QuerySet and list.count() doesn't have the same method signature
        # as QuerySet.count() so in those cases use len().
        count = qs.count() if isinstance(qs, QuerySet) else len(qs)
        for obj in qs[offset:end]:
            if to_dict_kwargs is None:
                to_dict_kwargs = {}
            item_dict = obj.to_dict(**to_dict_kwargs)

            # Apply post-processing if a function was provided
            if post_processor is not None:
                item_dict = post_processor(obj, item_dict)

            obj_list.append(item_dict)

    # Build the paging links
    next_offset = offset + limit
    prev_offset = offset - limit

    next_page = f"{API_PATH}{api_resource}?limit={limit}&offset={next_offset}"
    prev_page = f"{API_PATH}{api_resource}?limit={limit}&offset={prev_offset}"

    if query_str:
        next_page = f"{next_page}&{query_str}"
        prev_page = f"{prev_page}&{query_str}"

    if extra_args is not None:
        next_page = f"{next_page}&{extra_args}"
        prev_page = f"{prev_page}&{extra_args}"

    if len(obj_list) < limit:
        next_page = None

    if prev_offset < 0:
        prev_page = None

    # Mimic DRF limit-offset paging
    return response({"results": obj_list, "count": count, "next": next_page, "previous": prev_page})


def validate_paging_query(query: dict) -> tuple:
    try:
        offset = int(query.get("offset", 0))
        limit = int(query.get("limit", DEFAULT_PAGE_SIZE))
    except ValueError:
        raise ValidationError("Invalid offset or limit")

    if offset < 0:
        raise ValidationError("Offset must be non-negative")

    if limit <= 0:
        raise ValidationError("Limit must be positive")

    return (offset, limit)


def parse_paging_event(
    event: dict,
    ordering_fields: list = None,
    exact_filters: list = None,
    substring_filters: list = None,
    timestamp_filters: list = None,
    mv_filters: list = None,
    nullable_filters: list = None,
    boolean_filters: list = None,
    ordering_aliases: dict = None,
    mv_validators: dict = None,
    api_id: str = None,
) -> PageInfo:
    load_custom_filtering()
    if api_id in CUSTOM_FILTERING:
        # Merge in any custom filter fields
        ordering_fields = (ordering_fields or []) + CUSTOM_FILTERING[api_id].get("ordering_fields", [])
        exact_filters = (exact_filters or []) + CUSTOM_FILTERING[api_id].get("exact_filters", [])
        substring_filters = (substring_filters or []) + CUSTOM_FILTERING[api_id].get("substring_filters", [])
        timestamp_filters = (timestamp_filters or []) + CUSTOM_FILTERING[api_id].get("timestamp_filters", [])
        mv_filters = (mv_filters or []) + CUSTOM_FILTERING[api_id].get("mv_filters", [])
        nullable_filters = (nullable_filters or []) + CUSTOM_FILTERING[api_id].get("nullable_filters", [])
        boolean_filters = (boolean_filters or []) + CUSTOM_FILTERING[api_id].get("boolean_filters", [])

        ordering_aliases = ordering_aliases or {}
        ordering_aliases.update(CUSTOM_FILTERING[api_id].get("ordering_aliases", {}))
        mv_validators = mv_validators or {}
        mv_validators.update(CUSTOM_FILTERING[api_id].get("mv_validators", {}))

    query = event.get("queryStringParameters") or {}
    mv_query = event.get("multiValueQueryStringParameters") or {}

    # Calculate the paging
    offset, limit = validate_paging_query(query)

    # Extract order_by from the args before checking the filters
    order_by = []
    full_ordering_fields = (ordering_fields or []) + [f"-{f}" for f in ordering_fields or []]
    for order in list(filter(None, query.get("order_by", "").split(","))):
        if order not in full_ordering_fields:
            raise ValidationError(f"Invalid order_by: {order}")
        order_by.append(order if order not in (ordering_aliases or {}) else ordering_aliases[order])
    if "order_by" in query:
        del query["order_by"]

    # Process the filter args
    filters = []

    # Fields that do exact matches
    for filter_field in exact_filters or []:
        if filter_field in query:
            filters.append(Filter(filter_field, query[filter_field], FilterType.EXACT))

    # Fields that allow substring matches
    for filter_field in substring_filters or []:
        if f"{filter_field}__contains" in query:
            filters.append(Filter(filter_field, query[f"{filter_field}__contains"], FilterType.CONTAINS))
        if f"{filter_field}__icontains" in query:
            filters.append(Filter(filter_field, query[f"{filter_field}__icontains"], FilterType.ICONTAINS))

    # Timestamp-based filters that can have exact or greater/less-than matches
    for filter_field in timestamp_filters or []:
        if filter_field in query:
            try:
                value = from_iso_timestamp(query[filter_field])
            except ValueError:
                raise ValidationError("Invalid timestamp")
            filters.append(Filter(filter_field, value, FilterType.EXACT))
        if f"{filter_field}__gt" in query:
            try:
                value = from_iso_timestamp(query[f"{filter_field}__gt"])
            except ValueError:
                raise ValidationError("Invalid timestamp")
            filters.append(Filter(filter_field, value, FilterType.GREATER_THAN))
        if f"{filter_field}__lt" in query:
            try:
                value = from_iso_timestamp(query[f"{filter_field}__lt"])
            except ValueError:
                raise ValidationError("Invalid timestamp")
            filters.append(Filter(filter_field, value, FilterType.LESS_THAN))

    # Fields that do null checks
    for filter_field in nullable_filters or []:
        if f"{filter_field}__isnull" in query:
            if query[f"{filter_field}__isnull"].lower() not in ["true", "false"]:
                raise ValidationError(f"{filter_field}__isnull must be a boolean")
            filters.append(Filter(filter_field, query[f"{filter_field}__isnull"].lower() == "true", FilterType.IS_NULL))

    # Fields that are looking for a value in a list
    for filter_field in mv_filters or []:
        if filter_field in mv_query:
            if filter_field in (mv_validators or {}):
                # If the multi-value field has a validator defined execute it against the value
                for mv_value in mv_query[filter_field]:
                    if not mv_validators[filter_field](mv_value):
                        raise ValidationError(f"Invalid value for {filter_field}: {mv_value}")
            filters.append(Filter(filter_field, mv_query[filter_field], FilterType.IS_IN))

    # Fields that are booleans
    for filter_field in boolean_filters or []:
        if f"{filter_field}" in query:
            if query[f"{filter_field}"].lower() not in ["true", "false"]:
                raise ValidationError(f"{filter_field} must be a boolean")
            filters.append(Filter(filter_field, query[filter_field].lower() == "true", FilterType.EXACT))

    # Build up the complete list of all possible args
    supported_fields = ["offset", "limit"]
    supported_fields += exact_filters or []
    supported_fields += mv_filters or []
    supported_fields += [f"{f}__contains" for f in substring_filters or []] + [
        f"{f}__icontains" for f in substring_filters or []
    ]
    supported_fields += (
        (timestamp_filters or [])
        + [f"{f}__gt" for f in timestamp_filters or []]
        + [f"{f}__lt" for f in timestamp_filters or []]
    )
    supported_fields += [f"{f}__isnull" for f in nullable_filters or []]
    supported_fields += boolean_filters or []

    supported_fields += IGNORED_FIELDS

    # Check that there are no unsupported fields in the query args
    for field in query.keys():
        if field not in supported_fields:
            raise ValidationError(f"Unsupported filter option: {field}")

    query_str = ""
    for arg in mv_query:
        for v in mv_query[arg]:
            if query_str:
                query_str += "&"
            query_str += f"{arg}={v}"

    return PageInfo(offset, limit, filters, order_by, query_str)


def apply_filters(
    qs: QuerySet,
    filter_map: FilterMap,
    page_info: PageInfo,
    distinct: bool = True,
    default_order: list[str] = None,
    api_id: str = None,
    apply_ordering: bool = True,
) -> QuerySet:
    # Get any custom filters
    load_custom_filtering()
    custom_filter_map = CUSTOM_FILTERING.get(api_id, {}).get("filter_map")

    # Apply filters
    qs = filter_map.apply(qs, page_info.filters, custom_filter_map)

    # Apply ordering
    if apply_ordering:
        if page_info.order_by:
            qs = qs.order_by(*page_info.order_by)
        elif default_order is not None:
            # Default ordering
            qs = qs.order_by(*default_order)

    if distinct:
        qs = qs.distinct()

    return qs
