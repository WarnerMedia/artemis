import uuid
from datetime import datetime, time, timedelta, timezone

from artemisdb.artemisdb.models import RepoScanSchedule, ScanSchedule, ScanScheduleRun
from artemislib.aws import AWSConnect
from artemislib.datetime import format_timestamp, get_utc_datetime
from artemislib.logging import Logger
from scan_scheduler.env import SCHEDULE_QUEUE

LOG = Logger(__name__)


def process_schedules() -> None:
    LOG.info("Processing scan schedules")

    # Get all of the schedules where the next scan time is in the past
    schedules = ScanSchedule.objects.filter(
        next_scan_time__lt=datetime.utcnow().replace(tzinfo=timezone.utc), enabled=True
    )
    LOG.debug("Found %s schedules to process", schedules.count())

    for schedule in schedules:
        LOG.debug("Processing %s", schedule)

        # Create new run instance
        run = ScanScheduleRun.objects.create(
            run_id=uuid.uuid4(),
            schedule=schedule,
            categories=schedule.categories,
            plugins=schedule.plugins,
            depth=schedule.depth,
            include_dev=schedule.include_dev,
        )

        scheduled_repos = RepoScanSchedule.objects.filter(schedule=schedule)
        LOG.debug("Found %s repos to scan", scheduled_repos.count())

        for scheduled_repo in scheduled_repos:
            queue(scheduled_repo, run)

        calculate_next_scan_time(schedule)


def queue(scheduled_repo: RepoScanSchedule, run: ScanScheduleRun):
    body = {
        "service": scheduled_repo.repo.service,
        "repo": scheduled_repo.repo.repo,
        "branch": scheduled_repo.ref,
        "schedule_run": str(run.run_id),
        "categories": scheduled_repo.schedule.categories,
        "plugins": scheduled_repo.schedule.plugins,
        "include_dev": scheduled_repo.schedule.include_dev,
        "depth": scheduled_repo.schedule.depth,
        "batch_priority": True,  # Scheduled scans always get batch priority
    }
    # Queue the scheduled scan for later processing
    aws = AWSConnect()
    if aws.queue_msg(queue=SCHEDULE_QUEUE, msg=body):
        LOG.info("Queued %s", scheduled_repo)


def calculate_next_scan_time(schedule: ScanSchedule):
    if schedule.interval_minutes is not None:
        # The schedule is interval based so calculate the next scan time by adding the interval to the previous time
        schedule.next_scan_time = schedule.next_scan_time + timedelta(minutes=schedule.interval_minutes)
        if schedule.next_scan_time.replace(tzinfo=timezone.utc) < datetime.utcnow().replace(tzinfo=timezone.utc):
            # If the next scan time after offset is in the past go ahead and forward it to now
            schedule.next_scan_time = datetime.utcnow().replace(tzinfo=timezone.utc)
    elif schedule.day_of_week is not None:
        next_scan = _get_next_day_of_week(get_utc_datetime(), schedule.day_of_week)
        next_scan = _set_time(next_scan, schedule.time_of_day)
        schedule.next_scan_time = next_scan
    elif schedule.day_of_month is not None:
        next_scan = _get_next_day_of_month(get_utc_datetime, schedule.day_of_month)
        next_scan = _set_time(next_scan, schedule.time_of_day)
        schedule.next_scan_time = next_scan

    schedule.save()
    LOG.info("%s next scan time set to %s", schedule, format_timestamp(schedule.next_scan_time))


def _get_next_day_of_week(dt: datetime, day_of_week: int) -> datetime:
    if dt.weekday() == day_of_week:
        # Same day of week as today so bump out a week
        return dt + timedelta(days=7)
    else:
        # Different day of week so calculate the offset to the next one
        return dt + timedelta(days=(day_of_week - dt.weekday() + 7) % 7)


def _get_next_day_of_month(dt: datetime, day_of_month: int) -> datetime:
    if dt.day < day_of_month:
        # Day of month for this month is still to occur
        return dt.replace(day=day_of_month)
    else:
        # Day of month in the next month
        return (dt.replace(day=1) + timedelta(days=31)).replace(day=day_of_month)


def _set_time(dt: datetime, t: time = None) -> datetime:
    if t is not None:
        return dt.replace(hour=t.hour, minute=t.minute, second=t.second)
    else:
        return dt.replace(hour=0, minute=0, second=0)
