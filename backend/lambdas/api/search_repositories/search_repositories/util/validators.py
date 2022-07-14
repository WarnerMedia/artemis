from artemisapi.validators import ValidationError
from artemisdb.artemisdb.consts import RiskClassification


def validate_risk(values: list):
    for value in values:
        if value.lower() not in [r.value for r in RiskClassification]:
            raise ValidationError(f"Invalid risk value: {value}")
