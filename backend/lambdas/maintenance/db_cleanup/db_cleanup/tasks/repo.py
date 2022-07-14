from artemisdb.artemisdb.models import Repo
from artemislib.logging import Logger
from db_cleanup.util.delete import sequential_delete

LOG_FREQ = 100


def orphan_repos(log: Logger) -> None:
    log.info("Cleaning up repos that no longer have associated scans")
    qs = Repo.objects.filter(scan=None)
    sequential_delete(qs, log, LOG_FREQ, "repos")
