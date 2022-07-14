from http import HTTPStatus

from artemisapi.response import response
from artemisdb.artemisdb.models import AllowListItem, Repo
from artemislib.audit.logger import AuditLogger
from repo.util.parse_event import EventParser


def delete(event_parser: EventParser):
    parsed_event = event_parser.parsed_event
    if event_parser.identity.principal_type == "group_api_key":
        return response(code=HTTPStatus.FORBIDDEN)

    resp = response(code=HTTPStatus.BAD_REQUEST)
    if not parsed_event.get("resource"):
        resp = response(code=HTTPStatus.BAD_REQUEST)
    elif parsed_event.get("resource") == "whitelist":
        resp = delete_whitelist(parsed_event, email=event_parser.identity.principal_id)

    return resp


def delete_whitelist(event, email=None):
    if not event.get("resource_id"):
        return response({"message": "operation not allowed"}, code=HTTPStatus.BAD_REQUEST)

    try:
        item = Repo.objects.get(repo=event["repo_id"], service=event["service_id"]).allowlistitem_set.get(
            item_id=event.get("resource_id")
        )
        item.delete()
        audit_log = AuditLogger(principal=email, source_ip=event["source_ip"])
        audit_log.al_deleted(
            al_id=str(item.item_id),
            service=event["service_id"],
            repo=event["repo_id"],
            type=item.item_type,
            expires=item.expires or "",  # If expires is None use an empty string instead as a special case
            value=item.value,
            reason=item.reason,
            severity=item.severity,
        )
    except (Repo.DoesNotExist, AllowListItem.DoesNotExist):
        return response(code=HTTPStatus.NOT_FOUND)

    return response(code=HTTPStatus.NO_CONTENT)
