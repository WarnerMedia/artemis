from datetime import datetime, timezone

from django.db.models import Q

from artemisdb.artemisdb.consts import NOT_RUNNING_STATUSES, EngineState, ScanStatus
from artemisdb.artemisdb.models import Engine, Scan
from artemislib.datetime import get_utc_datetime
from scale_down.const import DetailType


def update_running_scans(instance_id):
    objects = (
        # Scans that were running on the terminated EC2 instance. Have to check both worker and engine for compatiblilty
        # with scans that were created prior to the switch to Engine objects.
        Scan.objects.filter(Q(worker__startswith=instance_id) | Q(engine__engine_id__startswith=instance_id))
        .exclude(status__in=NOT_RUNNING_STATUSES)  # And were not already in a post-scan state
        .update(
            status=ScanStatus.TERMINATED.value,  # Set status to "terminated"
            errors=["One or more plugins were unable to execute. Please try again."],  # Give some direction
            end_time=datetime.utcnow().replace(tzinfo=timezone.utc),  # Set the end time
        )
    )
    if objects > 0:
        print(f"{objects} scans set as terminated on instance {instance_id}")
    else:
        print(f"No scans in progress, no records altered for instance {instance_id}")


def update_running_engines(instance_id):
    objects = (
        Engine.objects.filter(
            engine_id__startswith=instance_id
        )  # Engines that were running on the terminated EC2 instance
        .exclude(state__in=[EngineState.SHUTDOWN.value, EngineState.TERMINATED.value])  # And were not already stopped
        .update(
            state=EngineState.TERMINATED.value,  # Set state to "terminated"
            shutdown_time=get_utc_datetime(),  # Set shutdown time
        )
    )
    if objects > 0:
        print(f"{objects} engines set as terminated on instance {instance_id}")
    else:
        print(f"No engines running or pending shutdown, no records altered for instance {instance_id}")


def request_engine_shutdown(instance_id):
    objects = Engine.objects.filter(
        engine_id__startswith=instance_id, state=EngineState.RUNNING.value
    ).update(  # Engines that are running on the terminating EC2 instance
        state=EngineState.SHUTDOWN_REQUESTED.value,  # Set state to "shutdown_requested"
    )
    if objects > 0:
        print(f"{objects} engines requested to shutdown on instance {instance_id}")
    else:
        print(f"No engines running, no records altered for instance {instance_id}")


def handler(event, _):  # context parameter is not used
    instance_id = event["detail"]["EC2InstanceId"]
    if event["detail-type"] == DetailType.TERMINATE_ACTION.value:
        # EC2 instance has been selected for scale down. Tell all of the engines running on it to gracefully shut down
        request_engine_shutdown(instance_id)
    elif event["detail-type"] in [DetailType.TERMINATE_SUCCESS.value, DetailType.TERMINATE_UNSUCCESS.value]:
        # EC2 instance was terminated. Mark all of the engines that didn't gracefully shutdown and all of their scans
        # as terminated.
        update_running_engines(instance_id)
        update_running_scans(instance_id)
    else:
        print(f"Detail-type Unknown: {event['detail-type']}")


#################################
# Local testing code follows... #
#################################


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--instance-id", type=str, help="EC2 instance ID to simulate")
    detail_type_group = parser.add_mutually_exclusive_group()
    detail_type_group.add_argument(
        "--terminate-action", action="store_true", required=False, help="TERMINATE_ACTION event type"
    )
    detail_type_group.add_argument(
        "--terminate-success", action="store_true", required=False, help="TERMINATE_SUCCESS event type"
    )
    detail_type_group.add_argument(
        "--terminate-unsuccess", action="store_true", required=False, help="TERMINATE_UNSUCCESS event type"
    )
    args = parser.parse_args()

    detail_type = None
    if args.terminate_action:
        detail_type = DetailType.TERMINATE_ACTION.value
    elif args.terminate_success:
        detail_type = DetailType.TERMINATE_SUCCESS.value
    elif args.terminate_unsuccess:
        detail_type = DetailType.TERMINATE_UNSUCCESS.value

    # Build the test event
    event = {"detail": {"EC2InstanceId": args.instance_id}, "detail-type": detail_type}

    # Call the handler with the test event
    handler(event, None)
