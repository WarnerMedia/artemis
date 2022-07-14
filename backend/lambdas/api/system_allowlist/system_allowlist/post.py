import uuid
from http import HTTPStatus

from artemisapi.response import response
from artemisapi.validators import ValidationError
from artemisdb.artemisdb.auth import get_principal_group
from artemisdb.artemisdb.models import SystemAllowListItem
from artemislib.audit.logger import AuditLogger
from system_allowlist.util.events import ParsedEvent


def post(event, principal: dict = None, source_ip: str = None, **kwargs):
    try:
        parsed_event = ParsedEvent(event, parse_body=True)
    except ValidationError as e:
        return response({"message": e.message}, code=e.code)

    if parsed_event.item_id:
        return response({"message": "operation not allowed"}, code=HTTPStatus.BAD_REQUEST)

    group = get_principal_group(principal["type"], principal["id"])
    if group is None:
        return response(code=HTTPStatus.FORBIDDEN)

    item = SystemAllowListItem.objects.create(
        item_id=uuid.uuid4(),
        item_type=parsed_event.type,
        value=parsed_event.value,
        reason=parsed_event.reason,
        created_by=group,
        updated_by=group,
    )

    audit_log = AuditLogger(principal=principal["id"], source_ip=source_ip)
    audit_log.sal_created(al_id=str(item.item_id), type=item.item_type, value=item.value, reason=item.reason)

    return response(item.to_dict())
