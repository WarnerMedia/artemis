from artemisapi.const import SearchRepositoriesAPIIdentifier
from artemisdb.artemisdb.consts import RiskClassification
from artemisdb.artemisdb.paging import parse_paging_event


class ParsedEvent:
    def __init__(self, event):
        self.query = event.get("queryStringParameters") or {}
        self.paging = parse_paging_event(
            event,
            exact_filters=["service", "repo"],
            substring_filters=["service", "repo"],
            timestamp_filters=["last_qualified_scan", "last_scan"],
            nullable_filters=["last_qualified_scan"],
            ordering_fields=["service", "repo", "risk"],
            mv_filters=["risk"],
            mv_validators={"risk": validate_risk_value},
            api_id=SearchRepositoriesAPIIdentifier.GET.value,
        )


def validate_risk_value(value: str) -> bool:
    try:
        RiskClassification(value)
        return True
    except ValueError:
        return False
