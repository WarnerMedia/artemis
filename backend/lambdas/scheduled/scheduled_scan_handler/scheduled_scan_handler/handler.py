import json
import os

import requests
from requests.exceptions import RequestException

from artemisdb.artemisdb.models import Repo, ScanScheduleRetry, ScanScheduleRun
from artemislib.aws import AWSConnect
from artemislib.datetime import format_timestamp, get_utc_datetime
from artemislib.logging import Logger

APPLICATION = os.environ.get("APPLICATION", "artemis")
API_KEY = os.environ.get("ARTEMIS_API_KEY", f"{APPLICATION}/scheduler-api-key")
ARTEMIS_API = os.environ.get("ARTEMIS_API")
RETRY_MINUTES = 15

LOG = Logger(__name__)


def handler(event, _=None):
    if not ARTEMIS_API:
        LOG.error("Artemis API endpoint not configured")
        return

    api_key = get_api_key()
    if not (api_key):
        LOG.error("Missing API config")
        return

    for item in event["Records"]:
        scan = json.loads(item["body"])

        service = scan["service"]
        repo = scan["repo"]
        del scan["service"]
        del scan["repo"]

        url = f"{ARTEMIS_API}/{service}/{repo}"

        try:
            r = requests.post(url, headers={"x-api-key": api_key}, json=scan)
            if r.status_code != 200:
                failed(service, repo, scan, f"{format_timestamp(get_utc_datetime())}: {r.text}")
            else:
                for scan_id in r.json()["queued"]:
                    LOG.info("Initiated scan: %s", scan_id)
                    clear_retry(service, repo, scan["schedule_run"])

        except RequestException as e:
            failed(service, repo, scan, f"{format_timestamp(get_utc_datetime())}: {str(e)}")


def get_api_key() -> str:
    aws = AWSConnect()
    return aws.get_secret(API_KEY).get("key")


def failed(service: str, repo: str, scan_config: dict, error: str) -> None:
    LOG.error("Scan of %s/%s failed: %s", service, repo, error)

    run = ScanScheduleRun.objects.get(run_id=scan_config["schedule_run"])
    repository = Repo.objects.get(service=service, repo=repo)

    retry_time = get_utc_datetime(RETRY_MINUTES)

    retry, created = ScanScheduleRetry.objects.get_or_create(
        run=run, repo=repository, defaults={"scan_config": scan_config, "retry_time": retry_time, "errors": [error]}
    )

    if not created:
        # Decrement the retry counter
        retry.count_remaining -= 1

        # Append the latest error to the list
        retry.errors.append(error)

        if retry.count_remaining != 0:
            # If there are retries remaining set the retry time
            retry.retry_time = retry_time

        retry.save()


def clear_retry(service: str, repo: str, run_id: str) -> None:
    # If there was an existing retry entry delete it since the scan succeeded
    count, _ = ScanScheduleRetry.objects.filter(run__run_id=run_id, repo__service=service, repo__repo=repo).delete()
    if count:
        LOG.info("Cleared retry entry for %s/%s (run %s)", service, repo, run_id)
