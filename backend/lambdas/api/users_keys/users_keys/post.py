from http import HTTPStatus

from artemisapi.response import response
from artemisdb.artemisdb.auth import generate_api_key
from artemisdb.artemisdb.models import User
from artemislib.audit.logger import AuditLogger


def post(parsed_event, post_body, email=None, features: dict = None):
    if parsed_event.get("key_id"):
        # Key ID can't be set for a POST
        return response(code=HTTPStatus.BAD_REQUEST)

    try:
        user = User.objects.get(email=email, deleted=False)
    except User.DoesNotExist:
        return response(code=HTTPStatus.BAD_REQUEST)

    audit_log = AuditLogger(principal=email, source_ip=parsed_event["source_ip"])

    api_key = generate_api_key(
        user=user,
        group=user.self_group,
        name=post_body["name"],
        expires=post_body["expires"],
        scope=post_body["scope"],
        admin=post_body.get("admin", False),  # Default to non-admin keys unless explicitly set, even if user is admin
        features=post_body.get("features", features or {}),  # Default to user's feature flags or empty if not set
        audit_log=audit_log,
    )

    return response({"key": api_key})
