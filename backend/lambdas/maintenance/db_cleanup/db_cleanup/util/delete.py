from datetime import datetime, timezone

from django.db.models import QuerySet

from artemislib.logging import Logger

BATCH_SIZE = 100


def sequential_delete(
    qs: QuerySet, log: Logger, log_freq: int = 100, name: str | None = None, delete_check: callable = None
) -> None:
    total = 0
    count = 0

    start = 0
    end = BATCH_SIZE
    while True:
        # Page through the full query using LIMIT so that we don't run into memory issues
        batch = qs[start:end]
        for item in batch:
            # We are doing this in a loop rather than calling .delete() on the QuerySet
            # because doing this directly on the QuerySet puts it in a transaction that
            # has the potential to run longer than the max Lambda execution time. By
            # deleting items individually we will delete what is possible within this
            # Lambda execution and then pick it up in the next Lambda execution.
            if delete_check is None or delete_check(item) is True:
                start = datetime.now(timezone.utc)
                d = item.delete()
                log.debug("Deleted %s in %s (%s)", item, str(datetime.now(timezone.utc) - start), d)
            else:
                continue

            count += 1
            total += 1

            if count % log_freq == 0:
                log.info("Deleted %s %s", count, name)
                count = 0

        if len(batch) < BATCH_SIZE:
            # The page was less than the batch size so it was the last page
            break

        start = end
        end = end + BATCH_SIZE

    if count > 0:
        log.info("Deleted %s %s", count, name)

    log.info("%s total %s deleted", total, name)
