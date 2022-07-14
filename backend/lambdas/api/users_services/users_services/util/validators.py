import re

from artemisapi.validators import ValidationError
from artemislib.logging import Logger
from users_services.util.const import VALID_SERVICE_IDS

log = Logger(__name__)


def validate_service(service_id: str):
    if service_id not in VALID_SERVICE_IDS:
        raise ValidationError(f"Service ID invalid. Valid options: {VALID_SERVICE_IDS}")


def validate_github_username(username: str):
    pattern = re.compile("^[A-Za-z0-9-]{1,39}$")
    if not bool(pattern.search(username)):
        raise ValidationError("Invalid GitHub username format.")


def validate_github_auth_code(auth_code: str):
    pattern = re.compile("^[a-f0-9]{20}$")
    if not bool(pattern.search(auth_code)):
        raise ValidationError("Invalid GitHub auth code format.")


def validate_github_token(token: str):
    pattern = re.compile("^gho_[A-Za-z0-9]{8,255}$")
    if not bool(pattern.search(token)):
        raise ValidationError("Invalid GitHub token format.")
