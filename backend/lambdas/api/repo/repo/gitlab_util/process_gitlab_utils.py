# pylint: disable=no-member
import json
import re
import urllib
import requests
from graphql_query import Argument, Field, Operation, Query, Variable

from repo.util.aws import AWSConnect
from repo.util.env import DEFAULT_ORG, REV_PROXY_DOMAIN_SUBSTRING, REV_PROXY_SECRET_HEADER
from repo.util.utils import GetProxySecret, Logger, auth

log = Logger(__name__)


def process_query_list(key, service_url, query_list, vars, batch_query=True):
    if batch_query:
        return _get_query_response(key, service_url, query_list, vars)
    response_dict = {"data": {}}
    for query_item in query_list:
        resp = _get_query_response(key, service_url, query_item, vars)
        if resp and "data" in resp and "project" in resp.get("data"):
            resp_data = resp["data"]["project"]
            repo = re.match("repo[0-9]*", query_item.strip()).group(0)
            response_dict["data"][repo] = resp_data
        else:
            log.error("Repo query failed to receive valid output: %s", query_item)

    return response_dict


def _get_query_response(key, service_url, query, vars):
    headers = {"Authorization": "Bearer %s" % key, "Content-Type": "application/json"}
    if REV_PROXY_DOMAIN_SUBSTRING and REV_PROXY_DOMAIN_SUBSTRING in service_url:
        headers[REV_PROXY_SECRET_HEADER] = GetProxySecret()
    response = requests.post(url=service_url, headers=headers, json={"query": query, "variables": vars})
    log.info("Got API response")
    if response.status_code != 200:
        log.error("Error retrieving query: %s", response.text)
        return None
    return json.loads(response.text)


def check_diff(diff_url, key, org_repo, base, compare):
    headers = {"Authorization": "Bearer %s" % key, "Content-Type": "application/json"}
    if REV_PROXY_DOMAIN_SUBSTRING and REV_PROXY_DOMAIN_SUBSTRING in diff_url:
        headers[REV_PROXY_SECRET_HEADER] = GetProxySecret()

    # Do a HTTP HEAD request on the GitLab compare API to see if it's a valid commit/branch
    r = requests.head(
        url=f"{diff_url}/projects/{urllib.parse.quote(org_repo, safe='')}/repository/compare?from={base}&to={compare}",
        headers=headers,
    )

    # HTTP 200 means diff exists
    return r.status_code == 200


def build_queries(req_list, authz, service, batch_queries):
    # Build up a GraphQL query for each repo in the request
    unauthorized = []
    query_list = []
    query_map = {}
    variables = {}
    var_defs = {}
    queries = []
    var_defs.update({"org": Variable(name="org", type="String!")})

    count = 0
    for req in req_list:
        branch_name = req.get("branch")
        org_name = req.get("org", DEFAULT_ORG)
        variables.update({"org": org_name})
        # Validate that this API key is authorized to scan this repo
        allowed = auth(f"{org_name}/{req['repo']}", service, authz)
        if not allowed:
            unauthorized.append({"repo": f"{service}/{org_name}/{req['repo']}", "error": "Not Authorized"})
            continue

        repo_alias = f"repo{count}"
        variables.update({repo_alias: f"{org_name}/{req['repo']}"})

        var_defs.update({repo_alias: Variable(name=repo_alias, type="String!")})
        query = Query(
            name="project",
            alias=repo_alias,
            arguments=[
                Argument(name="fullPath", value=var_defs.get(repo_alias)),
            ],
            fields=["httpUrlToRepo", "fullPath", "visibility", Field(name="statistics", fields=["repositorySize"])],
        )

        if branch_name:
            branch_alias = f"branch{count}"
            var_defs.update({branch_alias: Variable(name=branch_alias, type="String!")})
            query.fields.append(
                Field(
                    name="repository",
                    fields=[
                        Field(
                            name="tree",
                            arguments=[Argument(name="ref", value=var_defs.get(branch_alias))],
                            fields=[Field(name="lastCommit", fields=["id"])],
                        )
                    ],
                )
            )
            variables.update({branch_alias: branch_name})

        query_list.append(query)
        query_map["repo%d" % count] = {"repo": "%s/%s" % (org_name, req["repo"]), "branch": branch_name}
        count += 1

    if batch_queries:
        operation = Operation(type="query", name="GetRepos", variables=var_defs.values(), queries=query_list)
        queries.append(operation.render())
    else:
        for item in query_list:
            operation = Operation(type="query", name="GetRepo", variables=var_defs.values(), queries=[item])
            queries.append(operation.render())
    return queries, variables, query_map, unauthorized


def queue_gitlab_repository(
    org_repo: str,
    resp_repo_data: dict,
    service_type: str,
    options_org_repo: dict,
    branch: str,
    identity=None,
    categories=None,
    nat_connect=False,
):
    """
    :param org_repo: equivalent to resp_repo_data['fullPath'].lower()
    :param resp_repo_data: from response, is the equivalent to resp['data'][repo]
    :param service_type: type of service. Either gitlab, github, bitbucket, or a private server name.
    :param options_org_repo: options for the current repo to be queued. Is equivalent to options_map[org_repo]
    :param branch: branch to be pulled and scanned. equivalent to query_map[repo]['branch']
    :param identity: the identity requesting the scan
    :param categories: plugins scanning?
    :param nat_connect: does the repo need to be within the AWS NAT in order to be accessed
    :return: response to queueing the repo.
    """
    aws_connect = AWSConnect()
    return aws_connect.queue_repo_for_scan(
        org_repo,
        resp_repo_data["httpUrlToRepo"],
        # Gitlab repository size is in bytes when other service sizes are in kilobytes.
        # Converting repository size to kilobytes to meet expected size.
        int(resp_repo_data["statistics"]["repositorySize"]) / 1024,
        service_type,
        public=(resp_repo_data["visibility"] not in ["private", "internal"]),
        plugins=options_org_repo["plugins"],
        depth=options_org_repo["depth"],
        branch=branch,
        include_dev=options_org_repo["include_dev"],
        callback_url=options_org_repo["callback_url"],
        client_id=options_org_repo["client_id"],
        batch_priority=options_org_repo["batch_priority"],
        identity=identity,
        categories=categories,
        nat_queue=nat_connect,
        diff_base=options_org_repo["diff_base"],
        schedule_run=options_org_repo["schedule_run"],
        batch_id=options_org_repo["batch_id"],
        include_paths=options_org_repo["include_paths"],
        exclude_paths=options_org_repo["exclude_paths"],
    )
