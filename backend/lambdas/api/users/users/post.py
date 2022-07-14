from http import HTTPStatus

from django.core.exceptions import ValidationError as DjangoValidationError

from artemisapi.response import response
from artemisdb.artemisdb.models import Group, User
from artemislib.audit.logger import AuditLogger
from users.util.events import ParsedEvent
from users.util.validators import ValidationError, validate_post_body


def to_lowercase(strings):
    return [x.lower() for x in strings]


def post(event, email=None, admin: bool = False):
    if not admin:
        # Only admins can create users
        return response(code=HTTPStatus.FORBIDDEN)

    try:
        parsed_event = ParsedEvent(event, parse_body=True)
        validate_post_body(parsed_event.body)
    except ValidationError as e:
        return response({"message": e.message}, e.code)

    if parsed_event.user_id == "self" or User.objects.filter(email=parsed_event.user_id).exists():
        return response({"message": "User exists"}, code=HTTPStatus.CONFLICT)

    try:
        user = User.objects.create(
            email=parsed_event.user_id,
            # Ensure incoming scopes are lowercase before proceeding
            scope=to_lowercase(parsed_event.body.get("scope", [])),
            features=parsed_event.body.get("features", {}),
            admin=parsed_event.body.get("admin", False),
        )
        Group.create_self_group(user)
        audit_log = AuditLogger(principal=email, source_ip=event["requestContext"]["identity"]["sourceIp"])
        audit_log.user_created(user=user.email, scope=user.scope, features=user.features, admin=user.admin)
        audit_log.group_created(
            str(user.self_group.group_id),
            user.self_group.name,
            user.self_group.scope,
            user.self_group.features,
            user.self_group.admin,
            user.self_group.allowlist,
        )

        user_dict = user.to_dict()
        user_dict["scan_orgs"] = user.scan_orgs
        return response(user_dict)
    except DjangoValidationError:
        return response({"message": "Error creating user"}, code=HTTPStatus.BAD_REQUEST)
