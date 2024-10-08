import json
from enum import Enum
import os
import subprocess
from dataclasses import dataclass
from datetime import datetime, timezone
from fnmatch import fnmatch
from typing import Optional, Union
from urllib.parse import quote_plus

import boto3
from botocore.exceptions import ClientError
from django.db.models import Q
from django.db import transaction
from pydantic import BaseModel, Field, field_validator

from artemisdb.artemisdb.models import PluginConfig, SecretType, PluginType, Scan
from artemislib.github.app import GITHUB_APP_ID
from artemislib.logging import Logger, LOG_LEVEL, inject_plugin_logs
from artemislib.util import dict_eq
from env import (
    ECR,
    ENGINE_DIR,
    ENGINE_ID,
    HOST_WORKING_DIR,
    PLUGIN_JAVA_HEAP_SIZE,
    PROCESS_SECRETS_WITH_PATH_EXCLUSIONS,
    REGION,
    SQS_ENDPOINT,
    APPLICATION,
    REV_PROXY_DOMAIN_SUBSTRING,
    REV_PROXY_SECRET,
    REV_PROXY_SECRET_REGION,
    REV_PROXY_SECRET_HEADER,
    SECRETS_EVENTS_ENABLED,
    INVENTORY_EVENTS_ENABLED,
    CONFIGURATION_EVENTS_ENABLED,
    VULNERABILITY_EVENTS_ENABLED,
)
from engine.plugins.lib.utils import validate_plugin_name

log = Logger(__name__)

UI_SECRETS_TAB_INDEX = 3


class Runner(str, Enum):
    """
    Defines which method will be used to run a plugin.

    There is only a single method currently; this is a placeholder for future experiments
    and is validated to catch accidental incompatibilities.
    """

    CORE = "core"
    """Run the plugin using the container's system Python."""

    BOXED = "boxed"
    """Run the self-contained plugin bundle."""


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


class PluginSettings(BaseModel):
    """
    Plugin description, loaded from the settings.json of the plugin.

    Only the "name" field is required, all other fields are optional.
    """

    name: str
    image: str = ""
    disabled: bool = Field(alias="enabled", default=False)
    plugin_type: str = Field(alias="type", default="misc")
    build_images: bool = False
    feature: Optional[str] = None
    timeout: Optional[int] = None
    runner: Runner = Runner.CORE

    @field_validator("image", mode="after")
    @classmethod
    def _parse_image(cls, orig: str) -> str:
        image = orig.replace("$ECR", ECR)

        if image.startswith("/"):
            image = image[1:]

        return image

    @field_validator("disabled", mode="before")
    @classmethod
    def _parse_disabled(cls, enabled: Union[str, bool]) -> bool:
        """
        Determines whether the plugin is disabled.

        The "enabled" key in the plugin's settings.json can be either a boolean value or the name of an environment
        variable (specified by a string starting with $). The environment variable contains either "1" or "0".

        If "enabled" is not set or the ENV VAR is not set the plugin is not disabled.
        If "enabled" or the ENV VAR is present but set to an invalid value the plugin is disabled.
        """
        # Plugin enabled by default if not set
        if enabled is None:
            return False

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


def get_engine_vars(scan: Scan, depth: Optional[str] = None, include_dev=False, services=None):
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
            "scan_id": str(scan.scan_id),
            "repo": scan.repo.repo,
            "ref": scan.ref,
            "ecr_url": ECR,
            "depth": depth,
            "include_dev": include_dev,
            "engine_id": ENGINE_ID,
            "java_heap_size": PLUGIN_JAVA_HEAP_SIZE,
            "service_name": scan.repo.service,
            "service_type": services[scan.repo.service]["type"],
            "service_hostname": services[scan.repo.service]["hostname"],
            "service_secret_loc": services[scan.repo.service]["secret_loc"],
        }
    )


def get_ecr_login_cmd() -> Optional[list[str]]:
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


def pull_image(image: str):
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


def execute_docker_pull(image: str, log_error: bool) -> bool:
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


def get_plugin_settings(plugin: str) -> PluginSettings:
    """
    Get plugin settings
    """
    plugin_path = os.path.join(ENGINE_DIR, "plugins", plugin)
    settings_path = os.path.join(plugin_path, "settings.json")

    with open(settings_path) as f:
        return PluginSettings.model_validate_json(f.read())


def _get_plugin_config(plugin: str, full_repo: str) -> dict:
    """
    Get plugin config from DB if one exists
    """
    # Order by ID descending (generally, newest will come first)
    plugin_configs = PluginConfig.objects.filter(plugin__name=plugin).order_by("-id")

    # Plugin settings are only applied if the repo matches the scope
    for plugin_config in plugin_configs:
        scopes = plugin_config.scope

        # The first plugin config with a matching scope will be used.
        # If creating multiple plugin configs for a single plugin,
        # there should be no overlap in scopes.
        for scope in scopes:
            if fnmatch(full_repo, scope):
                return plugin_config.config

    # If no match found, return empty dict
    return {}


def run_plugin(
    plugin: str,
    scan: Scan,
    scan_images,
    depth: Optional[str] = None,
    include_dev=False,
    features=None,
    services=None,
) -> Result:
    log.info("--- Plugin log start ---")
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

    # Get plugin config from DB if one exists and is applicable to this repo
    full_repo = f"{scan.repo.service}/{scan.repo.repo}"
    plugin_config = _get_plugin_config(plugin, full_repo)

    plugin_command = get_plugin_command(
        scan, plugin, settings, depth, include_dev, scan_images, plugin_config, services
    )

    try:
        # Run the plugin inside the settings.image
        r = subprocess.run(
            plugin_command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False, timeout=settings.timeout
        )
    except subprocess.TimeoutExpired:
        return Result(
            name=settings.name,
            type=settings.plugin_type,
            success=False,
            truncated=False,
            details=[],
            errors=[f"Plugin {settings.name} exceeded maximum runtime ({settings.timeout} seconds)."],
            alerts=[],
            debug=[],
        )

    inject_plugin_logs(r.stderr.decode("utf-8"), plugin)

    log.info("--- Plugin log end ---")

    try:
        plugin_output = json.loads(r.stdout)
        # TODO: Validate plugin output is a dict.

        if "event_info" in plugin_output:
            # Process event info by sending them to a locked down SQS queue so that the results can be
            # sent to other systems that need details we otherwise don't want to store.
            if settings.plugin_type == PluginType.SECRETS.value:
                # Remove the ALed raw secrets from the plugin results. This has to be done now because
                # it can't be done at report time due to the raw secrets not being stored in the DB.
                plugin_output = filter_raw_secrets(scan, plugin_output)
                # Remove the other secrets from what gets sent to the event stream. They don't get
                # removed from the plugin output because they still get stored in the DB.
                filtered_plugin_output = filter_secrets(scan, plugin_output)
                process_event_info(scan, filtered_plugin_output, settings.plugin_type, settings.name)
            else:
                process_event_info(scan, plugin_output, settings.plugin_type, settings.name)

        if settings.plugin_type == PluginType.SECRETS.value:
            _process_secret_types(plugin_output.get("details", []))

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


def process_event_info(scan: Scan, results, plugin_type: str, plugin_name: str):
    log.info("Processing event info")
    timestamp = get_iso_timestamp()
    if plugin_type == PluginType.SECRETS.value and SECRETS_EVENTS_ENABLED:
        if not PROCESS_SECRETS_WITH_PATH_EXCLUSIONS and (scan.include_paths or scan.exclude_paths):
            log.info("Skipping secrets event processing of scan with path inclusions/exclusions")
            return
        for item in results.get("details", []):
            if "/" in scan.repo.repo:
                org, repository = scan.repo.repo.split("/", 1)
            else:
                org = scan.repo.repo
                repository = scan.repo.repo

            payload = {
                "timestamp": timestamp,
                "type": plugin_type,
                "service": scan.repo.service,
                "repo": scan.repo.repo,
                "org": org,
                "repository": repository,
                "plugin": plugin_name,
                "branch": scan.ref,
                "last-commit-timestamp": scan.branch_last_commit_timestamp,
                "filename": item["filename"],
                "line": item["line"],
                "commit": item["commit"],
                "author": item["author"],
                "author-timestamp": item["author-timestamp"],
                "created_at": item.get("created_at", item["author-timestamp"]),
                "details": results["event_info"][item["id"]],
                "state": item.get("state", "open"),
                "validity": item.get("validity", "unknown"),
                "secret_type": results["event_info"][item["id"]]["type"],
                "secret_type_display_name": results["event_info"][item["id"]]["type"],
                "report_url": (
                    f"{scan.report_url}&tab={UI_SECRETS_TAB_INDEX}"  # Report URL + Secrets tab selection
                    f"#st_filename={quote_plus(item['filename'])}"  # Filter on filename
                    f"&st_line={item['line']}"  # Filter on line number
                    f"&st_commit={item['commit']}"  # Filter on commit hash
                    f"&st_resource={results['event_info'][item['id']]['type']}"  # Filter on secrets type
                ),
            }
            queue_event(scan.repo.repo, plugin_type, payload)
    elif plugin_type in PluginType.INVENTORY.value and INVENTORY_EVENTS_ENABLED:
        payload = {
            "timestamp": timestamp,
            "type": plugin_type,
            "service": scan.repo.service,
            "repo": scan.repo.repo,
            "branch": scan.ref,
            "details": results["event_info"],
        }
        queue_event(scan.repo.repo, plugin_type, payload)
    elif plugin_type == PluginType.CONFIGURATION.value and CONFIGURATION_EVENTS_ENABLED:
        for item in results.get("details", []):
            if item["pass"]:  # Skip results that didn't fail
                continue
            payload = {
                "timestamp": timestamp,
                "type": plugin_type,
                "service": scan.repo.service,
                "repo": scan.repo.repo,
                "branch": scan.ref,
                "last-commit-timestamp": scan.branch_last_commit_timestamp,
                "details": results["event_info"][item["id"]],
                "report_url": scan.report_url,
                "plugin_name": plugin_name,
            }
            queue_event(scan.repo.repo, plugin_type, payload)
    elif plugin_type == PluginType.VULN.value and VULNERABILITY_EVENTS_ENABLED:
        for item in results.get("details", []):
            payload = {
                "timestamp": timestamp,
                "type": plugin_type,
                "service": scan.repo.service,
                "repo": scan.repo.repo,
                "branch": scan.ref,
                "details": results["event_info"][item["id"]],
                "report_url": scan.report_url,
            }
            queue_event(scan.repo.repo, plugin_type, payload)


def queue_event(repo: str, plugin_type: str, payload: dict):
    log.info("Queuing %s event for %s", plugin_type, repo)
    try:
        sqs = boto3.client("sqs", endpoint_url=SQS_ENDPOINT, region_name=REGION)
        sqs.send_message(QueueUrl=os.environ.get("EVENT_QUEUE"), MessageBody=json.dumps(payload))
    except ClientError:
        log.error("Unable to queue %s event for %s", plugin_type, repo)


def get_secret_raw_wl(scan):
    # Note: scan type is unspecified until we enable typechecking Django models.
    """
    Get the non-expired secret_raw whitelist for the repo and convert it into
    a list of the whitelisted strings.
    """
    from artemisdb.artemisdb.consts import (
        AllowListType,  # pylint: disable=import-outside-toplevel
    )

    wl = []
    for item in scan.repo.allowlistitem_set.filter(
        Q(item_type=AllowListType.SECRET_RAW.value),
        Q(expires=None) | Q(expires__gt=datetime.utcnow().replace(tzinfo=timezone.utc)),
    ):
        wl.append(item.value["value"])
    return wl


def get_secret_al(scan):
    # Note: scan type is unspecified until we enable typechecking Django models.
    """
    Get the non-expired secret whitelist for the repo and convert it into a list.
    """
    from artemisdb.artemisdb.consts import (
        AllowListType,  # pylint: disable=import-outside-toplevel
    )

    return scan.repo.allowlistitem_set.filter(
        Q(item_type=AllowListType.SECRET.value),
        Q(expires=None) | Q(expires__gt=datetime.utcnow().replace(tzinfo=timezone.utc)),
    )


def filter_raw_secrets(scan: Scan, plugin_output: dict) -> dict:
    """
    Get the raw secrets whitelists for this repo as a list of strings.
    """
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


def filter_secrets(scan: Scan, plugin_output: dict):
    """
    Get the secrets whitelists for this repo.
    """
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


def match_nonallowlisted_raw_secrets(allowlist: list, matches: Union[str, list]) -> list:
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


def get_iso_timestamp() -> str:
    return datetime.utcnow().replace(tzinfo=timezone.utc).isoformat(timespec="microseconds")


def get_plugin_command(
    scan: Scan,
    plugin: str,
    settings: PluginSettings,
    depth: Optional[str],
    include_dev: bool,
    scan_images,
    plugin_config,
    services,
) -> list[str]:
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
        "%s:/work" % os.path.join(HOST_WORKING_DIR, str(scan.scan_id)),
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
                "-e",
                f"APPLICATION={APPLICATION}",
                "-e",
                f"ARTEMIS_REVPROXY_DOMAIN_SUBSTRING={REV_PROXY_DOMAIN_SUBSTRING}",
                "-e",
                f"ARTEMIS_REVPROXY_SECRET={REV_PROXY_SECRET}",
                "-e",
                f"ARTEMIS_REVPROXY_SECRET_REGION={REV_PROXY_SECRET_REGION}",
                "-e",
                f"ARTEMIS_REVPROXY_AUTH_HEADER={REV_PROXY_SECRET_HEADER}",
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
            "-e",
            f"ARTEMIS_GITHUB_APP_ID={GITHUB_APP_ID}",
            "-e",
            f"ARTEMIS_REVPROXY_DOMAIN_SUBSTRING={REV_PROXY_DOMAIN_SUBSTRING}",
            "-e",
            f"ARTEMIS_REVPROXY_SECRET={REV_PROXY_SECRET}",
            "-e",
            f"ARTEMIS_LOG_LEVEL={LOG_LEVEL}",
            settings.image,
        ]
    )

    if settings.runner == Runner.CORE:
        cmd.extend(["python", f"/srv/engine/plugins/{plugin}/main.py"])
    elif settings.runner == Runner.BOXED:
        cmd.extend(["/srv/engine/plugins/plugin.sh", "--quiet", "--", plugin])
    else:
        raise ValueError(f"Runner is not supported: {settings.runner}")

    # Arguments passed to the plugin.
    cmd.extend(
        [
            get_engine_vars(scan, depth=depth, include_dev=include_dev, services=services),
            json.dumps(scan_images),
            json.dumps(plugin_config),
        ]
    )

    return cmd


def get_plugin_list() -> list[str]:
    return sorted(
        [e.name for e in os.scandir(os.path.join(ENGINE_DIR, "plugins")) if validate_plugin_name(e.name) and e.is_dir()]
    )


def _process_secret_types(details: list) -> None:
    if not details:
        # Plugin didn't find anything. Bail without doing anything.
        return

    # Set of types found by this plugin
    new_types = set([item["type"].lower() for item in details])

    # Doing this in a transaction so that we avoid issues when multiple secrets plugins are running
    # simultaneously on different engines since we want the SecretTypes to be unique.
    with transaction.atomic():
        # Get the current secret types as a list
        current_types = set(SecretType.objects.all().values_list("name", flat=True))

        # Add the list of types found by this plugin, excluding the already known types
        for name in new_types - current_types:
            SecretType.objects.create(name=name)
            log.info("Added secret type '%s' to database", name)
