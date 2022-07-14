import re

from artemisapi.validators import ValidationError
from artemislib.logging import Logger

log = Logger(__name__)


def validate_license_id(license_id):
    if license_id and not re.match("^[A-Za-z0-9]+$", license_id):
        raise ValidationError("License ID is invalid")
