from datetime import datetime, timedelta, timezone

from artemisdb.artemisdb.models import Report
from artemislib.aws import AWSConnect
from artemislib.datetime import format_timestamp
from artemislib.logging import Logger

from report_cleanup.util.env import MAX_REPORT_AGE

LOG = Logger("report_cleanup")


def handler(_event=None, _context=None):
    aws = AWSConnect()

    age = datetime.utcnow().replace(tzinfo=timezone.utc) - timedelta(minutes=MAX_REPORT_AGE)

    LOG.info("Cleaning up reports older than %s", format_timestamp(age))

    old_reports = Report.objects.filter(requested__lt=age)

    LOG.info("Found %d report(s) to clean up", len(old_reports))

    for report in old_reports:
        LOG.info("Processing %s (requested %s)", report.report_id, format_timestamp(report.requested))
        if report.s3_key:
            LOG.info("Deleting %s", report.s3_key)
            s3_obj = aws.get_s3_object(report.s3_key)
            s3_obj.delete()  # This will always succeed even if the file doesn't exist
        LOG.info("Deleting record for %s", report.report_id)
        report.delete()


if __name__ == "__main__":
    handler()
