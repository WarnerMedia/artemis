# pylint: disable=no-name-in-module, no-member
import json
from fnmatch import fnmatch
from http import HTTPStatus
from typing import Union

from aws_lambda_powertools import Logger
from aws_lambda_powertools.utilities.typing import LambdaContext

from heimdall_orgs import org_queue_bitbucket, org_queue_gitlab, org_queue_private_github
from heimdall_utils.aws_utils import (
    get_analyzer_api_key,
    get_heimdall_secret,
    queue_service_and_org,
    send_analyzer_request,
)
from heimdall_utils.datetime import format_timestamp, get_utc_datetime
from heimdall_utils.env import ARTEMIS_API, API_KEY_LOC, APPLICATION
from heimdall_utils.get_services import get_services_dict
from heimdall_utils.service_utils import get_service_url
from heimdall_utils.metrics.factory import get_metrics
from heimdall_utils.utils import HeimdallException
from org_queue.org_queue_env import ORG_QUEUE

log = Logger(service=APPLICATION, name="org_queue")
metrics = get_metrics()

FAILED = {}
DEFAULT_PLUGINS = ["gitsecrets", "trufflehog", "base_images"]  # default plugins to use if none are specified


@metrics.log_metrics
@log.inject_lambda_context
def run(event: dict = None, context: LambdaContext = None, services_file: str = None) -> Union[list, dict]:
    full_services_dict = get_services_dict(services_file)
    services = full_services_dict.get("services")
    queued = []
    on_demand = False

    if "body" in event:
        # On-demand scanning requested. This came in through API Gateway so the details are in the body field.
        on_demand = True
        data = json.loads(event.get("body"))
    else:
        # Scheduled scanning. This came from the CloudWatch event target configuration directly.
        data = event or {}  # If called manually with no event default to empty dict

    # Extract the details of the operation or use the defaults
    if data.get("exclude_orgs"):
        for excluded_org in data.get("exclude_orgs"):
            if excluded_org in full_services_dict.get("scan_orgs"):
                full_services_dict.get("scan_orgs").remove(excluded_org)
        orgs = full_services_dict.get("scan_orgs")
    else:
        orgs = data.get("orgs", full_services_dict.get("scan_orgs"))
    org_queue = data.get("org_queue", ORG_QUEUE)
    plugins = data.get("plugins", DEFAULT_PLUGINS)
    default_branch_only = data.get("default_branch_only", False)
    batch_label = data.get("batch_label")
    redundant_scan_query = data.get("redundant_scan_query")

    batch_id = generate_batch_id(batch_label)

    log.append_keys(batch_id=batch_id)
    log.info(f"Queuing the following organizations:\n{orgs}")

    for org in orgs:
        split = org.split("/", maxsplit=1)
        service = split[0]
        org_name = split[1] if len(split) == 2 else None
        # Having a wildcard will start querying an entire service for accessible organizations and their projects
        # that match the wildcard pattern. It would be bad to execute this functionality on a public service like
        # github, gitlab, or bitbucket. If other similar public services are added to services.json, be sure to add
        # the service here as well.
        if not org_name:
            continue
        org_list = get_org_list(services, service, org_name)
        if not org_list:
            continue
        log.debug("Queuing %d service orgs for service %s", len(org_list), service, version_control_service=service)
        for org_name_str in org_list:
            org_result_str = f"{service}/{org_name_str}"
            if not fnmatch(org_name_str, org_name):
                # Org name does not match pattern so skip it
                FAILED[org_result_str] = "Org name does not match pattern"
                continue
            # Org name matches pattern so queue it
            if queue_service_and_org(
                org_queue,
                service,
                org_name_str,
                services[service]["initial_page"],
                default_branch_only,
                plugins,
                batch_id,
                redundant_scan_query,
            ):
                metrics.add_metric(
                    name="queued_organizations.count",
                    value=1,
                    batch_id=batch_id,
                    organization_name=org_name_str,
                    version_control_service=service,
                )
                queued.append(org_result_str)
            else:
                FAILED[org_result_str] = "ClientError occurred while queueing org"

    # return a lambda proxy response if on demand
    if on_demand:
        return formatted_response(msg=queued)
    log.info(f"Final Queued: {queued}")
    log.info(f"Final Failed: {FAILED}")
    metrics.add_metric("failed_organizations.count", len(FAILED), batch_id=batch_id)
    return queued


def get_org_list(services: dict, service: str, org_name: str) -> Union[list, None]:
    if "*" in org_name:
        # Org name has a wildcard pattern so pull all of the orgs from the service
        if not validate_service(services, service, org_name):
            return None
        service_dict = services[service]
        api_key = get_heimdall_secret(service_dict.get("secret_loc")).get("key")
        service_type = service_dict.get("type")
        error_message = f"service {service} of type {service_type} is not supported for wildcard organizations."

        try:
            if service_type == "github":
                api_url = get_service_url(service_dict)
                return org_queue_private_github.GithubOrgs.get_all_orgs(service, api_url, api_key) or []
            if service_type == "gitlab":
                api_url = get_service_url(service_dict, False)
                return org_queue_gitlab.GitlabOrgs.get_groups_and_subgroups(service, api_url, api_key) or []
            if service_type == "bitbucket":
                api_url = get_service_url(service_dict)
                return org_queue_bitbucket.BitbucketOrgs.get_all_orgs(service, api_url, api_key) or []
        except HeimdallException as e:
            error_message = f"Error: {e}"

        log.error(error_message, version_control_service=service)
        FAILED[f"{service}/{org_name}"] = error_message
        return None
    # Turn a single org name into a list to simplify the queuing logic
    return [org_name]


def validate_service(services: dict, service: str, org_name: str) -> bool:
    if service in ["github", "gitlab", "bitbucket"]:
        message = f"public service {service} cannot have a wildcard organization."
        log.error(message, version_control_service=service)
        FAILED[f"{service}/{org_name}"] = message
        return False
    if service not in services:
        message = f"{service} not located in services.json. Skipping"
        log.error(message, version_control_service=service)
        FAILED[f"{service}/{org_name}"] = message
        return False
    return True


def formatted_response(msg=None, code=200):
    """
    Format an API Gateway response
    """
    if msg:
        return {
            "isBase64Encoded": "false",
            "statusCode": code,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps(msg),
        }
    return {"isBase64Encoded": "false", "statusCode": code}


def generate_batch_id(batch_label: str = None) -> Union[str, None]:
    batch_id = None
    api_key = get_analyzer_api_key(API_KEY_LOC)
    description = f"Heimdall Batch Scan {format_timestamp(get_utc_datetime())}"
    if batch_label is not None:
        description += f" ({batch_label})"  # Append the batch label to the description, if present
    r = send_analyzer_request(f"{ARTEMIS_API}/scans/batch", api_key, {"description": description})
    if r.status_code == HTTPStatus.OK:
        batch_id = r.json()["batch_id"]
        log.info("Generated Artemis batch ID: %s (%s)", batch_id, description)
    else:
        log.error("Unable to generate Artemis batch ID [HTTP %s]: %s", r.status_code, r.text)
    return batch_id
