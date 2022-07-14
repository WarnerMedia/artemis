from http import HTTPStatus

from artemisapi.response import response
from artemisapi.validators import ValidationError
from artemisdb.artemisdb.models import SystemAllowListItem
from artemislib.audit.logger import AuditLogger
from system_allowlist.util.events import ParsedEvent


def delete(event, principal: dict = None, source_ip: str = None, **kwargs):
    try:
        parsed_event = ParsedEvent(event, parse_body=False)
    except ValidationError as e:
        return response({"message": e.message}, e.code)

    if not parsed_event.item_id:
        return response({"message": "operation not allowed"}, code=HTTPStatus.BAD_REQUEST)

    try:
        item = SystemAllowListItem.objects.get(item_id=parsed_event.item_id)
        item.delete()
        audit_log = AuditLogger(principal=principal["id"], source_ip=source_ip)
        audit_log.sal_deleted(al_id=str(item.item_id), type=item.item_type, value=item.value, reason=item.reason)
    except SystemAllowListItem.DoesNotExist:
        return response(code=HTTPStatus.NOT_FOUND)

    return response(code=HTTPStatus.NO_CONTENT)
