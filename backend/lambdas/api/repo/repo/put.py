from http import HTTPStatus

from artemisapi.response import response
from artemisapi.validators import ValidationError
from artemisdb.artemisdb.models import AllowListItem, Repo, User
from artemislib.audit.logger import AuditLogger
from repo.util.parse_event import EventParser


def put(event_parser: EventParser):
    if event_parser.identity.principal_type == "group_api_key":
        return response(code=HTTPStatus.FORBIDDEN)

    parsed_event = event_parser.parsed_event

    resp = response(code=HTTPStatus.BAD_REQUEST)
    if not (parsed_event.get("resource") and parsed_event.get("resource_id")):
        resp = response(code=HTTPStatus.NOT_FOUND)
    elif parsed_event.get("resource") == "whitelist":
        resp = put_whitelist(event_parser, user=event_parser.identity.principal_id, authz=event_parser.identity.scope)

    return resp


def put_whitelist(event_parser: EventParser, user=None, authz=None):
    event = event_parser.parsed_event
    try:
        req_list = event_parser.parse_whitelist_body()
    except ValidationError as e:
        return response({"message": e.message}, code=e.code)

    if len(req_list) != 1:
        # PUTs update a single resource so any more than that in the request
        # body is an invalid request
        return response(code=HTTPStatus.BAD_REQUEST)

    try:
        item = Repo.objects.get(repo=event["repo_id"], service=event["service_id"]).allowlistitem_set.get(
            item_id=event.get("resource_id")
        )
    except (Repo.DoesNotExist, AllowListItem.DoesNotExist):
        return response(code=HTTPStatus.NOT_FOUND)

    # If user doesn't exist, set user to None instead of throwing error (for local env)
    try:
        updated_by_user = User.objects.get(email=user)
    except User.DoesNotExist:
        updated_by_user = None

    # For tracking what goes in the audit log
    new_type = None
    new_expires = None
    new_reason = None
    new_value = None

    # Only update what changed
    if item.item_type != req_list[0]["type"]:
        item.item_type = req_list[0]["type"]
        new_type = item.item_type
    if item.value != req_list[0]["value"]:
        item.value = req_list[0]["value"]
        new_value = item.value
    if item.expires != req_list[0]["expires"]:
        item.expires = req_list[0]["expires"]
        new_expires = item.expires or ""  # If expires is None use an empty string instead as a special case
    if item.reason != req_list[0]["reason"]:
        item.reason = req_list[0]["reason"]
        new_reason = item.reason

    if new_type is not None or new_expires is not None or new_reason is not None or new_value is not None:
        # Only save and record an audit event if something changed
        item.updated_by = updated_by_user
        item.save()

        audit_log = AuditLogger(principal=user, source_ip=event["source_ip"])
        audit_log.al_modified(
            al_id=str(item.item_id),
            service=event["service_id"],
            repo=event["repo_id"],
            type=new_type,
            expires=new_expires,
            value=item.value,
            reason=new_reason,
            severity=item.severity,
        )

    return response(code=HTTPStatus.NO_CONTENT)
