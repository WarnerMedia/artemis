from typing import Tuple

from artemisapi.validators import ValidationError
from artemisdb.artemisdb.paging import parse_paging_event
from system_services.util.const import Resources


class ParsedEvent:
    def __init__(self, event):
        params = event.get("pathParameters") or {}
        self.ids = self._parse_id(params.get("id"))

        self.query = event.get("queryStringParameters") or {}

        if self.ids.get("system_service_id") and ("offset" in self.query or "limit" in self.query):
            raise ValidationError("Item ID is not compatible with paging")
        if self.ids.get("resource") == "stats" and not self.ids.get("system_service_id"):
            raise ValidationError("Stats request requires a system service to be specified")
        else:
            self.paging = parse_paging_event(event)

    def _parse_id(self, raw_id) -> Tuple[str, bool]:
        """
        Parsing raw system service ID to determine if there is a resource requested
        """
        ret = {"system_service_id": None, "resource": None}

        if not raw_id:
            return ret

        raw_id = raw_id.lower()
        split = raw_id.rsplit("/", 1)

        try:
            # check if request ends in a valid resource (raises ValueError if not)
            Resources(split[-1])

            # if so, ensure resource name was not actually part of a service ID before capturing
            if "/" in split[0] or "." in split[0]:
                ret["resource"] = split[-1]
                del split[-1]

        except ValueError:
            pass

        ret["system_service_id"] = "/".join(split)

        return ret
