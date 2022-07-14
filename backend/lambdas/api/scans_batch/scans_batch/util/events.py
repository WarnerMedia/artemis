import json
from uuid import UUID

from artemisapi.validators import ValidationError
from artemisdb.artemisdb.paging import parse_paging_event
from scans_batch.util.validators import validate_post_body


class ParsedEvent:
    def __init__(self, event, parse_body: bool = False):
        self.batch_id = None
        self.description = None

        params = event.get("pathParameters") or {}
        self.batch_id = params.get("id")

        self.query = event.get("queryStringParameters") or {}

        if self.batch_id and ("offset" in self.query or "limit" in self.query):
            raise ValidationError("Batch ID is not compatible with paging")

        if self.batch_id:
            try:
                UUID(self.batch_id)
            except ValueError:
                raise ValidationError(f"{self.batch_id} is not a valid batch id.")
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
                self.description = validate_post_body(json.loads(event["body"]))["description"]
            except json.JSONDecodeError:
                raise ValidationError("Invalid JSON in body")
