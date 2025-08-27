import uuid
from http import HTTPStatus

from artemisapi.response import response
from artemisapi.validators import ValidationError
from artemisdb.artemisdb.models import Repo, User
from artemislib.audit.logger import AuditLogger
from artemislib.datetime import format_timestamp
from repo.bitbucket_util.bitbucket_utils import process_bitbucket
from repo.github_util.github_utils import process_github
from repo.gitlab_util.process_gitlab import process_gitlab
from repo.report.report import post_report
from repo.services.ado import process_ado
from repo.util.const import PROCESS_RESPONSE_TUPLE
from repo.util.parse_event import EventParser


def post(event_parser: EventParser):
    parsed_event = event_parser.parsed_event
    resp = response(code=HTTPStatus.BAD_REQUEST)

    if parsed_event.get("resource") is not None and event_parser.identity.principal_type == "group_api_key":
        return response(code=HTTPStatus.FORBIDDEN)

    if parsed_event.get("resource_id"):
        # POSTs create new resources so having a resource ID in the URL is
        # an invalid request
        resp = response(code=HTTPStatus.BAD_REQUEST)
    elif not parsed_event.get("resource"):
        resp = post_repo(event_parser, identity=event_parser.identity)
    elif parsed_event.get("resource") == "whitelist":
        resp = post_whitelist(event_parser, user=event_parser.identity.principal_id)
    elif parsed_event.get("resource") == "report":
        resp = post_report(event_parser, user=event_parser.identity.principal_id)

    return resp


def post_whitelist(event_parser: EventParser, user=None):
    event = event_parser.parsed_event
    try:
        req_list = event_parser.parse_whitelist_body()
    except ValidationError as e:
        return response({"message": e.message}, code=e.code)

    created = []
    for req in req_list:
        # If user doesn't exist, set user to None instead of throwing error (for local env)
        try:
            created_by_user = User.objects.get(email=user)
        except User.DoesNotExist:
            created_by_user = None

        item = Repo.objects.get(repo=event["repo_id"], service=event["service_id"]).allowlistitem_set.create(
            item_id=str(uuid.uuid4()),
            item_type=req["type"],
            value=req["value"],
            expires=req["expires"],
            reason=req["reason"],
            created_by=created_by_user,
        )
        req["id"] = str(item.item_id)  # Add the UUID to the response object
        req["created_by"] = str(item.created_by)  # Add created_by to response object
        req["created"] = format_timestamp(item.created)  # Add created date time to response object
        if req["expires"]:
            req["expires"] = req["expires"].isoformat()  # Convert the expires datetime back into a string
        severity = item.severity
        if severity is not None:
            req["value"]["severity"] = severity
        created.append(req)

        audit_log = AuditLogger(principal=user, source_ip=event["source_ip"])
        audit_log.al_created(
            al_id=str(item.item_id),
            service=event["service_id"],
            repo=event["repo_id"],
            type=item.item_type,
            expires=item.expires or "",  # If expires is None use an empty string instead as a special case
            value=item.value,
            reason=item.reason,
            severity=severity,
        )

    return response(created)


def post_repo(event_parser: EventParser, identity=None):
    event = event_parser.parsed_event
    try:
        req_list = event_parser.get_req_list()
    except ValidationError as e:
        return response({"message": e.message}, code=e.code)

    service_dict = event_parser.services.get(event["service_id"], {})
    service_type = service_dict.get("type")
    if service_type == "github":
        s_response = process_github(
            req_list,
            event["service_id"],
            service_dict.get("url"),
            service_dict.get("secret_loc"),
            service_dict.get("nat_connect"),
            identity=identity,
            diff_url=service_dict.get("diff_url"),
        )
    elif service_type == "gitlab":
        s_response = process_gitlab(
            req_list,
            event["service_id"],
            service_dict.get("url"),
            service_dict.get("secret_loc"),
            service_dict.get("batch_queries"),
            service_dict.get("nat_connect"),
            identity=identity,
            diff_url=service_dict.get("diff_url"),
        )
    elif service_type == "bitbucket":
        s_response = process_bitbucket(
            req_list,
            event["service_id"],
            service_dict.get("url"),
            service_dict.get("secret_loc"),
            service_dict.get("nat_connect"),
            identity=identity,
        )
    elif service_type == "ado":
        s_response = process_ado(
            req_list,
            event["service_id"],
            service_dict.get("url"),
            service_dict.get("secret_loc"),
            service_dict.get("nat_connect"),
            identity=identity,
        )
    else:
        s_response = PROCESS_RESPONSE_TUPLE([], [], [])

    if s_response.queued and not (s_response.failed or s_response.unauthorized):
        code = HTTPStatus.OK
    elif s_response.queued and (s_response.failed or s_response.unauthorized):
        code = HTTPStatus.MULTI_STATUS  # mixed success
    elif s_response.failed and not s_response.unauthorized and not s_response.queued:
        code = HTTPStatus.BAD_REQUEST  # all authorized but failed
    elif s_response.unauthorized and not s_response.failed and not s_response.queued:
        code = HTTPStatus.UNAUTHORIZED  # all unauthorized
    else:
        code = HTTPStatus.NOT_IMPLEMENTED  # service not recognized/implemented

    return response({"queued": s_response.queued, "failed": s_response.failed + s_response.unauthorized}, code=code)
