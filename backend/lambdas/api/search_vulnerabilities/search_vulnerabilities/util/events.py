from urllib.parse import unquote

from artemisapi.validators import ValidationError
from artemisdb.artemisdb.consts import PluginType, RiskClassification, Severity
from artemisdb.artemisdb.models import Plugin
from artemisdb.artemisdb.paging import parse_paging_event
from search_vulnerabilities.util.const import RESOURCE_REPOS_LONG, RESOURCE_REPOS_SHORT


class ParsedEvent:
    def __init__(self, event):
        self.vuln_id = None
        self.resource = None

        params = event.get("pathParameters") or {}
        self.vuln_id = params.get("id")
        if self.vuln_id is not None:
            self.vuln_id = unquote(self.vuln_id)
        self.resource = params.get("resource")

        self.query = event.get("queryStringParameters") or {}

        if self.vuln_id and not self.resource and ("offset" in self.query or "limit" in self.query):
            raise ValidationError("Vuln ID is not compatible with paging")

        if self.resource is None:
            self.paging = parse_paging_event(
                event,
                exact_filters=[
                    "vuln_id",
                    "description",
                    "remediation",
                    "component_name",
                    "component_version",
                ],
                substring_filters=[
                    "vuln_id",
                    "description",
                    "remediation",
                    "component_name",
                    "component_version",
                ],
                mv_filters=["plugin", "severity"],
                mv_validators={"severity": validate_severity_value, "plugin": validate_plugin_value},
            )
        elif self.resource.lower() in (RESOURCE_REPOS_LONG, RESOURCE_REPOS_SHORT):
            self.paging = parse_paging_event(
                event,
                exact_filters=["service", "repo"],
                substring_filters=["service", "repo"],
                timestamp_filters=["last_qualified_scan"],
                nullable_filters=["last_qualified_scan"],
                ordering_fields=["service", "repo", "risk"],
                mv_filters=["risk"],
                mv_validators={"risk": validate_risk_value},
            )
        else:
            raise ValidationError(f"Invalid resource: {self.resource}")


def validate_risk_value(value: str) -> bool:
    try:
        RiskClassification(value)
        return True
    except ValueError:
        return False


def validate_severity_value(value: str) -> bool:
    try:
        Severity(value)
        return True
    except ValueError:
        return False


def validate_plugin_value(value: str) -> bool:
    try:
        Plugin.objects.get(name=value, type=PluginType.VULN.value)
        return True
    except Plugin.DoesNotExist:
        return False
