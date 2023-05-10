from artemisdb.artemisdb.consts import ScanStatus
from artemisdb.artemisdb.models import Scan
from artemislib.aws import AWSConnect
from artemislib.consts import SCANS_S3_KEY
from artemislib.datetime import format_timestamp, get_utc_datetime
from artemislib.env import SCAN_DATA_S3_BUCKET, SCAN_DATA_S3_ENDPOINT
from artemislib.logging import Logger
from db_cleanup.util.delete import sequential_delete
from db_cleanup.util.env import MAX_SCAN_AGE, MAX_SECRET_SCAN_AGE

LOG_FREQ = 1000


def secrets_scans(log: Logger) -> None:
    age = get_utc_datetime(offset_minutes=-MAX_SECRET_SCAN_AGE)
    log.info("Cleaning up secrets scans older than %s", format_timestamp(age))
    qs = Scan.objects.filter(batch_priority=True, end_time__lt=age, plugins__contains="gitsecrets")
    sequential_delete(qs, log, LOG_FREQ, "scans")


def old_scans(log: Logger) -> None:
    age = get_utc_datetime(offset_minutes=-MAX_SCAN_AGE)
    log.info("Cleaning up scans older than %s", format_timestamp(age))
    qs = Scan.objects.filter(created__lt=age)
    sequential_delete(qs, log, LOG_FREQ, "scans")


def sbom_scans(log: Logger) -> None:
    log.info("Deleting obsolete SBOM scans")
    qs = Scan.objects.filter(batch_priority=True, sbom=True, ref=None, status=ScanStatus.COMPLETED.value)
    sequential_delete(qs, log, LOG_FREQ, "SBOM scans", _sbom_delete_check)


def _sbom_delete_check(scan: Scan) -> bool:
    # The scan can be deleted if there are newer completed SBOM scans for this repo
    return (
        scan.repo.scan_set.filter(
            batch_priority=True, sbom=True, status=ScanStatus.COMPLETED.value, created__gt=scan.created
        ).count()
        > 0
    )


def orphaned_s3_scan_data(log: Logger) -> None:
    log.info("Cleaning up orphaned scan data from S3")
    aws = AWSConnect()
    files = aws.get_s3_file_list(prefix=SCANS_S3_KEY, s3_bucket=SCAN_DATA_S3_BUCKET, endpoint_url=SCAN_DATA_S3_ENDPOINT)
    count = 0
    for f in files:
        scan_id = f.key.split("/")[1]  # Extract the scan ID from the S3 key: scans/<SCAN_ID>/...
        if not Scan.objects.filter(scan_id=scan_id).exists():
            # Scan data is for a scan that no longer exists in the database
            f.delete()
            count += 1
            log.debug("Deleted %s", f.key)
    log.info("%s total files deleted", count)
