import json
import requests
from graphql_query import Argument, Field, Operation, Query, Variable

from artemislib.github.app import GithubApp
from repo.util.aws import AWSConnect
from repo.util.const import PROCESS_RESPONSE_TUPLE
from repo.util.env import DEFAULT_ORG, REV_PROXY_DOMAIN_SUBSTRING, REV_PROXY_SECRET_HEADER
from repo.util.utils import GetProxySecret, Logger, auth, build_options_map, get_api_key

log = Logger(__name__)


def process_github(
    req_list, service, service_url, service_secret, nat_connect, identity, diff_url
) -> PROCESS_RESPONSE_TUPLE:
    total_queued = []
    total_failed = []
    grouped_reqs = _group_reqs(req_list)
    for org in grouped_reqs:
        authorization = _get_authorization(org, service_secret)
        options_map = build_options_map(grouped_reqs[org])
        query, query_map, query_vars, unauthorized = _build_query(org, grouped_reqs[org], service, identity.scope)
        queued, failed = _query(
            query,
            query_map,
            query_vars,
            options_map,
            service,
            service_url,
            authorization,
            nat_connect=nat_connect,
            identity=identity,
            diff_url=diff_url,
        )
        total_queued += queued
        total_failed += failed

    return PROCESS_RESPONSE_TUPLE(total_queued, total_failed, unauthorized)


def _get_query_response(authorization, service_url, query, variables):
    # Query the GitHub API
    headers = {"Authorization": authorization, "Content-Type": "application/json"}
    if REV_PROXY_DOMAIN_SUBSTRING and REV_PROXY_DOMAIN_SUBSTRING in service_url:
        headers[REV_PROXY_SECRET_HEADER] = GetProxySecret()
    log.error(service_url)
    response = requests.post(
        url=service_url,
        headers=headers,
        json={"query": query, "variables": variables},
    )

    log.info("Got API response")

    if response.status_code != 200:
        log.error("Error retrieving query: %s", response.text)
        return None

    return json.loads(response.text)


def _build_query(org, req_list, service, authz):
    # Build up a GraphQL query for each repo in the request
    unauthorized = []
    query_list = []
    query_map = {}
    variables = {"org": org}
    var_defs = {}
    var_defs.update({"org": Variable(name="org", type="String!")})

    count = 0
    for req in req_list:
        branch_name = req.get("branch")

        org_name = req.get("org", DEFAULT_ORG)

        # Validate that this API key is authorized to scan this repo
        allowed = auth(f"{org_name}/{req['repo']}", service, authz)
        if not allowed:
            unauthorized.append({"repo": f"{service}/{org_name}/{req['repo']}", "error": "Not Authorized"})
            continue

        repo_alias = f"repo{count}"
        variables.update({repo_alias: req["repo"]})

        var_defs.update({repo_alias: Variable(name=repo_alias, type="String!")})
        query = Query(
            name="repository",
            alias=repo_alias,
            arguments=[
                Argument(name="owner", value=var_defs.get("org")),
                Argument(name="name", value=var_defs.get(repo_alias)),
            ],
            fields=["url", "nameWithOwner", "isPrivate", "diskUsage"],
        )

        if branch_name:
            branch_alias = f"branch{count}"
            var_defs.update({branch_alias: Variable(name=branch_alias, type="String!")})
            query.fields.append(
                Field(
                    name="ref",
                    arguments=[Argument(name="qualified_name", value=var_defs.get(branch_alias))],
                    fields=["name"],
                )
            )
            variables.update({f"branch{count}": branch_name})

        query_list.append(query)
        query_map[repo_alias] = f"{org_name}/{req['repo']}"
        count += 1

    operation = Operation(type="query", name="GetRepos", variables=var_defs.values(), queries=query_list)
    return operation.render(), query_map, variables, unauthorized


def _get_query_response(authorization, service_url, query, variables):
    # Query the GitHub API
    headers = {"Authorization": authorization, "Content-Type": "application/json"}
    if REV_PROXY_DOMAIN_SUBSTRING and REV_PROXY_DOMAIN_SUBSTRING in service_url:
        headers[REV_PROXY_SECRET_HEADER] = GetProxySecret()
    log.error(service_url)
    response = requests.post(
        url=service_url,
        headers=headers,
        json={"query": query, "variables": variables},
    )

    log.info("Got API response")

    if response.status_code != 200:
        log.error("Error retrieving query: %s", response.text)
        return None

    return json.loads(response.text)


def _query(
    query, query_map, query_vars, options_map, service, service_url, authorization, nat_connect, identity, diff_url
):
    aws_connect = AWSConnect()
    queued = []
    failed = []
    if not query:
        return queued, failed

    log.info("Querying GitHub API for %d repos" % len(query_map))

    resp = _get_query_response(authorization, service_url, query, query_vars)

    if resp is None:
        log.info("Query was invalid, returning")
        return None
    log.info("Queuing repos")

    # Queue all the repos that came back successfully
    for repo in resp["data"]:
        if resp["data"][repo]:
            if "ref" in resp["data"][repo] and not resp["data"][repo]["ref"]:
                # If we queried for a branch but no branch was returned fail
                # the repo
                failed.append({"repo": repo, "error": "Branch not found"})
                continue
            org_repo = resp["data"][repo]["nameWithOwner"].lower()
            if org_repo not in options_map:
                failed.append(
                    {
                        "repo": org_repo,
                        "error": "Repository returned that was not requested, possibly due to a moved repository.",
                    }
                )
                print(f"Repository {org_repo} returned but was not requested. Possible moved repository.")
                continue
            if options_map[org_repo]["diff_base"]:
                # The scan has a diff base set so check whether it's a valid diff comparison
                compare = resp["data"][repo]["ref"]["name"] if "ref" in resp["data"][repo] else "HEAD"
                if not _check_diff(diff_url, authorization, org_repo, options_map[org_repo]["diff_base"], compare):
                    # Diff specification is not valid.
                    failed.append({"repo": repo, "error": "Diff base is not a valid comparison"})
                    continue
            scan_id = aws_connect.queue_repo_for_scan(
                org_repo,
                resp["data"][repo]["url"],
                resp["data"][repo]["diskUsage"],
                service,
                public=not resp["data"][repo]["isPrivate"],
                plugins=options_map[org_repo]["plugins"],
                depth=options_map[org_repo]["depth"],
                branch=resp["data"][repo].get("ref", {}).get("name"),
                include_dev=options_map[org_repo]["include_dev"],
                callback_url=options_map[org_repo]["callback_url"],
                client_id=options_map[org_repo]["client_id"],
                batch_priority=options_map[org_repo]["batch_priority"],
                identity=identity,
                categories=options_map[org_repo]["categories"],
                nat_queue=nat_connect,
                diff_base=options_map[org_repo]["diff_base"],
                schedule_run=options_map[org_repo]["schedule_run"],
                batch_id=options_map[org_repo]["batch_id"],
                include_paths=options_map[org_repo]["include_paths"],
                exclude_paths=options_map[org_repo]["exclude_paths"],
            )
            queued.append(f"{org_repo}/{scan_id}")
            print(f"Queued {org_repo}/{scan_id}")

    # Process all the errors
    for e in resp.get("errors", []):
        for q in e["path"]:
            failed.append({"repo": query_map[q], "error": e["message"]})
            print("Error with %s: %s" % (query_map[q], e["message"]))

    return queued, failed


def _check_diff(github_url, authorization, org_repo, base, compare):
    # Do a HTTP HEAD request on the GitHub compare API to see if it's a valid comparison
    headers = {"Authorization": authorization, "Content-Type": "application/json"}
    if REV_PROXY_DOMAIN_SUBSTRING and REV_PROXY_DOMAIN_SUBSTRING in github_url:
        headers[REV_PROXY_SECRET_HEADER] = GetProxySecret()

    r = requests.head(
        url=f"{github_url}/repos/{org_repo}/compare/{base}...{compare}",
        headers=headers,
    )

    # HTTP 200 means diff exists
    return r.status_code == 200


def _group_reqs(req_list: list) -> dict:
    grouped_reqs = {}
    for req in req_list:
        if req["org"] not in grouped_reqs:
            grouped_reqs[req["org"]] = []
        grouped_reqs[req["org"]].append(req)
    return grouped_reqs


def _get_authorization(org: str, github_secret: str) -> str:
    # Attempt to get an app installation token for the organization
    github_app = GithubApp()
    token = github_app.get_installation_token(org)
    if token is not None:
        return f"token {token}"

    # Fall back to getting the PAT
    key = get_api_key(github_secret)
    return f"bearer {key}"
