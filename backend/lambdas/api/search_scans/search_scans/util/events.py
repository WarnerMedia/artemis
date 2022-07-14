from uuid import UUID

from artemisapi.validators import ValidationError
from artemisdb.artemisdb.paging import parse_paging_event


class ParsedEvent:
    def __init__(self, event):
        self.batch_id = None
        self.description = None

        self.query = event.get("queryStringParameters") or {}

        if "batch_id" in self.query:
            try:
                UUID(self.query["batch_id"])
            except ValueError:
                raise ValidationError("batch_id must be a UUID")

        self.paging = parse_paging_event(
            event,
            exact_filters=["batch_id"],
            timestamp_filters=["created"],
            ordering_fields=["created"],
        )
