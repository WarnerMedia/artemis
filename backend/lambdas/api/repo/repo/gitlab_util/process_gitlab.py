from repo.gitlab_util.process_gitlab_utils import (
    build_queries,
    process_query_list,
    check_diff,
    queue_gitlab_repository,
)
from repo.util.const import PROCESS_RESPONSE_TUPLE
from repo.util.utils import build_options_map, get_api_key
from artemislib.logging import Logger

log = Logger(__name__)


def process_gitlab(req_list, service, service_url, service_secret, batch_queries, nat_connect, identity, diff_url):
    options_map = build_options_map(req_list)
    query_list, variables, query_map, unauthorized = build_queries(req_list, identity.scope, service, batch_queries)
    queued, failed = _query(
        query_list,
        variables,
        query_map,
        options_map,
        service,
        service_url,
        service_secret,
        batch_queries,
        nat_connect,
        identity=identity,
        diff_url=diff_url,
    )

    return PROCESS_RESPONSE_TUPLE(queued, failed, unauthorized)


def _query(
    query_list,
    variables,
    query_map,
    options_map,
    service,
    service_url,
    service_secret,
    batch_queries,
    nat_connect,
    identity,
    diff_url,
):
    queued = []
    failed = []
    if not query_list:
        return queued, failed

    key = get_api_key(service_secret)

    log.info(f"Querying {service} API for {len(query_list)} repos")

    resp = process_query_list(key, service_url, query_list, variables, batch_queries)

    log.info("Queuing repos")

    # Queue all the repos that came back successfully
    for repo in resp["data"]:
        repo_name = query_map[repo]["repo"]
        if not resp["data"][repo]:
            log.error("%s:%s response had no data. Processing Failed", repo_name, query_map[repo]["branch"])
            failed.append({"repo": repo_name, "error": "response had no data. Please confirm org/repo name"})
            continue
        if "repository" in resp["data"][repo] and not resp["data"][repo]["repository"]["tree"]["lastCommit"]:
            # If we queried for a branch but no branch was returned fail
            # the repo
            failed.append({"repo": repo_name, "error": "Branch not found"})
            continue
        org_repo = resp["data"][repo]["fullPath"].lower()
        if options_map[org_repo]["diff_base"]:
            # The scan has a diff base set so check whether it's a valid diff comparison
            if not check_diff(diff_url, key, org_repo, options_map[org_repo]["diff_base"]):
                # Diff specification is not valid.
                failed.append({"repo": repo, "error": "Diff base is not a valid comparison"})
                continue
        scan_id = queue_gitlab_repository(
            org_repo,
            resp["data"][repo],
            service,
            options_map[org_repo],
            query_map[repo]["branch"],
            identity=identity,
            categories=options_map[org_repo]["categories"],
            nat_connect=nat_connect,
        )
        queued.append(f"{org_repo}/{scan_id}")
        log.info(f"Queued {org_repo}/{scan_id}")

    # Process all the errors
    for e in resp.get("errors", []):
        for q in e["path"]:
            failed.append({"repo": query_map[q], "error": e["message"]})
            log.error("Error with %s: %s", query_map[q]["repo"], e["message"])

    return queued, failed
