from datetime import datetime
from http import HTTPStatus

from django.db import transaction

from artemisapi.response import response
from artemisdb.artemisdb.models import User
from artemislib.audit.logger import AuditLogger
from users.util.events import ParsedEvent
from users.util.validators import ValidationError


def delete(event, email=None, admin: bool = False):
    if not admin:
        # Only admins can delete users
        return response(code=HTTPStatus.FORBIDDEN)

    try:
        parsed_event = ParsedEvent(event)
    except ValidationError as e:
        return response({"message": e.message}, e.code)

    if not parsed_event.user_id:
        # User ID is required
        return response(code=HTTPStatus.BAD_REQUEST)

    if parsed_event.user_id == "self" or parsed_event.user_id == email:
        return response({"message": "User cannot delete themselves"}, code=HTTPStatus.CONFLICT)

    user = None

    # Do all of the user deletion stuff in a transaction
    with transaction.atomic():
        try:
            user = User.objects.get(email=parsed_event.user_id)
        except User.DoesNotExist:
            return response(code=HTTPStatus.NOT_FOUND)

        # Soft-delete the user and update the email to a unique string to prevent potential future conflicts if
        # the user is ever re-added
        suffix = f"_DELETED_{int(datetime.utcnow().timestamp())}"
        user.deleted = True
        user.email = f"{parsed_event.user_id}{suffix}"
        user.save()

        # Soft-delete the user's self group
        user.self_group.deleted = True
        user.self_group.name = f"{user.self_group.name}{suffix}"
        user.self_group.save()

        # Hard delete all of the user's API keys
        user.apikey_set.all().delete()

        # Hard delete all of the user's self group API keys
        user.self_group.apikey_set.all().delete()

        # Hard delete user's services
        user.userservice_set.all().delete()

    # This is outside the transaction so that if the transaction rolled back we don't log the audit event
    if user.deleted:
        audit_log = AuditLogger(principal=email, source_ip=event["requestContext"]["identity"]["sourceIp"])
        audit_log.user_deleted(parsed_event.user_id)

    return response(code=HTTPStatus.NO_CONTENT)
