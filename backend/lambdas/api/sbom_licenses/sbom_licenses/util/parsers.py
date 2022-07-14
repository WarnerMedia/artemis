from artemisapi.validators import ValidationError
from artemisdb.artemisdb.paging import validate_paging_query
from sbom_licenses.util.validators import validate_license_id

DEFAULT_PAGE_SIZE = 20


def parse_event(event):
    params = event.get("pathParameters") or {}
    query = event.get("queryStringParameters") or {}

    # Validate the license ID, if present
    license_id = params.get("id")
    validate_license_id(license_id)
    if license_id is not None:
        license_id = license_id.lower()

    # Validate that single license retrieval isn't being mixed with paging and filtering
    if license_id and ("offset" in query or "limit" in query or "end" in query):
        raise ValidationError("License ID is not compatible with paging")
    if license_id and (
        "name" in query or "name__contains" in query or "name__icontains" in query or "order_by" in query
    ):
        raise ValidationError("License ID is not compatible with filtering or ordering")

    # Calculate the paging
    offset, limit = validate_paging_query(query)
    end = offset + limit

    filter_fields = ["name"]

    # Process the filter args
    filters = []
    name_filter_type = None
    if "name" in query:
        name_filter_type = "exact"
        filters.append({"field": "name", "value": query["name"], "type": name_filter_type})
    if "name__contains" in query:
        if name_filter_type is not None:
            raise ValidationError("Only one name filter can be applied")
        name_filter_type = "contains"
        filters.append({"field": "name", "value": query["name__contains"], "type": name_filter_type})
    if "name__icontains" in query:
        if name_filter_type is not None:
            raise ValidationError("Only one name filter can be applied")
        name_filter_type = "icontains"
        filters.append({"field": "name", "value": query["name__icontains"], "type": name_filter_type})

    # Check that there are no unsupported fields in the query args
    for field in query.keys():
        if field not in filter_fields + [f"{f}__contains" for f in filter_fields] + [
            f"{f}__icontains" for f in filter_fields
        ] + [
            "offset",
            "limit",
            "end",
        ]:
            raise ValidationError(f"Unsupported filter option: {field}")

    # Process the ordering arg
    ordering_fields = ["name"]
    order_by = query.get("order_by", "name").split(",")
    for ob in order_by:
        if ob not in ordering_fields + [f"-{f}" for f in ordering_fields]:
            raise ValidationError(f"Invalid order_by: {ob}")
    if len(order_by) > 1:
        # Only one ordering operation for licenses is supported at this time
        raise ValidationError(f'Invalid order_by: {query.get("order_by")}')

    return {
        "license_id": license_id,
        "offset": offset,
        "limit": limit,
        "end": end,
        "filters": filters,
        "order_by": order_by,
    }
