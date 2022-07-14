from http import HTTPStatus

from artemisapi.response import response
from artemisdb.artemisdb.models import User
from artemislib.audit.logger import AuditLogger
from users.util.events import ParsedEvent
from users.util.validators import ValidationError, validate_post_body


def to_lowercase(strings):
    return [x.lower() for x in strings]


def put(event, email=None, authz=None, admin: bool = False):
    if not admin:
        # Only admins can make changes to users
        return response(code=HTTPStatus.FORBIDDEN)

    try:
        parsed_event = ParsedEvent(event, parse_body=True)
        validate_post_body(parsed_event.body)
    except ValidationError as e:
        return response({"message": e.message}, code=e.code)

    if parsed_event.user_id == "self":
        parsed_event.user_id = email

    try:
        user = User.objects.get(email=parsed_event.user_id, deleted=False)

        # Tracking for audit logging
        new_scope = None
        new_features = None
        new_admin = None

        orig_admin = user.admin
        if "scope" in parsed_event.body:
            # Ensure incoming scopes are lowercased before proceeding
            scope = to_lowercase(parsed_event.body["scope"])
            if scope != user.scope:
                user.scope = scope
                user.self_group.scope = user.scope
                new_scope = user.scope
        if "admin" in parsed_event.body and user.admin != parsed_event.body["admin"]:
            user.admin = parsed_event.body["admin"]
            user.self_group.admin = user.admin
            if orig_admin and not user.admin:
                # If the user's admin access is disabled also disable admin for all their API keys
                user.apikey_set.update(admin=user.admin)
                user.self_group.apikey_set.update(admin=user.admin)
            new_admin = user.admin
        if "features" in parsed_event.body and user.features != parsed_event.body["features"]:
            user.features = parsed_event.body["features"]
            user.self_group.features = user.features
            new_features = user.features

        if new_scope is not None or new_features is not None or new_admin is not None:
            # Only save and record an audit event if something changed
            user.save()
            user.self_group.save()

            audit_log = AuditLogger(principal=email, source_ip=event["requestContext"]["identity"]["sourceIp"])
            audit_log.user_modified(user.email, new_scope, new_features, new_admin)

        user_dict = user.to_dict()
        user_dict["scan_orgs"] = user.scan_orgs
        return response(user_dict)
    except User.DoesNotExist:
        return response(code=HTTPStatus.NOT_FOUND)
