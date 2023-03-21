import re

from artemisapi.validators import ValidationError


def validate_component_name(component_name):
    if component_name and not re.match("^[^\\s]+$", component_name):
        raise ValidationError("Component name is invalid")


def validate_component_version(component_version):
    if component_version and not re.match("^[^\\s]+$", component_version):
        raise ValidationError("Component version is invalid")


def validate_no_paging(query: dict):
    if "offset" in query or "limit" in query or "end" in query:
        raise ValidationError("Request is not compatible with paging")
