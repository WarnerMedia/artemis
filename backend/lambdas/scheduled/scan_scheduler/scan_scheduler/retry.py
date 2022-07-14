from datetime import datetime, timezone

from artemisdb.artemisdb.models import ScanScheduleRetry
from artemislib.aws import AWSConnect
from artemislib.logging import Logger
from scan_scheduler.env import SCHEDULE_QUEUE

LOG = Logger(__name__)


def process_retries() -> None:
    LOG.info("Processing retries")

    # Get all of the retries where the retry time is in the past and has retries left
    retries = ScanScheduleRetry.objects.filter(
        retry_time__lt=datetime.utcnow().replace(tzinfo=timezone.utc), count_remaining__gt=0
    )

    LOG.debug("Found %s scheduled scans to retry", retries.count())
    for retry in retries:
        LOG.debug(retry)
        queue(retry)


def queue(retry: ScanScheduleRetry):
    body = retry.scan_config
    body["service"] = retry.repo.service
    body["repo"] = retry.repo.repo

    # Queue the scheduled scan for later processing
    aws = AWSConnect()
    if aws.queue_msg(queue=SCHEDULE_QUEUE, msg=body):
        LOG.info("Queued %s", retry)
