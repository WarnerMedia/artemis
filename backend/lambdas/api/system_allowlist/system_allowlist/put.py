from http import HTTPStatus

from artemisapi.response import response
from artemisapi.validators import ValidationError
from artemisdb.artemisdb.auth import get_principal_group
from artemisdb.artemisdb.models import SystemAllowListItem
from artemislib.audit.logger import AuditLogger
from system_allowlist.util.events import ParsedEvent


def put(event, principal: dict = None, source_ip: str = None, **kwargs):
    try:
        parsed_event = ParsedEvent(event, parse_body=True)
    except ValidationError as e:
        return response({"message": e.message}, code=e.code)

    if not parsed_event.item_id:
        return response({"message": "operation not allowed"}, code=HTTPStatus.BAD_REQUEST)

    group = get_principal_group(principal["type"], principal["id"])
    if group is None:
        return response(code=HTTPStatus.FORBIDDEN)

    try:
        item = SystemAllowListItem.objects.get(item_id=parsed_event.item_id)
    except SystemAllowListItem.DoesNotExist:
        return response(code=HTTPStatus.NOT_FOUND)

    # For tracking what goes in the audit log
    new_type = None
    new_reason = None
    new_value = None

    # Only update what changed
    if item.item_type != parsed_event.type:
        item.item_type = parsed_event.type
        new_type = item.item_type
    if item.value != parsed_event.value:
        item.value = parsed_event.value
        new_value = item.value
    if item.reason != parsed_event.reason:
        item.reason = parsed_event.reason
        new_reason = item.reason

    if new_type is not None or new_reason is not None or new_value is not None:
        # Only save and record an audit event if something changed
        item.updated_by = group
        item.save()

        audit_log = AuditLogger(principal=principal["id"], source_ip=source_ip)
        audit_log.sal_modified(al_id=str(item.item_id), type=new_type, value=item.value, reason=new_reason)

    return response(code=HTTPStatus.NO_CONTENT)
