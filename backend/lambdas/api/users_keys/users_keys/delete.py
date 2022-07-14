from http import HTTPStatus

from artemisapi.response import response
from artemisdb.artemisdb.models import APIKey
from artemislib.audit.logger import AuditLogger


def delete(parsed_event, email=None):
    if not parsed_event.get("key_id"):
        # Key ID is required
        return response(code=HTTPStatus.BAD_REQUEST)

    count, _ = APIKey.objects.filter(user__email=email, user__deleted=False, key_id=parsed_event["key_id"]).delete()
    if not count:
        return response(code=HTTPStatus.NOT_FOUND)

    audit_log = AuditLogger(principal=email, source_ip=parsed_event["source_ip"])
    audit_log.key_deleted(parsed_event["key_id"])

    return response(code=HTTPStatus.NO_CONTENT)
