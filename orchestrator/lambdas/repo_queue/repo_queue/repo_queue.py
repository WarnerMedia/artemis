# pylint: disable=no-name-in-module, no-member
import json
from itertools import zip_longest

from botocore.exceptions import ClientError

from heimdall_utils.aws_utils import get_analyzer_api_key, get_heimdall_secret, get_sqs_connection
from heimdall_utils.env import API_KEY_LOC
from heimdall_utils.get_services import get_services_dict
from heimdall_utils.utils import Logger
from heimdall_utils.variables import REGION
from repo_queue.repo_queue_env import ORG_QUEUE, REPO_QUEUE, SERVICE_PROCESSORS


log = Logger(__name__)


def run(event=None, _context=None, services_file=None) -> None:
    full_services_dict = get_services_dict(services_file)
    services = full_services_dict.get("services")
    artemis_api_key = get_analyzer_api_key(API_KEY_LOC)
    for item in event["Records"]:
        data = json.loads(item["body"])
        plugins = data.get("plugins")
        default_branch_only = data.get("default_branch_only", False)
        repos = query(
            data["service"],
            data["org"],
            services.get(data["service"]),
            data["page"],
            default_branch_only,
            plugins,
            full_services_dict["external_orgs"],
            data.get("batch_id"),
            artemis_api_key,
            data.get("redundant_scan_query"),
        )
        log.info(f"Queuing {len(repos)} repos+branches...")
        i = 0
        for repo_group in group(repos, 10):
            i += queue_repo_group(repo_group, plugins, data.get("batch_id"))
            if i >= 100:
                log.info(f"{i} queued")
                i = 0

        if i != 0:
            log.info(f"{i} queued")


def group(iterable, n, fillvalue=None):
    args = [iter(iterable)] * n
    return zip_longest(*args, fillvalue=fillvalue)


def query(
    service,
    org,
    service_dict,
    page,
    default_branch_only,
    plugins,
    external_orgs,
    batch_id: str,
    artemis_api_key: str,
    redundant_scan_query: dict,
    branch_cursor: str,
    repo: str,
) -> list:
    """Retrieves a list of repository events to send to the Repo SQS Queue"""
    if not service_dict:
        log.error(f"Service {service} was not found and therefore deemed unsupported")
        return []
    api_key = get_api_key(service_dict.get("secret_loc"))
    if not api_key:
        log.error(f"Could not retrieve Service {service} api key.")
        return []
    cursor = page["cursor"]

    service_type = service_dict.get("type")
    if service_type not in SERVICE_PROCESSORS:
        log.warning(f"Unable to Process Service: {service}")
        return []

    service_processor = SERVICE_PROCESSORS[service_type](
        queue=ORG_QUEUE,
        service=service,
        org=org,
        service_dict=service_dict,
        api_key=api_key,
        repo_cursor=cursor,
        default_branch_only=default_branch_only,
        plugins=plugins,
        external_orgs=external_orgs,
        batch_id=batch_id,
        artemis_api_key=artemis_api_key,
        redundant_scan_query=redundant_scan_query,
        branch_cursor=branch_cursor,
        repo=repo,
    )

    return service_processor.query()


def queue_repo_group(repo_group: iter, plugins: list, batch_id: str) -> int:
    batch = []
    i = 0
    for repo in repo_group:
        if repo is None:
            continue
        repo["plugins"] = plugins
        repo["batch_id"] = batch_id
        batch.append({"Id": str(i), "MessageBody": json.dumps(repo)})
        i += 1
    try:
        sqs = get_sqs_connection(REGION)
        sqs.send_message_batch(QueueUrl=REPO_QUEUE, Entries=batch)
    except ClientError as e:
        log.error(f"Unable to queue repos: {repo_group} {str(e)}")
        return 0

    return len(batch)


def get_api_key(service_secret_str: str) -> None or str:
    log.info("getting service API key")
    secret = get_heimdall_secret(service_secret_str)
    return secret.get("key")
