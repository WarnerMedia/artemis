import simplejson as json
from artemisdb.artemisdb.consts import ReportStatus
from artemisdb.artemisdb.models import Report
from artemislib.aws import AWSConnect
from artemislib.datetime import get_utc_datetime


def handler(event, _=None):
    for record in event["Records"]:
        process_event(json.loads(record["body"]))


def process_event(event):
    dummy_report_key = "reports/pdf/Artemis_Dummy_Report.pdf"

    print(f"Processing report {event['report_id']}")

    try:
        report = Report.objects.get(report_id=event["report_id"])
    except Report.DoesNotExist:
        print(f"Unable to locate report {event['report_id']}, aborting")
        return

    s3_key = f"reports/pdf/artemis_report-{str(report.report_id)}.pdf"

    print(f"Copying {dummy_report_key} to {s3_key}")

    aws = AWSConnect()
    aws.copy_s3_object("reports/pdf/Artemis_Dummy_Report.pdf", s3_key)

    report.status = ReportStatus.COMPLETED.value
    report.completed = get_utc_datetime()
    report.s3_key = s3_key
    report.save()


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("report_id")
    args = parser.parse_args()

    handler({"Records": [{"body": json.dumps({"report_id": args.report_id})}]})
