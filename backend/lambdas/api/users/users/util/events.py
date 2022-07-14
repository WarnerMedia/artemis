import json

from artemisdb.artemisdb.paging import validate_paging_query
from artemislib.datetime import from_iso_timestamp
from users.util.validators import ValidationError


class ParsedEvent:
    def __init__(self, event, parse_body: bool = False):
        self.event = event

        self.httpMethod = event.get("httpMethod")
        authorizer = event.get("requestContext", {}).get("authorizer", {})
        self.email = authorizer.get("email")
        self.scope = json.loads(authorizer.get("scope", "{}"))

        # admin authorization
        self.admin = authorizer.get("admin", "false") == "true"
        self.features = json.loads(authorizer.get("features", "{}"))

        params = self.event.get("pathParameters") or {}
        # user_id (email) is normalized to lowercase
        self.user_id = params.get("id").lower() if params.get("id") else None

        query = self.event.get("queryStringParameters") or {}

        if self.user_id and ("offset" in query or "limit" in query):
            raise ValidationError("User ID is not compatible with paging")

        # Calculate the paging
        self.offset, self.limit = validate_paging_query(query)

        # Process the filter args
        filters = []

        # String-based filters that can have exact or case (in)sensitive matches
        string_filter_fields = ["email", "scope", "features"]  # Always an option
        string_variants = ["__contains", "__icontains"]

        boolean_filter_fields = ["admin"]

        value_variants = ["__eq", "__lt", "__gt"]
        numeric_filter_fields = []
        aggregate_numeric_fields = list(self.variation_generator(numeric_filter_fields, value_variants))

        time_filter_fields = ["last_login"]
        aggregate_time_fields = list(self.variation_generator(time_filter_fields, value_variants))

        aggregate_fields = (
            list(self.variation_generator(string_filter_fields, string_variants))
            + aggregate_time_fields
            + aggregate_numeric_fields
            + boolean_filter_fields
        )
        aggregate_variants = string_variants + value_variants

        filtered_fields = []

        for filter_field in aggregate_fields:
            filter_type = None
            if filter_field in query:
                filter_type = "exact"
                filter_operation = "inclusion"
                filter_value = query[filter_field]
                filter_field_resolved = filter_field
                for variant in aggregate_variants:
                    if filter_field.endswith(variant):
                        filter_type = variant[2:]
                        filter_field_resolved = filter_field.replace(variant, "")
                # intepret negation/exclusion values correctly
                if (
                    filter_value
                    and isinstance(filter_value, str)
                    and filter_value.startswith("-")
                    and (filter_value not in aggregate_numeric_fields)
                ):
                    filter_operation = "exclusion"
                    filter_value = filter_value[1:]
                # validate time value fields for format errors
                if filter_field in boolean_filter_fields:
                    if str(filter_value).lower() in ["y", "yes", "t", "true", "1", "n", "no", "f", "false", "0"]:
                        filter_value = str(filter_value).lower() in ["y", "yes", "t", "true", "1"]
                    else:
                        raise ValidationError("Invalid boolean value")

                # validate time value fields for format errors
                if filter_field in aggregate_time_fields:
                    try:
                        filter_value = from_iso_timestamp(filter_value)
                    except ValueError:
                        raise ValidationError("Invalid timestamp")

                # use filter field only once
                if filter_field_resolved in filtered_fields:
                    raise ValidationError(f"Only one {filter_field_resolved} filter can be applied")
                else:
                    filters.append(
                        {
                            "field": filter_field_resolved,
                            "value": filter_value,
                            "type": filter_type,
                            "operation": filter_operation,
                        }
                    )
                    filtered_fields.append(filter_field_resolved)

        # Check that there are no unsupported fields in the query args
        for field in query.keys():
            if field not in aggregate_fields + [
                "offset",
                "limit",
                "end",
                "order_by",
            ]:
                raise ValidationError(f"Unsupported filter option: {field}")

        if not self.admin:
            if len(filters) > 0:
                if not (
                    filters[0]["field"] == "email"
                    and (filters[0]["value"] == self.email or filters[0]["value"] == self.user_id)
                ):
                    raise ValidationError("Unauthorized filter usage. Admin privilege is required")
            else:
                # by default non-admin users can only get information about themself. reset filter
                filters = [
                    {
                        "field": "email",
                        "value": self.email,
                        "type": "exact",
                        "operation": "inclusion",
                    }
                ]

        self.filters = filters

        # Process the ordering arg
        ordering_fields = ["email", "scope", "admin", "last_login"]
        # set email asc as default ordering
        order_by = query.get("order_by", "email").split()
        for ob in order_by:
            if ob not in ordering_fields + [f"-{f}" for f in ordering_fields]:
                raise ValidationError(f"Invalid order_by: {ob}")
        self.order_by = order_by

        self.body = None
        if parse_body:
            try:
                self.body = json.loads(event["body"])
            except json.JSONDecodeError:
                raise ValidationError("Invalid JSON in body")

    def variation_generator(self, base_list: list, postfix_list: list):
        for item in base_list:
            yield item
            for postfix in postfix_list:
                yield "{}{}".format(item, postfix)
