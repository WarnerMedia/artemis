import json
from uuid import UUID

from artemisapi.validators import ValidationError
from artemisdb.artemisdb.paging import parse_paging_event


class ParsedEvent:
    def __init__(self, event, parse_body: bool = False, is_delete: bool = False):
        self.group_id = None
        self.user_id = None
        self.paging = {}

        params = event.get("pathParameters") or {}
        self.group_id = params.get("id")
        self.user_id = params.get("uid").lower() if params.get("uid") else None

        # DELETE request: If the user_id exists, there's no need to parse the body. Otherwise, the body will be parsed.
        parse_delete_body = not (self.user_id and is_delete)

        self.query = event.get("queryStringParameters") or {}

        if self.user_id is None:
            self.paging = parse_paging_event(
                event,
                exact_filters=["email"],
                substring_filters=["email"],
                timestamp_filters=["added"],
                boolean_filters=["group_admin"],
                ordering_fields=["email", "added", "group_admin"],
                ordering_aliases={"email": "user__email"},
            )

        if self.group_id:
            try:
                UUID(self.group_id)
            except ValueError:
                raise ValidationError(f"{self.group_id} is not a valid group id.")

        self.body = None
        if parse_body and parse_delete_body:
            try:
                self.body = json.loads(event["body"])
            except json.JSONDecodeError:
                raise ValidationError("Invalid JSON in body")
