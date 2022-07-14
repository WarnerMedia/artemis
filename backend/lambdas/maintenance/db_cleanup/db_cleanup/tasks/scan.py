from artemisdb.artemisdb.consts import ScanStatus
from artemisdb.artemisdb.models import Scan
from artemislib.datetime import format_timestamp, get_utc_datetime
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
    qs = Scan.objects.filter(end_time__lt=age)
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
