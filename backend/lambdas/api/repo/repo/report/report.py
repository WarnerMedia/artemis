import uuid
from http import HTTPStatus
from urllib.parse import urlparse

from artemisapi.response import response
from artemisapi.validators import ValidationError
from artemisdb.artemisdb.consts import ReportStatus
from artemisdb.artemisdb.models import Repo, Report, Scan, User
from artemislib.datetime import format_unix_time
from repo.util.aws import AWSConnect
from repo.util.const import REPORT_S3_DL_EXPIRATION_SECONDS
from repo.util.parse_event import EventParser


def get_repo_report(event, user=None):
    try:
        # Get the scan first to make sure the scan exists for this service/repo
        scan = Repo.objects.get(repo=event["repo_id"], service=event["service_id"]).scan_set.get(
            scan_id=event["scan_id"]
        )
    except Scan.DoesNotExist:
        return response(code=HTTPStatus.NOT_FOUND)

    if event["resource_id"]:
        try:
            # Get the report with the specific ID
            report = Report.objects.get(report_id=event["resource_id"], scan_id=scan.scan_id, created_by__email=user)
        except Report.DoesNotExist:
            return response(code=HTTPStatus.NOT_FOUND)
    else:
        # Get the latest report created by this user for this scan
        report = Report.objects.filter(scan_id=scan.scan_id, created_by__email=user).order_by("-requested").first()
        if report is None:
            return response(code=HTTPStatus.NOT_FOUND)

    resp = report.to_dict()
    resp["download"] = None

    if report.status == ReportStatus.COMPLETED.value:
        # Report is completed. Generate a presigned URL so that it can be downloaded directly from S3.
        aws = AWSConnect()
        resp["download"] = {"url": None, "expires": None}
        resp["download"]["url"] = aws.get_s3_presigned_url(report.s3_key, expiration=REPORT_S3_DL_EXPIRATION_SECONDS)
        for arg in urlparse(resp["download"]["url"]).query.split("&"):
            if arg.startswith("Expires="):
                resp["download"]["expires"] = format_unix_time(int(arg.replace("Expires=", "")))

    return response(resp)


def post_report(event_parser: EventParser, user=None):
    event = event_parser.parsed_event
    try:
        req_list = event_parser.parse_report_body()
    except ValidationError as e:
        return response({"message": e.message}, code=e.code)

    try:
        scan = Repo.objects.get(repo=event["repo_id"], service=event["service_id"]).scan_set.get(
            scan_id=event["scan_id"]
        )
    except (Repo.DoesNotExist, Scan.DoesNotExist):
        return response(code=HTTPStatus.NOT_FOUND)

    aws = AWSConnect()

    queued = []
    failed = []
    for req in req_list:
        item = Report.objects.create(
            report_id=str(uuid.uuid4()),
            report_type=req["type"],
            created_by=User.objects.filter(email=user).first(),
            status=ReportStatus.QUEUED.value,
            scan_id=scan.scan_id,
            filters=req["filters"],
        )
        full_id = f'{event["service_id"]}/{event["repo_id"]}/{event["scan_id"]}/report/{item.report_id}'
        if aws.queue_report(item.report_id):
            queued.append(full_id)
        else:
            failed.append(full_id)

    if queued and not failed:
        code = HTTPStatus.OK
    elif queued and failed:
        code = HTTPStatus.MULTI_STATUS  # mixed success
    else:
        code = HTTPStatus.BAD_REQUEST  # all failed

    return response({"queued": queued, "failed": failed}, code=code)
