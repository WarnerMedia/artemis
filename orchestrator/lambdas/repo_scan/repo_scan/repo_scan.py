# pylint: disable=no-name-in-module, no-member
import json
import os
from collections import namedtuple
from datetime import datetime
from typing import Any, Optional
from aws_lambda_powertools import Logger
from aws_lambda_powertools.utilities.typing import LambdaContext

from heimdall_utils.aws_utils import get_analyzer_api_key, send_analyzer_request
from heimdall_utils.utils import JSONUtils, get_ttl_expiration
from heimdall_utils.env import APPLICATION
from repo_scan.aws_connect import (
    batch_update_db,
    delete_processed_messages,
    get_queue_size,
    get_sqs_message,
    send_sqs_message,
)

ARTEMIS_API = os.environ.get("ARTEMIS_API")
API_KEY_LOC = os.environ.get("ARTEMIS_API_KEY")
DEFAULT_PLUGINS = ["gitsecrets", "base_images"]
PROCESSED_MESSAGES = namedtuple("processed_messages", ["repos", "receipt_handles"])
REPO_QUEUE = os.environ.get("REPO_QUEUE")
REPO_DLQ = os.environ.get("REPO_DEAD_LETTER_QUEUE")
SCAN_TABLE_NAME = os.environ.get("SCAN_TABLE") or ""

log = Logger(service=APPLICATION, name="repo_scan")
json_utils = JSONUtils(log)


@log.inject_lambda_context
def run(event: dict[str, Any] = None, context: LambdaContext = None, size: int = 20) -> Optional[list[dict[str, Any]]]:
    # Get the size of the REPO_QUEUE
    message_num = get_queue_size(REPO_QUEUE)
    if message_num == 0:
        # No messages available so abort
        return None

    api_key = get_analyzer_api_key(API_KEY_LOC)

    # Pull no more than 20 repos off the queue
    repos = []

    while len(repos) < size:
        messages = get_sqs_message(REPO_QUEUE)
        processed_messages = process_messages(messages)
        if processed_messages.receipt_handles:
            delete_processed_messages(REPO_QUEUE, processed_messages.receipt_handles)
        if processed_messages.repos:
            repos += processed_messages.repos
        else:
            # If there were no repos the queue must be empty so move on
            break

    if repos:
        return submit_repos(repos, ARTEMIS_API, api_key)


def process_messages(messages: list) -> namedtuple:
    """
    Takes a list of messages, converts the json body to a dict, and returns the message dicts and handles
    """
    repos = []
    receipt_handles = []

    log.debug("Received %d repos", len(messages))
    for msg in messages:
        response_dict = json_utils.get_json_from_response(msg.get("Body"))
        if response_dict:
            repos.append(response_dict)
        if msg.get("ReceiptHandle"):
            receipt_handles.append(msg.get("ReceiptHandle"))
    return PROCESSED_MESSAGES(repos, receipt_handles)


def submit_repos(repos: list, analyzer_url: str, api_key: str) -> list:
    """
    Takes the repo list, converts them into a json readable by Analyzer,
    and sends each request to Analyzer.
    """
    all_success = []
    all_scan_items = []

    requests_by_service = construct_repo_requests(repos)
    for service, request_items in requests_by_service["reqs"].items():
        log.append_keys(version_control_service=service)
        log.info("Submitting %d repos for %s", len(request_items), service)

        url = f"{analyzer_url}/{service}"
        response = send_analyzer_request(url, api_key, request_items)

        repo_dict = {}
        response_dict = json_utils.get_json_from_response(response.text)
        success = is_status_successful(response.status_code)
        if not success:
            error_response = handle_error_response(response.status_code, response.text)
            log.error(error_response)
        if success or response.status_code == 207:
            repo_dict = get_repo_scan_items(service, response.text)
            all_scan_items.extend(repo_dict["scan_items"])
        if response.status_code == 504:
            log.error("Artemis API Timed out")
            requeue_failed_repos(service, requests_by_service["req_lookup"][service], request_items)
        if "failed" in response_dict:
            requeue_failed_repos(service, requests_by_service["req_lookup"][service], response_dict["failed"])
        all_success.append({"service": service, "repos": repo_dict.get("repos"), "success": success})
    batch_update_db(SCAN_TABLE_NAME, all_scan_items)
    return all_success


def requeue_failed_repos(service: str, repo_lookup: dict[str, Any], failed_repos: list):
    """
    Send failed repos to the repo-dead-letter SQS queue
    """
    repos_to_queue = []
    index = 0
    count = 0
    for failed_repo in failed_repos:
        error_msg = failed_repo.get("error", "")
        if error_msg.startswith("Could not resolve to a Repository with the name"):
            log.info("Skipping deleted branch")
            continue
        repo_info = repo_lookup.get(failed_repo.get("repo", ""), failed_repo)
        repo_info["service"] = service
        if not repo_info:
            continue
        repos_to_queue.append({"Id": str(index), "MessageBody": json.dumps(repo_info)})
        index += 1
        if index >= 10:
            if not send_sqs_message(REPO_DLQ, repos_to_queue):
                log.error("There was an error queueing the repos, aborting.")
                return
            count += index
            index = 0
            repos_to_queue = []
    if index > 0:
        count += index
        send_sqs_message(REPO_DLQ, repos_to_queue)

    log.info(f"Sending {count} repos to the repo-deadletter Queue")


def get_repo_scan_items(service, response, date=None):
    repos = {}
    scan_items = []
    response_dict = json_utils.get_json_from_response(response)
    if not response_dict:
        return None
    if "queued" not in response_dict:
        return None
    if not date:
        date = str(datetime.now().date())
    ttl_expiration = get_ttl_expiration()
    for repo in response_dict.get("queued"):
        repo_list = repo.split("/")
        scan_id = repo_list[-1]
        repo_name = "/".join(repo_list[:-1])
        scan_items.append(
            {"scan_id": scan_id, "create_date": date, "service": service, "repo": repo_name, "expires": ttl_expiration}
        )
        repos[repo_name] = scan_id
    return {"repos": repos, "scan_items": scan_items}


def construct_repo_requests(repos: list) -> dict:
    reqs = {}
    req_lookup = {}
    for repo in repos:
        if not validate_repo(repo):
            continue
        service = repo.get("service", "github")
        if service not in reqs:
            reqs[service] = []
            req_lookup[service] = {}
        req = {
            "repo": repo["repo"],
            "org": repo["org"],
            "plugins": repo.get("plugins") or DEFAULT_PLUGINS,
            "batch_priority": True,
            "batch_id": repo.get("batch_id"),
        }
        if "branch" in repo and repo["branch"] != "HEAD":
            req["branch"] = repo["branch"]
        reqs[service].append(req)
        req_lookup[service][f'{repo["org"]}/{repo["repo"]}'.lower()] = req
    return {"reqs": reqs, "req_lookup": req_lookup}


def validate_repo(repo: dict or None) -> bool:
    if not repo:
        log.error(
            "Repository request was null. Empty Messages are being received "
            "from repo_queue and not being caught in process_messages()."
        )
        return False
    if "repo" not in repo:
        log.error("Malformed Repository request: missing repo. %s", repo)
        return False
    if "org" not in repo:
        log.error("Malformed Repository request: missing org. %s", repo)
        return False
    return True


def handle_error_response(status_code: int, response_text: str) -> str or list:
    """
    Currently only handles non-200 responses.
    We may want to gather all response queue lists if the status is 200.
    :return: bool, str or list
    the bool tells if the response was good (a 200) or a failure (not 200)
    str or list is the error value if the response was not good.
    """
    message_prefix = f"HTTP {status_code}:"
    response_dict = json_utils.get_json_from_response(response_text)
    if not response_dict:
        return f"{message_prefix} {response_text}"
    if "message" in response_dict:
        return f"{message_prefix} {response_dict['message']}"
    if "failed" in response_dict:
        return f"{message_prefix} {response_dict['failed']}"
    return f"{message_prefix} {response_dict}"


def is_status_successful(status_code) -> bool:
    return status_code == 200
