from artemisdb.artemisdb.models import Component
from artemislib.logging import Logger
from db_cleanup.util.delete import sequential_delete

LOG_FREQ = 1000


def obsolete_components(log: Logger) -> None:
    log.info("Cleaning up obsolete components")
    # All components that are no longer referenced by any scan means all of the scans that
    # found these specific components have aged out of the system. This means that the
    # component is no longer found by current scanning and can be removed so it does not
    # appear in search results anymore.
    qs = Component.objects.filter(repocomponentscan=None)
    sequential_delete(qs, log, LOG_FREQ, "components")
