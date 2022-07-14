import json
from uuid import UUID

from artemisapi.validators import ValidationError
from artemisdb.artemisdb.paging import parse_paging_event


class ParsedEvent:
    def __init__(self, event, parse_body: bool = False):
        self.group_id = None
        self.key_id = None

        params = event.get("pathParameters") or {}
        self.group_id = params.get("id")
        self.key_id = params.get("kid")

        self.query = event.get("queryStringParameters") or {}

        if self.key_id and ("offset" in self.query or "limit" in self.query):
            raise ValidationError("Key ID is not compatible with paging")

        if self.group_id:
            try:
                UUID(self.group_id)
            except ValueError:
                raise ValidationError(f"{self.group_id} is not a valid group id.")

        if self.key_id:
            try:
                UUID(self.key_id)
            except ValueError:
                raise ValidationError(f"{self.key_id} is not a valid key id.")
        else:
            self.paging = parse_paging_event(
                event,
                exact_filters=["name"],
                substring_filters=["name"],
                timestamp_filters=["created", "expires"],
                ordering_fields=["name", "created", "expires"],
            )

        self.body = None
        if parse_body:
            try:
                self.body = json.loads(event["body"])
            except json.JSONDecodeError:
                raise ValidationError("Invalid JSON in body")
