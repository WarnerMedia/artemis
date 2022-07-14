from django.db.models import Q

from artemisdb.artemisdb.consts import EngineState
from artemisdb.artemisdb.models import Engine
from artemislib.aws import AWSConnect
from artemislib.datetime import format_timestamp, get_utc_datetime
from artemislib.logging import Logger
from db_cleanup.util.delete import sequential_delete
from db_cleanup.util.env import MAX_ENGINE_AGE

LOG_FREQ = 100


def unterminated_engines(log: Logger) -> None:
    log.info("Cleaning up unterminated engine records")
    aws = AWSConnect()
    instance_ids = aws.get_instance_ids()

    engine_id_filter = Q()
    for instance_id in instance_ids:
        engine_id_filter &= ~Q(engine_id__startswith=instance_id)

    # Update all the engines that are still listed as running but their EC2 instance does not exist
    now = get_utc_datetime()
    count = Engine.objects.filter(engine_id_filter, state=EngineState.RUNNING.value).update(
        state=EngineState.TERMINATED.value, shutdown_time=now
    )
    log.info("%s engine records updated", count)


def old_engines(log: Logger) -> None:
    age = get_utc_datetime(offset_minutes=-MAX_ENGINE_AGE)
    log.info("Deleting engine records older than %s", format_timestamp(age))
    qs = Engine.objects.filter(shutdown_time__lt=age)
    sequential_delete(qs, log, LOG_FREQ, "engine records")
