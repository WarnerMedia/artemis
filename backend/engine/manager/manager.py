import json

import django.db
import psycopg2

from artemisdb.artemisdb.models import Engine, EnginePlugin, EngineState, Plugin
from artemislib.aws import AWSConnect, LambdaError
from artemislib.datetime import format_timestamp, get_utc_datetime
from artemislib.logging import Logger
from env import STATUS_LAMBDA
from utils.plugin import get_plugin_list, get_plugin_settings

log = Logger(__name__)

MAINTENANCE_CHECK_INTERVAL = 5  # minutes


class EngineManager:
    """
    Object to isolate DB operations for engine management
    """

    _engine = None

    def __init__(self, instance_id, engine_id):
        self._instance_id = instance_id
        self._engine_id = engine_id
        self._create_connection()
        self._register_plugins()
        self._engine.start_time = get_utc_datetime()
        self._engine.shutdown_time = None
        self._engine.state = EngineState.RUNNING.value
        self._engine.save()

        # Tracking maintenance mode
        self._maintenance_mode = False  # Assume not in maintenace mode when starting
        self._next_maintenance_check = get_utc_datetime()  # Initial next check is now

    def shutdown_requested(self):
        if not self._refresh():
            return True

        if self._engine.state == EngineState.SHUTDOWN_REQUESTED.value:
            # A shutdown was requested so update the engine state to shutdown and update the timestamp
            self._engine.state = EngineState.SHUTDOWN.value
            self._engine.shutdown_time = get_utc_datetime()
            self._engine.save()
            return True
        if self._engine.state in (EngineState.SHUTDOWN.value, EngineState.TERMINATED.value):
            # If for some reason we are checking for shutdown_requested but find the engine has already been marked
            # as shutdown or terminated return True to break the polling loop but don't update the engine state or
            # shutdown_time.
            return True

        return False

    def _refresh(self, first=True):
        try:
            self._engine.refresh_from_db()
            return True
        except (django.db.utils.OperationalError, psycopg2.InterfaceError) as e:
            # Connection to the DB has been closed.
            if first:
                self._create_connection()
                return self._refresh(False)
            else:
                log.exception("Error when checking if shutdown requested: %s", e)
                return False

    def _create_connection(self):
        self._engine, _ = Engine.objects.get_or_create(engine_id=f"{self._instance_id}-{self._engine_id}")

    def maintenance_mode(self):
        if self._next_maintenance_check < get_utc_datetime():
            # The next maintenance check time is in the past so update the status
            log.info("Checking for maintenance mode")
            self._maintenance_mode = _check_maintenance_mode()
            log.info("Maintenance mode: %s", self._maintenance_mode)

            # Set the next maintenance mode check time
            self._next_maintenance_check = get_utc_datetime(offset_minutes=MAINTENANCE_CHECK_INTERVAL)
            log.info("Next maintenance check set for %s", format_timestamp(self._next_maintenance_check))

        # Return the stored maintenance mode value
        return self._maintenance_mode

    def _register_plugins(self):
        for plugin_name in get_plugin_list():
            settings = get_plugin_settings(plugin_name)
            plugin, _ = Plugin.objects.get_or_create(
                name=plugin_name, defaults={"friendly_name": settings.name, "type": settings.plugin_type}
            )
            EnginePlugin.objects.create(engine=self._engine, plugin=plugin, enabled=not settings.disabled)
            log.info("Registered plugin %s (enabled: %s)", plugin_name, not settings.disabled)


def _check_maintenance_mode():
    if STATUS_LAMBDA is None:
        log.error("Status lambda is not set")
        return False

    aws = AWSConnect()
    try:
        status = json.loads(aws.invoke_lambda(name=STATUS_LAMBDA, payload={"httpMethod": "GET"})["body"])
        return status["maintenance"]["enabled"]
    except LambdaError:
        log.error("Unable to execute status lambda")
        return False
