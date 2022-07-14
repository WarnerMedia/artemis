from artemisapi.validators import ValidationError
from artemisdb.artemisdb.paging import validate_paging_query
from artemislib.datetime import from_iso_timestamp
from search_repositories.util.validators import validate_risk

DEFAULT_PAGE_SIZE = 20


def parse_event(event):
    query = event.get("queryStringParameters") or {}
    mv_query = event.get("multiValueQueryStringParameters") or {}

    # Calculate the paging
    offset, limit = validate_paging_query(query)

    # Validate the risk filter values
    if "risk" in mv_query:
        validate_risk(mv_query["risk"])
        mv_query["risk"] = [r.lower() for r in mv_query["risk"]]

    # Extract order_by from the args before checking the filters
    order_by = [s for s in query.get("order_by", "").split(",") if s != ""]
    if "order_by" in query:
        del query["order_by"]

    # Process the filter args
    filters = []

    # String-based filters that can have exact or case (in)sensitive matches
    filter_fields = ["service", "repo"]  # Always an option

    value_filter_fields = ["last_qualified_scan"]

    # String-based filters that can be included more than once
    mv_filter_fields = ["risk"]

    nullable_filter_fields = ["last_qualified_scan"]

    for filter_field in filter_fields:
        filter_type = None
        if filter_field in query:
            filter_type = "exact"
            filters.append({"field": filter_field, "value": query[filter_field], "type": filter_type})
        if f"{filter_field}__contains" in query:
            if filter_type is not None:
                raise ValidationError(f"Only one {filter_field} filter can be applied")
            filter_type = "contains"
            filters.append({"field": filter_field, "value": query[f"{filter_field}__contains"], "type": filter_type})
        if f"{filter_field}__icontains" in query:
            if filter_type is not None:
                raise ValidationError(f"Only one {filter_field} filter can be applied")
            filter_type = "icontains"
            filters.append({"field": filter_field, "value": query[f"{filter_field}__icontains"], "type": filter_type})

    # Value-based filters that can have exact or greater/less-than matches
    for filter_field in value_filter_fields:
        filter_type = None
        if filter_field in query:
            try:
                value = from_iso_timestamp(query[filter_field])
            except ValueError:
                raise ValidationError("Invalid timestamp")
            filter_type = "exact"
            filters.append({"field": filter_field, "value": value, "type": filter_type})
        if f"{filter_field}__gt" in query:
            if filter_type is not None:
                raise ValidationError(f"Only one {filter_field} filter can be applied")
            try:
                value = from_iso_timestamp(query[f"{filter_field}__gt"])
            except ValueError:
                raise ValidationError("Invalid timestamp")
            filter_type = "gt"
            filters.append({"field": filter_field, "value": value, "type": filter_type})
        if f"{filter_field}__lt" in query:
            if filter_type is not None:
                raise ValidationError(f"Only one {filter_field} filter can be applied")
            try:
                value = from_iso_timestamp(query[f"{filter_field}__lt"])
            except ValueError:
                raise ValidationError("Invalid timestamp")
            filter_type = "lt"
            filters.append({"field": filter_field, "value": value, "type": filter_type})

    for filter_field in mv_filter_fields:
        filter_type = None
        if filter_field in mv_query:
            filter_type = "in"
            filters.append({"field": filter_field, "value": mv_query[filter_field], "type": filter_type})

    for filter_field in nullable_filter_fields:
        if f"{filter_field}__isnull" in query:
            if query[f"{filter_field}__isnull"].lower() not in ["true", "false"]:
                raise ValidationError(f"{filter_field}__isnull must be a boolean")
            filter_type = "isnull"
            filters.append(
                {
                    "field": filter_field,
                    "value": query[f"{filter_field}__isnull"].lower() == "true",
                    "type": filter_type,
                }
            )

    # Check that there are no unsupported fields in the query args
    for field in query.keys():
        if field not in filter_fields + value_filter_fields + mv_filter_fields + [
            f"{f}__contains" for f in filter_fields
        ] + [f"{f}__icontains" for f in filter_fields] + [f"{f}__gt" for f in value_filter_fields] + [
            f"{f}__lt" for f in value_filter_fields
        ] + [
            f"{f}__isnull" for f in nullable_filter_fields
        ] + [
            "offset",
            "limit",
            "end",
        ]:
            raise ValidationError(f"Unsupported filter option: {field}")

    # Process the ordering arg
    ordering_fields = ["service", "repo", "risk"]
    for ob in order_by:
        if ob not in ordering_fields + [f"-{f}" for f in ordering_fields]:
            raise ValidationError(f"Invalid order_by: {ob}")

    return {
        "offset": offset,
        "limit": limit,
        "filters": filters,
        "order_by": order_by,
    }
