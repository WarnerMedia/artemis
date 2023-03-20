import re

from artemisapi.validators import ValidationError
from artemisdb.artemisdb.paging import parse_paging_event


class ParsedEvent:
    def __init__(self, event):
        self.params = event.get("pathParameters") or {}
        self.query = event.get("queryStringParameters") or {}

        self.license_id = self.params.get("id")
        if self.license_id and not re.match("^[A-Za-z0-9]+$", self.license_id):
            raise ValidationError("License ID is invalid")

        self.paging = parse_paging_event(
            event,
            exact_filters=["name"],
            substring_filters=["name"],
            ordering_fields=["name"],
        )
