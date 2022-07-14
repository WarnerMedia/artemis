from artemislib.logging import Logger
from db_cleanup.tasks.component import obsolete_components
from db_cleanup.tasks.engine import old_engines, unterminated_engines
from db_cleanup.tasks.repo import orphan_repos
from db_cleanup.tasks.scan import old_scans, sbom_scans, secrets_scans

LOG = Logger("db_cleanup")

TASKS = [
    unterminated_engines,
    old_engines,
    secrets_scans,
    old_scans,
    orphan_repos,
    sbom_scans,
    obsolete_components,
]


def handler(_event=None, _context=None):
    LOG.info("Running cleanup tasks")
    for task in TASKS:
        try:
            task(LOG)
        except Exception as e:
            LOG.error("Error running task '%s': %s", task.__name__, e)
