import json
from uuid import UUID

from artemisapi.validators import ValidationError
from artemisdb.artemisdb.paging import parse_paging_event

PAGING_WITH_GROUP_ID_INVALID = "Group ID is not compatible with paging"


class ParsedEvent:
    def __init__(self, event, parse_body: bool = True):
        params = event.get("pathParameters") or {}
        self.group_id = params.get("id")

        self.query = event.get("queryStringParameters") or {}

        if self.group_id and ("offset" in self.query or "limit" in self.query):
            raise ValidationError(PAGING_WITH_GROUP_ID_INVALID)

        if self.group_id:
            try:
                UUID(self.group_id)
            except ValueError:
                raise ValidationError(f"{self.group_id} is not a valid group id.")
        else:
            self.paging = parse_paging_event(
                event,
                exact_filters=["name", "parent", "description"],
                substring_filters=["name", "parent", "description"],
                ordering_fields=["name", "parent__name", "created", "allowlist", "admin"],
                ordering_aliases={"parent": "parent__name"},
            )

        self.body = None
        if parse_body:
            try:
                self.body = json.loads(event["body"])
            except json.JSONDecodeError:
                raise ValidationError("Invalid JSON in body")
