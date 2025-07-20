from http import HTTPStatus

from artemisapi.response import response
from artemisdb.artemisdb.models import APIKey, User
from artemislib.audit.logger import AuditLogger


def delete(parsed_event, email=None):
    if not parsed_event.get("key_id"):
        # Key ID is required
        return response(code=HTTPStatus.BAD_REQUEST)
    
    # Determine which user to query
    query_email = email  # Default to the authenticated user
    path_user_id = parsed_event.get("user_id")
    
    # If path_user_id is specified and not "self", use that instead
    if path_user_id and path_user_id != "self":
        query_email = path_user_id
    
    try:
        # Get the user first to verify they exist
        user = User.objects.get(email=query_email, deleted=False)
        # Delete the key for the specified user
        count, _ = APIKey.objects.filter(user=user, key_id=parsed_event["key_id"]).delete()
        if not count:
            return response(code=HTTPStatus.NOT_FOUND)

        audit_log = AuditLogger(principal=email, source_ip=parsed_event["source_ip"])
        audit_log.key_deleted(parsed_event["key_id"])

        return response(code=HTTPStatus.NO_CONTENT)
    except User.DoesNotExist:
        return response(code=HTTPStatus.NOT_FOUND)
