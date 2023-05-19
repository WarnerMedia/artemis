from typing import Tuple

from artemisapi.validators import ValidationError
from artemisdb.artemisdb.paging import parse_paging_event


class ParsedEvent:
    def __init__(self, event):
        self.item_id = None

        params = event.get("pathParameters") or {}
        self.item_id, self.stats_request = self._parse_id(params.get("id"))

        self.query = event.get("queryStringParameters") or {}

        if self.item_id and ("offset" in self.query or "limit" in self.query):
            raise ValidationError("Item ID is not compatible with paging")
        if self.stats_request and not self.item_id:
            raise ValidationError("Stats request requires a system service to be specified")
        else:
            self.paging = parse_paging_event(event)

    def _parse_id(self, raw_id) -> Tuple[str, bool]:
        """
        Parsing raw system service ID to determine if this is a query for stats
        """
        system_service_id = None
        stats_query = False

        if not raw_id:
            return system_service_id, stats_query

        raw_id = raw_id.lower()
        split = raw_id.rsplit("/", 1)

        # check if requested ended in "/stats" and ensure "/stats" was not part of service ID
        if split[-1] == "stats" and ("/" in split[0] or "." in split[0]):
            stats_query = True
            del split[-1]

        system_service_id = "/".join(split)

        return system_service_id, stats_query
