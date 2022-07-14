from artemislib.logging import Logger
from scan_scheduler.retry import process_retries
from scan_scheduler.schedule import process_schedules

LOG = Logger(__name__)


def handler(_event=None, _context=None):
    LOG.debug("Scan scheduler running")
    process_schedules()
    process_retries()
    LOG.debug("Scan scheduler finished")
