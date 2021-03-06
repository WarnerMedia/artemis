import json
import os
import subprocess
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Tuple

import boto3
from botocore.exceptions import ClientError
from django.db.models import Q

from artemislib.logging import Logger
from artemislib.util import dict_eq
from env import ECR, ENGINE_DIR, ENGINE_ID, HOST_WORKING_DIR, PLUGIN_JAVA_HEAP_SIZE, REGION, SQS_ENDPOINT

log = Logger(__name__)


@dataclass
class Result:
    name: str
    type: str
    success: bool
    truncated: bool
    details: list
    errors: list
    alerts: list
    debug: list
    disabled: bool = False


@dataclass
class PluginSettings:
    image: str
    disabled: bool
    name: str
    plugin_type: str
    feature: str


def get_engine_vars(repo, depth=None, include_dev=False):
    """
    Returns a json str that can be converted back to a dict by the plugin.
    The object will container information known to the engine
    that may be useful to plugin.
    :param repo:
    :param depth:
    :param include_dev:
    :return:
    """
    return json.dumps(
        {
            "repo": repo,
            "ecr_url": ECR,
            "depth": depth,
            "include_dev": include_dev,
            "engine_id": ENGINE_ID,
            "java_heap_size": PLUGIN_JAVA_HEAP_SIZE,
        }
    )


def get_ecr_login_cmd():
    log.info("Logging into ECR")
    login_command_response = subprocess.run(
        [
            "aws",
            "ecr",
            "get-login",
            "--no-include-email",
            "--region=%s" % REGION,
            "--registry-ids=%s" % ECR.split(".")[0],
        ],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )

    if login_command_response.returncode != 0:
        return None
    return login_command_response.stdout.decode("utf-8").strip().split(" ")


def pull_image(image):
    # Try to pull the latest image
    if execute_docker_pull(image, not ECR):
        # Success, return no error
        return None

    if not ECR:
        return f"Unable to pull image: {image}"

    # Pull failed, probably because ECR auth expired.
    # Get the docker login command from awscli.
    login_command = get_ecr_login_cmd()
    if login_command is None:
        # Getting the ECR login command failed
        return "Unable to get ECR login"

    # Got the ECR login command, now run it
    r = subprocess.run(login_command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False)

    if r.returncode != 0:
        return "Unable to log in to ECR: %s" % r.stderr
    log.info("ECR login successful")

    # Login was succesfully, try pulling the image again
    if not execute_docker_pull(image, True):
        return "Unable to pull image %s" % image

    # Success, return no error
    return None


def execute_docker_pull(image, log_error) -> bool:
    """
    Executes docker pull [image]
    if the return code is not 0, there was an error.
    :param image: name of image to pull
    :param log_error: whether to log the error if pull is unsuccessful
    """
    r = subprocess.run(["docker", "pull", image], stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False)

    if r.returncode != 0:
        if log_error:
            log.error(r.stderr.decode("utf-8"))
        return False
    return True


def get_plugin_settings(plugin) -> PluginSettings:
    plugin_path = os.path.join(ENGINE_DIR, "plugins", plugin)
    settings_path = os.path.join(plugin_path, "settings.json")
    with open(settings_path) as f:
        settings = json.loads(f.read())
        image = settings.get("image").replace("$ECR", ECR)
        if image.startswith("/"):
            image = image[1:]
        return PluginSettings(
            image=image,
            disabled=is_plugin_disabled(settings),
            name=settings.get("name"),
            plugin_type=settings.get("type", "misc"),
            feature=settings.get("feature"),
        )


def is_plugin_disabled(settings: dict) -> bool:
    """Determines whether the plugin is disabled

    The "enabled" key in the plugin's settings.json can be either a boolean value or the name of an environment
    variable (specified by a string starting with $). The environment variable contains either "1" or "0". If "enabled"
    is not set or the ENV VAR is not set the plugin is not disabled. If "enabled" or the ENV VAR is present but set to
    an invalid value the plugin is disabled.
    """
    # Get the enabled setting, with the plugin enabled by default if not set
    enabled = settings.get("enabled", True)

    # If already a boolean, return the inverse (enabled -> disabled)
    if isinstance(enabled, bool):
        return not enabled

    # If enabled is an ENV VAR get it
    if isinstance(enabled, str) and enabled.startswith("$"):
        # Get the value from the specified ENV VAR and invert it, defaulting to enabled if not set
        try:
            return not bool(int(os.environ.get(enabled[1:], "1")))
        except ValueError:
            # Invalid value in the ENV VAR so return disabled
            return True

    # If we get this far then there was an invalid value for the enabled setting and so default to disabled
    return True


def run_plugin(plugin, scan, scan_images, depth=None, include_dev=False, features=None) -> Result:
    if features is None:
        features = {}
    settings = get_plugin_settings(plugin)
    if not settings.image:
        return Result(
            name=settings.name if settings.name else plugin,
            type=settings.plugin_type if settings.plugin_type else "unknown",
            success=True,
            truncated=False,
            details=[],
            errors=[f"Unable to load settings for plugin {settings.name if settings.name else plugin}"],
            alerts=[],
            debug=[],
        )

    if settings.disabled or not features.get(settings.feature, True):
        # The plugin is settings.disabled or requires a feature flag the user does not have enabled
        return Result(
            name=settings.name,
            type=settings.plugin_type,
            success=True,
            truncated=False,
            details=[],
            errors=[],
            alerts=[],
            debug=[f"Plugin {settings.name} is disabled"],
            disabled=True,
        )

    if ECR:
        # Pull the plugin's settings.image
        err = pull_image(settings.image)
        if err:
            return Result(
                name=settings.name,
                type=settings.plugin_type,
                success=False,
                truncated=False,
                details=[],
                errors=[err],
                alerts=[],
                debug=[],
            )

    plugin_command = get_plugin_command(
        scan.scan_id, scan.repo.repo, settings.image, plugin, depth, include_dev, scan_images
    )

    # Run the plugin inside the settings.image
    r = subprocess.run(plugin_command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False)

    log.info("--- Plugin log start ---\n%s", r.stderr.decode("utf-8").strip())  # Inject plugin logs
    log.info("--- Plugin log end ---")

    try:
        plugin_output = json.loads(r.stdout)

        if "event_info" in plugin_output:
            # Process event info by sending them to a locked down SQS queue so that the results can be
            # sent to other systems that need details we otherwise don't want to store.
            if settings.plugin_type == "secrets":
                # Remove the ALed raw secrets from the plugin results. This has to be done now because
                # it can't be done at report time due to the raw secrets not being stored in the DB.
                plugin_output = filter_raw_secrets(scan, plugin_output)
                # Remove the other secrets from what gets sent to the event stream. They don't get
                # removed from the plugin output because they still get stored in the DB.
                filtered_plugin_output = filter_secrets(scan, plugin_output)
                process_event_info(scan, filtered_plugin_output, settings.plugin_type)
            else:
                process_event_info(scan, plugin_output, settings.plugin_type)
        return Result(
            name=plugin_output.get("name", settings.name),
            type=settings.plugin_type,
            success=plugin_output.get("success", False),
            truncated=plugin_output.get("truncated", False),
            details=plugin_output.get("details", []),
            errors=plugin_output.get("errors", []),
            alerts=plugin_output.get("alerts", []),
            debug=plugin_output.get("debug", []),
        )

    except json.JSONDecodeError:
        err_str = r.stdout.decode("utf-8") or "<empty>"
        if "Traceback" in r.stderr.decode("utf-8"):
            # If the plugin output contains a stack trace include the last line in the error
            last_line = r.stderr.decode("utf-8").strip().split("\n")[-1]
            err_str += f" [Error: {last_line}]"
        err = f"Plugin returned invalid output: {err_str}"
        log.error(err)
    return Result(
        name=settings.name,
        type=settings.plugin_type,
        success=False,
        truncated=False,
        details=[],
        errors=[err] if err else [],
        alerts=[],
        debug=[],
    )


def process_event_info(scan, results, plugin_type):
    log.info("Processing event info")
    timestamp = get_iso_timestamp()
    if plugin_type == "secrets":
        for item in results.get("details", []):
            payload = {
                "timestamp": timestamp,
                "type": plugin_type,
                "service": scan.repo.service,
                "repo": scan.repo.repo,
                "branch": scan.ref,
                "last-commit-timestamp": scan.branch_last_commit_timestamp,
                "filename": item["filename"],
                "line": item["line"],
                "commit": item["commit"],
                "author": item["author"],
                "author-timestamp": item["author-timestamp"],
                "details": results["event_info"][item["id"]],
            }
            queue_event(scan.repo.repo, plugin_type, payload)
    elif plugin_type == "inventory":
        payload = {
            "timestamp": timestamp,
            "type": plugin_type,
            "service": scan.repo.service,
            "repo": scan.repo.repo,
            "branch": scan.ref,
            "details": results["event_info"],
        }
        queue_event(scan.repo.repo, plugin_type, payload)


def queue_event(repo, plugin_type, payload):
    log.info("Queuing %s event for %s", plugin_type, repo)
    try:
        sqs = boto3.client("sqs", endpoint_url=SQS_ENDPOINT, region_name=REGION)
        sqs.send_message(QueueUrl=os.environ.get("EVENT_QUEUE"), MessageBody=json.dumps(payload))
    except ClientError:
        log.error("Unable to queue %s event for %s", plugin_type, repo)


def get_secret_raw_wl(scan):
    # Get the non-expired secret_raw whitelist for the repo and convert it into a list of the whitelisted strings
    from artemisdb.artemisdb.consts import AllowListType  # pylint: disable=import-outside-toplevel

    wl = []
    for item in scan.repo.allowlistitem_set.filter(
        Q(item_type=AllowListType.SECRET_RAW.value),
        Q(expires=None) | Q(expires__gt=datetime.utcnow().replace(tzinfo=timezone.utc)),
    ):
        wl.append(item.value["value"])
    return wl


def get_secret_al(scan):
    # Get the non-expired secret whitelist for the repo and convert it into a list
    from artemisdb.artemisdb.consts import AllowListType  # pylint: disable=import-outside-toplevel

    return scan.repo.allowlistitem_set.filter(
        Q(item_type=AllowListType.SECRET.value),
        Q(expires=None) | Q(expires__gt=datetime.utcnow().replace(tzinfo=timezone.utc)),
    )


def filter_raw_secrets(scan, plugin_output):
    # Get the raw secrets whitelists for this repo as a list of strings
    secret_al = get_secret_raw_wl(scan)

    details = plugin_output.get("details", [])
    event_info = plugin_output.get("event_info", {})

    # Details that are not whitelisted will go into this list
    filtered_details = []

    # Loop through the original details
    for item in details:
        # Check the event info against the whitelist and track the ones not allowlisted
        valid = match_nonallowlisted_raw_secrets(secret_al, event_info[item["id"]]["match"])

        if not valid:
            # No non-whitelisted event info so this entire detail item is
            # whitelisted
            log.debug("Filtering out raw secret %s", item["id"])
            del event_info[item["id"]]
        else:
            # There was non-whitelisted event info so add the detail item to
            # the filtered list
            filtered_details.append(item)
            event_info[item["id"]]["match"] = valid

    # Set the plugin output to have the filtered info
    plugin_output["details"] = filtered_details
    plugin_output["event_info"] = event_info

    return plugin_output


def filter_secrets(scan, plugin_output):
    # Get the secrets whitelists for this repo
    secret_al = get_secret_al(scan)

    details = plugin_output.get("details", [])
    event_info = plugin_output.get("event_info", {})

    # Details that are not whitelisted will go into this list
    filtered_details = []
    filtered_event_info = {}

    # Loop through the original details
    for item in details:
        # Check the event info against the whitelist and track the ones not allowlisted
        if match_nonallowlisted_secrets(secret_al, item):
            # There was non-whitelisted event info so add the detail item to
            # the filtered list
            filtered_details.append(item)
            filtered_event_info[item["id"]] = event_info[item["id"]]
        else:
            log.debug("Filtering out secret %s", item["id"])

    return {"details": filtered_details, "event_info": event_info}


def match_nonallowlisted_raw_secrets(allowlist: list, matches: Tuple[str, list]) -> list:
    if not isinstance(matches, list):
        matches = [matches]

    valid = []
    for match in matches:
        for al_item in allowlist:
            if al_item in match:
                break
        else:
            # No AL items were a substring of the match
            valid.append(match)

    return valid


def match_nonallowlisted_secrets(allow_list, item):
    for al in allow_list:
        if dict_eq(al.value, item, ["filename", "line", "commit"]):
            # Item matches AL so return False so it gets filtered out
            return False
    # Item does not match AL so return True so it gets included
    return True


def get_iso_timestamp():
    return datetime.utcnow().replace(tzinfo=timezone.utc).isoformat(timespec="microseconds")


def get_plugin_command(scan_id, repo, image, plugin, depth, include_dev, scan_images):

    profile = os.environ.get("AWS_PROFILE")
    cmd = [
        "docker",
        "run",
        "--rm",
        "--name",
        f"plugin-{ENGINE_ID}",
        "--volumes-from",
        ENGINE_ID,
        "-v",
        "%s:/work" % os.path.join(HOST_WORKING_DIR, str(scan_id)),
    ]
    if profile:
        # When running locally AWS_PROFILE may be set. If so, pass the credentials and profile name down to the plugin
        # container. Also pass down the local DB connection info.
        cmd.extend(
            [
                "-v",
                ("%s/.aws/credentials:/root/.aws/credentials:ro" % os.environ.get("HOST_HOME", "/root")),
                "-e",
                "AWS_PROFILE=%s" % profile,
                "-e",
                f"ANALYZER_DJANGO_SECRET_KEY={os.environ.get('ANALYZER_DJANGO_SECRET_KEY', '')}",
                "-e",
                f"ANALYZER_DB_NAME={os.environ.get('ANALYZER_DB_NAME', '')}",
                "-e",
                f"ANALYZER_DB_USERNAME={os.environ.get('ANALYZER_DB_USERNAME', '')}",
                "-e",
                f"ANALYZER_DB_PASSWORD={os.environ.get('ANALYZER_DB_PASSWORD', '')}",
                "-e",
                f"ANALYZER_DB_HOST={os.environ.get('ANALYZER_DB_HOST', '')}",
                "-e",
                f"ANALYZER_DB_PORT={os.environ.get('ANALYZER_DB_PORT', '')}",
                "--network",
                os.environ.get("ARTEMIS_NETWORK", "default"),
            ]
        )
    else:
        # When running in AWS set the ARNs for getting the DB connection info
        cmd.extend(
            [
                "-e",
                f"ANALYZER_DJANGO_SECRETS_ARN={os.environ.get('ANALYZER_DJANGO_SECRETS_ARN', '')}",
                "-e",
                f"ANALYZER_DB_CREDS_ARN={os.environ.get('ANALYZER_DB_CREDS_ARN', '')}",
            ]
        )
    cmd.extend(
        [
            "-e",
            "PYTHONPATH=/srv",
            image,
            "python",
            "/srv/engine/plugins/%s/main.py" % plugin,
            get_engine_vars(repo, depth=depth, include_dev=include_dev),
            json.dumps(scan_images),
        ]
    )

    return cmd


def get_plugin_list():
    return sorted([e.name for e in os.scandir(os.path.join(ENGINE_DIR, "plugins")) if e.name != "lib" and e.is_dir()])
