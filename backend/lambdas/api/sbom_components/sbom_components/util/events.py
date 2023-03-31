from urllib.parse import unquote

from artemisapi.validators import ValidationError
from artemisdb.artemisdb.paging import parse_paging_event
from sbom_components.util.validators import validate_component_name, validate_component_version, validate_no_paging


class ParsedEvent:
    def __init__(self, event):
        self.params = event.get("pathParameters") or {}
        self.query = event.get("queryStringParameters") or {}

        # Validate the component name and version, if present
        self.component_name = self.params.get("name")
        self.component_version = self.params.get("version")
        self.resource = self.params.get("resource")

        if self.component_name:
            validate_component_name(self.component_name)
            self.component_name = unquote(self.component_name)
        if self.component_version:
            validate_component_version(self.component_version)
            self.component_version = unquote(self.component_version)
        if self.resource:
            self.resource = self.resource.lower()
            if self.resource not in ["repos"]:
                raise ValidationError(f"Invalid resource: {self.resource}")

        if self.component_name and self.component_version and self.resource:
            self.paging = parse_paging_event(
                event,
                exact_filters=["service", "repo"],
                substring_filters=["service", "repo"],
                timestamp_filters=["last_scan"],
                ordering_fields=["service", "repo"],
            )
            return

        # Validate that single component retrieval isn't being mixed with paging and filtering
        if self.component_name and self.component_version:
            validate_no_paging(self.query)
            self.paging = parse_paging_event(event)
            return

        if self.component_name:
            self.paging = parse_paging_event(
                event,
                exact_filters=["version", "service", "repo", "license"],
                substring_filters=["version", "service", "repo", "license"],
                timestamp_filters=["last_scan"],
                nullable_filters=["license"],
                ordering_fields=["version", "service", "repo"],
            )
            return

        self.paging = parse_paging_event(
            event,
            exact_filters=["name", "version", "service", "repo", "license"],
            substring_filters=["name", "version", "service", "repo", "license"],
            timestamp_filters=["last_scan"],
            nullable_filters=["license"],
            ordering_fields=["name", "version", "service", "repo"],
        )
