from string import Template

import requests

from artemislib.logging import Logger
from repo.util.aws import AWSConnect
from repo.util.const import PROCESS_RESPONSE_TUPLE
from repo.util.env import DEFAULT_ORG
from repo.util.identity import Identity
from repo.util.utils import (
    auth,
    build_options_map,
    get_api_key,
    get_json_from_response,
    get_object_from_json_dict,
)

log = Logger(__name__)

ADO_API_VERSION = "6.0"
ADO_REPO_QUERY = f"$service_url/$org/$project/_apis/git/repositories/$repo?api-version={ADO_API_VERSION}"
ADO_DIFF_QUERY = (
    "$service_url/$org/$project/_apis/git/repositories/$repo/diffs/commits"
    f"?baseVersion=$base_version&targetVersion=$target_version&api-version={ADO_API_VERSION}"
)


def process_ado(req_list: list, service: str, service_url: str, service_secret: str, identity: Identity):
    options_map = build_options_map(req_list)
    return _query(req_list, options_map, service, service_url, service_secret, identity=identity)


def _query(
    req_list: list, options_map: dict, service: str, service_url: str, service_secret: str, identity: Identity
) -> PROCESS_RESPONSE_TUPLE:
    unauthorized = []
    queued = []
    failed = []
    if not req_list:
        return queued, failed, unauthorized

    # The stored key is already in the basic auth format: base64(user:pass)
    key = get_api_key(service_secret)

    log.info("Querying %s API for %d repos", service, len(req_list))

    for req in req_list:
        branch_name = req.get("branch")
        org_name = req.get("org", DEFAULT_ORG)
        project = req["repo"].split("/", maxsplit=1)[0]
        repo = req["repo"].split("/", maxsplit=1)[1]

        # Validate that this API key is authorized to scan this repo
        allowed = auth(f"{org_name}/{project}/{repo}", service, identity.scope)
        if not allowed:
            unauthorized.append({"repo": f"{service}/{org_name}/{project}/{repo}", "error": "Not Authorized"})
            continue

        # Query the Azure API for the repo
        response = _get_repo(service_url, org_name, project, repo, key)

        log.info("Got API response")

        repo_dict = get_json_from_response(response.text)

        # If there was an issue querying the repo, note the error (if possible), and continue
        error = _get_api_response_error(response.status_code, repo_dict)
        if error:
            failed.append({"repo": repo, "error": error})
            log.error("Error with %s: %s", repo, error)
            continue

        if branch_name and not _verify_branch_exists(repo_dict["_links"]["refs"]["href"], branch_name, key):
            # If we queried for a branch but no branch was returned fail the repo
            failed.append({"repo": repo, "error": "Branch not found"})
            log.error("Error with %s/%s: branch could not be found: %s", service, repo, branch_name)
            continue

        org_repo = f"{org_name}/{project}/{repo}".lower()
        if options_map[org_repo]["diff_base"]:
            # The scan has a diff base set so check whether it's a valid diff comparison
            compare = branch_name or "HEAD"
            if not _check_diff(service_url, key, org_name, project, repo, options_map[org_repo]["diff_base"], compare):
                # Diff specification is not valid.
                failed.append({"repo": repo, "error": "Diff base is not a valid comparison"})
                continue

        log.info("Queuing repo")

        scan_id = _queue_repo(service, org_repo, repo_dict, branch_name, options_map[org_repo], identity=identity)
        full_scan_id = f"{org_repo}/{scan_id}"
        queued.append(full_scan_id)
        log.info("Queued %s", full_scan_id)

    return PROCESS_RESPONSE_TUPLE(queued, failed, unauthorized)


def _get_repo(url: str, org_name: str, project: str, repo: str, api_key: str) -> requests.Response:
    req = Template(ADO_REPO_QUERY).substitute(service_url=url, org=org_name, project=project, repo=repo)
    return _query_azure_api(req, api_key)


def _verify_branch_exists(refs_url: str, branch: str, api_key: str) -> bool:
    req = f"{refs_url}?filter=heads/{branch}&api-version={ADO_API_VERSION}"
    response = _query_azure_api(req, api_key)
    if response.status_code != 200:
        return False

    # The filter is a "starts with" so we have to look for the exact name in the returned refs
    for ref in response.json()["value"]:
        if ref["name"] == f"refs/heads/{branch}":
            return True

    return False


def _check_diff(url: str, api_key: str, org_name: str, project: str, repo: str, base: str, compare: str) -> bool:
    req = Template(ADO_DIFF_QUERY).substitute(
        service_url=url, org=org_name, project=project, repo=repo, base_version=base, target_version=compare
    )
    response = _query_azure_api(req, api_key)
    if response.status_code != 200:
        return False

    if response.json().get("changeCounts"):
        return True

    return False


def _query_azure_api(url: str, api_key: str) -> requests.Response:
    headers = {"Authorization": "Basic %s" % api_key, "Accept": "application/json"}
    response = requests.get(url, headers=headers)
    if response.status_code != 200:
        log.error("Error retrieving Azure query: %s", response.text)
    return response


def _get_api_response_error(status_code: int, response_dict: dict or None) -> str or None:
    default_error = "Unknown error"
    if status_code == 200:
        return None
    if response_dict:
        return get_object_from_json_dict(response_dict, ["message"]) or default_error
    return default_error


def _queue_repo(service: str, org_repo: str, repo: dict, branch_name: str, options: dict, identity: Identity) -> str:
    # Queue the repo
    scan_id = AWSConnect().queue_repo_for_scan(
        name=org_repo,
        repo_url=repo["remoteUrl"],
        # We need to convert from bytes to KiB
        repo_size=int(repo["size"] / 1024),
        service=service,
        public=repo["project"]["visibility"] == "public",
        plugins=options["plugins"],
        depth=options["depth"],
        branch=branch_name,
        include_dev=options["include_dev"],
        callback_url=options["callback_url"],
        client_id=options["client_id"],
        batch_priority=options["batch_priority"],
        identity=identity,
        categories=options["categories"],
        diff_base=options["diff_base"],
        schedule_run=options["schedule_run"],
        batch_id=options["batch_id"],
        include_paths=options["include_paths"],
        exclude_paths=options["exclude_paths"],
    )
    return scan_id
