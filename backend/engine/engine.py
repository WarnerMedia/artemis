import json
import os
import shutil
from time import sleep

import boto3
from botocore.exceptions import ClientError

from artemislib.datetime import get_utc_datetime
from artemislib.logging import Logger
from env import (
    ENGINE_ID,
    INSTANCE_ID,
    PRIORITY_TASK_QUEUE,
    REGION,
    S3_KEY,
    SERVICES_S3_KEY,
    SQS_ENDPOINT,
    TASK_QUEUE,
    WORKING_DIR,
    refresh_log_state,
)
from processor.processor import EngineProcessor
from utils.engine import _build_docker_images, check_disk_space, cleanup_images
from utils.services import get_services_dict

log = Logger(__name__)

DEFAULT_POLL_WAIT = 20  # Seconds
PRIORITY_POLL_WAIT = 5  # Seconds


def poll(queue, wait_time=DEFAULT_POLL_WAIT):
    try:
        sqs = boto3.client("sqs", endpoint_url=SQS_ENDPOINT, region_name=REGION)

        resp = sqs.receive_message(
            QueueUrl=queue,
            AttributeNames=["SentTimestamp"],
            MaxNumberOfMessages=1,
            MessageAttributeNames=["All"],
            WaitTimeSeconds=wait_time,
        )

        messages = resp.get("Messages", [])
        msg = messages[0] if messages else None

        if msg:
            log.info("Got message %s", msg["MessageId"])
            receipt_handle = msg["ReceiptHandle"]
            sqs.delete_message(QueueUrl=queue, ReceiptHandle=receipt_handle)
        else:
            log.debug("SQS poll timeout (%s)", queue.split("/")[-1])
        return msg

    except ClientError as err:
        if err.response["Error"]["Code"] == "AWS.SimpleQueueService.NonExistentQueue":
            log.warning("Queue not found: %s", queue)
        else:
            raise err


def process(msg, manager=None):  # pylint: disable=too-many-statements
    services = get_services_dict(SERVICES_S3_KEY, S3_KEY).get("services")
    action = msg["MessageAttributes"]["action"]["StringValue"]
    details = json.loads(msg["Body"])
    service = details.get("service", "github")
    repo = details["repo"]

    engine_processor = EngineProcessor(services, action, details, manager=manager)

    Logger.add_fields(scan_id=engine_processor.action_details.scan_id, repo=repo, version_control_service=service)

    log.info("Scan %s of %s starting", engine_processor.action_details.scan_id, repo)

    engine_processor.update_scan_status("processing", start_time=get_utc_datetime())
    errors = []
    debug = []

    if action.lower() == "scan":
        if not check_disk_space(details.get("repo_size", 0)):
            log.info("Scan failed because not enough " "disk space (repo size: %d KB)", details["repo_size"])
            engine_processor.update_scan_status(
                "error", end_time=get_utc_datetime(), errors=["Repo too large (%d KB)" % details["repo_size"]]
            )
            engine_processor.queue_callback("error")
            return
        # Check if docker images need to be built first
        build_images = engine_processor.docker_images_required()
        images = {}
        try:
            repo_obtained = engine_processor.pull_repo()
            if repo_obtained:
                log.info("Repo Processed")
                engine_processor.update_scan_post_pull_repo()

                if build_images:
                    repo_path = os.path.join(engine_processor.get_scan_working_dir(), "base")
                    images = _build_docker_images(repo_path, repo, ENGINE_ID, untag_images=True)
                    built = []
                    not_built = []
                    for image in images["results"]:
                        if image.get("status"):
                            built.append(image.get("dockerfile"))
                        else:
                            not_built.append(image.get("dockerfile"))

                    # Note which images were built or not as scan debug messages
                    debug.append(f"Dockerfiles automatically built for scanning: {', '.join(built) or 'None'}")
                    if not_built:
                        message = (
                            "Dockerfiles that could not be automatically built and will not be scanned: "
                            f"{', '.join(not_built)}"
                        )
                        debug.append(message)
                        log.warning(message)
                # Run analysis tasks here
                engine_processor.process_plugins(images, services)
            else:
                log.error("Repo %s/%s could not be pulled. Plugins will not be processed.", service, repo)
                errors.append("Repository was unable to be scanned. Please contact support with the scan id.")
        finally:
            # Make sure we always clean up
            cleanup(WORKING_DIR, str(engine_processor.get_scan_id()))
            cleanup_images(images.get("results"))

        log.info("Scan %s of %s completed", engine_processor.action_details.scan_id, repo)
    engine_processor.update_scan_status("completed", end_time=get_utc_datetime(), errors=errors, debug=debug)
    engine_processor.queue_callback("completed")
    refresh_log_state()


def cleanup(working_dir, scan_id):
    try:
        shutil.rmtree(os.path.join(working_dir, scan_id))
    except FileNotFoundError:
        # If path doesn't exist our work is done
        pass


def main():
    if not (TASK_QUEUE and PRIORITY_TASK_QUEUE):
        log.error("No task queues defined")
        return

    # Import EngineManager here to only include DB stuff during normal engine operation (instead of unit testing)
    from manager.manager import EngineManager  # pylint: disable=import-outside-toplevel

    manager = EngineManager(INSTANCE_ID, ENGINE_ID)
    if manager._engine is None:
        # Failed to initialize
        manager.set_instance_health()
        manager.terminate_instance()
        return

    while True:
        try:
            if manager.maintenance_mode():
                # Skip the shutdown check and polling the queues
                log.debug("Skipping shutdown check and queue polling while in maintenance mode")

                # Sleep for awhile so the loop doesn't just spin
                sleep(DEFAULT_POLL_WAIT + PRIORITY_POLL_WAIT)

                # Continue so that we don't hit the database at all
                continue

            if manager.shutdown_requested():
                # Shutting down so break out of the polling loop
                break

            # Poll the priority queue for a task
            msg = poll(PRIORITY_TASK_QUEUE, wait_time=PRIORITY_POLL_WAIT)
            if msg:
                # The priority queue had a task so process it and then continue
                # so that the priority queue gets polled again.
                Logger.add_fields(priority_queue=True)
                process(msg, manager)
                continue

            # Polling the priority queue timed out with no message so poll the
            # regular task queue for a task.
            msg = poll(TASK_QUEUE)
            if msg:
                Logger.add_fields(priority_queue=False)
                process(msg, manager)

        except Exception as e:  # pylint: disable=broad-except
            # Catch everything so that an error doesn't kill the engine
            # but log the exception with stack trace so it can be
            # investigated.
            log.exception("Error: %s", e)

    manager.set_instance_health()
    manager.terminate_instance()


if __name__ == "__main__":
    refresh_log_state()
    log.info("Starting DSO analysis engine")
    log.info("Host ID: %s, Engine ID: %s", INSTANCE_ID, ENGINE_ID)
    main()
    log.info("Stopping DSO analysis engine")
