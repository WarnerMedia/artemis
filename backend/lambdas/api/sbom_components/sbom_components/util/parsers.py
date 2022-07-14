from urllib.parse import unquote

from artemisapi.validators import ValidationError
from artemisdb.artemisdb.paging import validate_paging_query
from artemislib.datetime import from_iso_timestamp
from sbom_components.util.validators import validate_component_name, validate_component_version

DEFAULT_PAGE_SIZE = 20


def parse_event(event):
    params = event.get("pathParameters") or {}
    query = event.get("queryStringParameters") or {}

    # Validate the component name and version, if present
    component_name = params.get("name")
    component_version = params.get("version")
    resource = params.get("resource")

    if component_name:
        validate_component_name(component_name)
        component_name = unquote(component_name)
    if component_version:
        validate_component_version(component_version)
        component_version = unquote(component_version)
    if resource:
        resource = resource.lower()
        if resource not in ["repos"]:
            raise ValidationError(f"Invalid resource: {resource}")

    # Validate that single component retrieval isn't being mixed with paging and filtering
    if (
        component_name
        and component_version
        and not resource
        and ("offset" in query or "limit" in query or "end" in query)
    ):
        raise ValidationError("Component name and version is not compatible with paging")
    if (
        component_name
        and component_version
        and not resource
        and ("name" in query or "name__contains" in query or "name__icontains" in query or "order_by" in query)
    ):
        raise ValidationError("Component name and version is not compatible with filtering or ordering")

    # Calculate the paging
    offset, limit = validate_paging_query(query)

    # Extract order_by from the args before checking the filters
    order_by = [s for s in query.get("order_by", "").split(",") if s != ""]
    if "order_by" in query:
        del query["order_by"]

    # Process the filter args
    filters = []

    # String-based filters that can have exact or case (in)sensitive matches
    filter_fields = ["service", "repo", "license"]  # Always an option
    if component_version is None:
        filter_fields.append("version")  # If version is not in the path it becomes filterable
    if component_name is None:
        filter_fields.append("name")  # If name is not in the path it becomes filterable

    value_filter_fields = ["last_scan"]

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

    # Check that there are no unsupported fields in the query args
    for field in query.keys():
        if field not in filter_fields + value_filter_fields + [f"{f}__contains" for f in filter_fields] + [
            f"{f}__icontains" for f in filter_fields
        ] + [f"{f}__gt" for f in value_filter_fields] + [f"{f}__lt" for f in value_filter_fields] + [
            "offset",
            "limit",
            "end",
        ]:
            raise ValidationError(f"Unsupported filter option: {field}")

    # Process the ordering arg
    ordering_fields = ["name", "version", "service", "repo"]
    for ob in order_by:
        if ob not in ordering_fields + [f"-{f}" for f in ordering_fields]:
            raise ValidationError(f"Invalid order_by: {ob}")

    return {
        "component_name": component_name,
        "component_version": component_version,
        "resource": resource,
        "offset": offset,
        "limit": limit,
        "filters": filters,
        "order_by": order_by,
    }
