import json
from uuid import UUID

from artemisapi.validators import ValidationError
from artemisdb.artemisdb.paging import parse_paging_event
from system_allowlist.util.validators import validate_post_body


class ParsedEvent:
    def __init__(self, event, parse_body: bool = False):
        self.item_id = None
        self.type = None
        self.reason = None
        self.value = None

        params = event.get("pathParameters") or {}
        self.item_id = params.get("id")

        self.query = event.get("queryStringParameters") or {}

        if self.item_id and ("offset" in self.query or "limit" in self.query):
            raise ValidationError("Item ID is not compatible with paging")

        if self.item_id:
            try:
                UUID(self.item_id)
            except ValueError:
                raise ValidationError(f"{self.item_id} is not a valid item id.")
        else:
            self.paging = parse_paging_event(
                event,
                exact_filters=["description"],
                substring_filters=["description"],
                timestamp_filters=["created"],
                ordering_fields=["description", "created"],
            )

        if parse_body:
            try:
                body = validate_post_body(json.loads(event["body"]))
            except json.JSONDecodeError:
                raise ValidationError("Invalid JSON in body")

            self.type = body["type"]
            self.reason = body["reason"]
            self.value = body["value"]
