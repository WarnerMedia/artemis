from artemisapi.validators import ValidationError
from artemisdb.artemisdb.paging import parse_paging_event


class ParsedEvent:
    def __init__(self, event):
        self.item_id = None

        params = event.get("pathParameters") or {}
        self.item_id = params.get("id")

        self.query = event.get("queryStringParameters") or {}

        if self.item_id and ("offset" in self.query or "limit" in self.query):
            raise ValidationError("Item ID is not compatible with paging")
        else:
            self.paging = parse_paging_event(event)
