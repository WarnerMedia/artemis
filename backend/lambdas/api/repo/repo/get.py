from http import HTTPStatus

from django.core.exceptions import ValidationError as DjangoValidationError

from artemisapi.response import response
from artemisdb.artemisdb.models import AllowListItem, Repo, Scan
from artemisdb.artemisdb.paging import page
from repo.report.report import get_repo_report
from repo.util.aws import AWSConnect, LambdaError
from repo.util.const import DEFAULT_PAGE_SIZE, FORMAT_SBOM, WL_TYPES
from repo.util.env import JSON_REPORT_LAMBDA, SBOM_REPORT_LAMBDA
from repo.util.parse_event import EventParser


def get(event_parser: EventParser):
    parsed_event = event_parser.parsed_event

    r = response(code=HTTPStatus.NOT_FOUND)

    if parsed_event.get("resource") is not None and event_parser.identity.principal_type == "group_api_key":
        return response(code=HTTPStatus.FORBIDDEN)

    if not parsed_event or not parsed_event.get("repo_id"):
        r = response("DSO Analyzer repositories")
    elif parsed_event.get("resource") == "whitelist":
        r = get_repo_whitelist(parsed_event)
    elif parsed_event.get("resource") == "history":
        r = get_repo_history(parsed_event, user=event_parser.identity.principal_id)
    elif parsed_event.get("resource") == "report":
        r = get_repo_report(parsed_event, user=event_parser.identity.principal_id)
    else:
        try:
            report = get_report(
                parsed_event["repo_id"],
                parsed_event["service_id"],
                scan_id=parsed_event["scan_id"],
                params=parsed_event["query_params"],
            )
            if report:
                r = response(report)
        except LambdaError:
            r = response("An error occurred generating the report", code=HTTPStatus.INTERNAL_SERVER_ERROR)
    return r


def get_whitelist(repo, service, item_id=None, item_type=None):
    try:
        if item_id:
            return Repo.objects.get(repo=repo, service=service).allowlistitem_set.filter(item_id=item_id)
        if item_type:
            return Repo.objects.get(repo=repo, service=service).allowlistitem_set.filter(item_type=item_type)
    except (Repo.DoesNotExist, AllowListItem.DoesNotExist, DjangoValidationError):
        return []


def get_repo_whitelist(event):
    if event.get("resource_id"):
        wl = get_whitelist(event.get("repo_id"), event.get("service_id"), item_id=event.get("resource_id"))
        if not wl:
            return response(code=HTTPStatus.NOT_FOUND)
        return response(wl[0].to_dict())
    wl = []
    for item_type in event["query_params"].get("type", WL_TYPES):
        wl += get_whitelist(event.get("repo_id"), event.get("service_id"), item_type=item_type)
    return response([item.to_dict() for item in wl])


def get_report(repo_id, service, scan_id=None, params=None):
    try:
        if scan_id:
            # Get the scan with the specific ID
            scan = Repo.objects.get(repo=repo_id, service=service).scan_set.get(scan_id=scan_id)
        else:
            # Get the latest scan
            qs = Repo.objects.get(repo=repo_id, service=service).scan_set.order_by("-created")
            if params["format"] == FORMAT_SBOM:
                # If getting an SBOM report, limit the most recent scan to those with SBOM results
                qs = qs.filter(sbom=True)
            scan = qs.first()
            if not scan:
                return None
    except (Repo.DoesNotExist, Scan.DoesNotExist, DjangoValidationError):
        return None

    if params["format"] == FORMAT_SBOM:
        if SBOM_REPORT_LAMBDA is not None:
            # Running in Lambda environment so invoke the JSON report Lambda
            aws = AWSConnect()
            return aws.invoke_lambda(name=SBOM_REPORT_LAMBDA, payload={"scan_id": str(scan.scan_id)})
        else:
            # Running locally (via api_runner, for example) so run the handler directly
            from sbom_report.handlers import handler  # pylint: disable=import-outside-toplevel

            return handler({"scan_id": scan.scan_id})
    else:
        if JSON_REPORT_LAMBDA is not None:
            # Running in Lambda environment so invoke the JSON report Lambda
            aws = AWSConnect()
            return aws.invoke_lambda(name=JSON_REPORT_LAMBDA, payload={"scan_id": str(scan.scan_id), "filters": params})
        else:
            # Running locally (via api_runner, for example) so run the handler directly
            from json_report.handlers import handler  # pylint: disable=import-outside-toplevel

            return handler({"scan_id": scan.scan_id, "filters": params})


def get_repo_history(event, user=None):
    repo_id = event["repo_id"]
    service_id = event["service_id"]
    offset = int(event.get("query_params", {}).get("offset", [0])[0])
    limit = int(event.get("query_params", {}).get("limit", [DEFAULT_PAGE_SIZE])[0])

    owner_email = None
    if "initiated_by" in event.get("query_params", {}) and event.get("query_params", {}).get("initiated_by"):
        owner_email = event.get("query_params", {}).get("initiated_by")[0]
        if owner_email == "self":
            owner_email = user

    include_batch = False
    if "include_batch" in event.get("query_params", {}):
        include_batch = event.get("query_params", {}).get("include_batch")

    include_diff = False
    if "include_diff" in event.get("query_params", {}):
        include_diff = event.get("query_params", {}).get("include_diff")

    qualified = None
    if "qualified" in event.get("query_params", {}):
        qualified = event.get("query_params", {}).get("qualified")

    try:
        scans = Repo.objects.get(repo=repo_id, service=service_id).scan_set.order_by("-created")
        if owner_email:
            scans = scans.filter(owner__email=owner_email)
        if not include_batch:
            scans = scans.filter(batch_priority=False)
        if not include_diff:
            # Filter out scans that don't have diff_compare set
            scans = scans.filter(diff_compare=None)
        if qualified is not None:
            scans = scans.filter(qualified=qualified)

        return page(
            scans,
            offset,
            limit,
            f"{service_id}/{repo_id}/history",
            {"history_format": True},
            extra_args=f"initiated_by={owner_email}" if owner_email else None,
        )
    except Repo.DoesNotExist:
        return response(code=HTTPStatus.NOT_FOUND)
