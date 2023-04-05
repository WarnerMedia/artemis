import json
import subprocess
from random import randint
from time import sleep

import django.db
import psycopg2

from artemisdb.artemisdb.models import Engine, EnginePlugin, EngineState, Plugin
from artemislib.aws import AWSConnect, LambdaError
from artemislib.datetime import format_timestamp, get_utc_datetime
from artemislib.logging import Logger
from env import STATUS_LAMBDA, DB_RETRY_LIMIT, DB_RETRY_WAIT, REGION
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

        # Reconnection attempt
        retry = 0
        while self._engine is None:
            try:
                # Connection to the DB has been closed.
                if retry <= DB_RETRY_LIMIT:
                    if retry > 0:
                        log.info(
                            "Attempting to recreate connection with the database (retry #%s of %s)",
                            retry,
                            DB_RETRY_LIMIT,
                        )
                    self._create_connection()
                else:
                    log.error("Reconnection attempts exceeded retry limit")
                    self._abnormal_shutdown = True  # This is not going to be a normal shutdown
                    return
            except (django.db.utils.OperationalError, psycopg2.InterfaceError, django.db.utils.InterfaceError) as e:
                log.error("Unable to connect to database: %s", e)
                django.db.close_old_connections()  # Close existing connections so they will be recreated
                sleep(DB_RETRY_WAIT)  # Give the DB time to recover
                retry += 1

        self._register_plugins()
        self._engine.start_time = get_utc_datetime()
        self._engine.shutdown_time = None
        self._engine.state = EngineState.RUNNING.value
        self._engine.save()

        # Tracking maintenance mode
        self._maintenance_mode = False  # Assume not in maintenace mode when starting
        self._next_maintenance_check = get_utc_datetime()  # Initial next check is now

        self._abnormal_shutdown = False  # Assume any shutdown is normal

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

    def _refresh(self, retry=0):
        try:
            if retry > 0:
                log.info("Attempting to refresh engine info from database")
            self._engine.refresh_from_db()
        except (django.db.utils.OperationalError, psycopg2.InterfaceError, django.db.utils.InterfaceError) as e:
            log.error("Unable to refresh engine info from database: %s", e)
        else:
            if retry > 0:
                log.info("Reestablished database connection")
            return True

        # Reconnection attempt
        retry += 1
        try:
            # Connection to the DB has been closed.
            if retry <= DB_RETRY_LIMIT:
                log.info("Attempting to recreate connection with the database (retry #%s of %s)", retry, DB_RETRY_LIMIT)
                self._create_connection()
                return self._refresh(retry)
            else:
                log.error("Reconnection attempts exceeded retry limit")
                self._abnormal_shutdown = True  # This is not going to be a normal shutdown
                return False
        except (django.db.utils.OperationalError, psycopg2.InterfaceError, django.db.utils.InterfaceError) as e:
            log.error("Connection error: %s", e)
            django.db.close_old_connections()  # Close existing connections so they will be recreated
            sleep(DB_RETRY_WAIT)  # Give the DB time to recover
            return self._refresh(retry)

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

    def set_instance_health(self):
        if not self._abnormal_shutdown:
            # Normal shutdown, do nothing
            return

        if self._instance_id is None:
            log.info("Engine shut down abnormally but is not running in AWS so can't set instance health")
            return

        r = subprocess.run(
            [
                "aws",
                "autoscaling",
                "set-instance-health",
                "--region",
                REGION,
                "--instance-id",
                self._instance_id,
                "--health-status",
                "Unhealthy",
                "--no-should-respect-grace-period",
            ],
            capture_output=True,
        )
        if r.returncode == 0:
            log.info("Set heath of instance %s to Unhealthy", self._instance_id)
        else:
            log.error("Unable to set instance health: %s", r.stderr.decode("utf-8"))

    def terminate_instance(self):
        if self._instance_id is None:
            log.info("Engine is not running in AWS so can't terminate instance")
            return

        log.info("Starting instance termination")

        # There is a race condition here. If one or more engine containers do this at the same time
        # they will see each other still running and not terminate the instance. In that case the
        # instance will stick around until the ASG termination waiting period expires. But, that is
        # the current behavior (the instances stick around until the ASG cleans them up) so this is
        # an improvement even with the race condition.
        #
        # When there are multiple engines on an instances they are going to start out synchronized
        # and then get unsynchronized over time as they run scans. To reduce the chance of this
        # race condition when engines haven't run any scans sleep for a random amount of time before
        # getting the list of running containers.
        sleep(randint(1, 30))  # Sleep for a random number of seconds, up to 30

        r = subprocess.run(
            [
                "docker",
                "ps",
                "--filter",
                "name=artemis-engine-*",  # This prefix is hardcoded in the instance start script
                "--quiet",
            ],
            capture_output=True,
        )
        if r.returncode != 0:
            log.error("Unable to get engine container IDs: %s", r.stderr.decode("utf-8"))
            return

        for container_id in r.stdout.decode("utf-8").strip().split("\n"):
            if container_id and container_id != self._engine_id:
                log.info("Other engines are still running, skipping instance termination")
                return

        r = subprocess.run(
            ["aws", "ec2", "terminate-instances", "--region", REGION, "--instance-ids", self._instance_id],
            capture_output=True,
        )
        if r.returncode == 0:
            log.info("Terminating instance %s", self._instance_id)
        else:
            log.error("Unable to terminate instance: %s", r.stderr.decode("utf-8"))


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
