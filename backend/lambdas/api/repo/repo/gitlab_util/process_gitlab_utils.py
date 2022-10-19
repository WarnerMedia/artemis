# pylint: disable=no-member
import json
import re
import urllib
from string import Template

import requests

from repo.util.aws import AWSConnect
from repo.util.const import GITLAB_QUERY_NO_BRANCH, GITLAB_QUERY_WITH_BRANCH
from repo.util.env import DEFAULT_ORG, REV_PROXY_DOMAIN_SUBSTRING, REV_PROXY_SECRET_HEADER
from repo.util.utils import GetProxySecret, Logger, auth

log = Logger(__name__)


def _process_query_list(key, service_url, query_list, batch_query=True):
    if batch_query:
        query = "{%s}" % " ".join(query_list)
        return _get_query_response(key, service_url, query)
    response_dict = {"data": {}}
    for query_item in query_list:
        query = "query {}".format(query_item)
        resp = _get_query_response(key, service_url, query)
        if resp and "data" in resp and "project" in resp.get("data"):
            resp_data = resp["data"]["project"]
            repo = re.match("repo[0-9]*", query_item.strip()).group(0)
            response_dict["data"][repo] = resp_data
        else:
            log.error("Repo query failed to receive valid output: %s", query_item)

    return response_dict


def _get_query_response(key, service_url, query):
    headers = {"Authorization": "Bearer %s" % key, "Content-Type": "application/json"}
    if REV_PROXY_DOMAIN_SUBSTRING and REV_PROXY_DOMAIN_SUBSTRING in service_url:
        headers[REV_PROXY_SECRET_HEADER] = GetProxySecret()
    response = requests.post(url=service_url, headers=headers, json={"query": query})
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


def _build_queries(req_list, authz, service):
    # Build up a GraphQL query for each repo in the request
    unauthorized = []
    query_list = []
    query_map = {}

    count = 0
    for req in req_list:
        branch_name = req.get("branch")
        org_name = req.get("org", DEFAULT_ORG)

        # Validate that this API key is authorized to scan this repo
        allowed = auth(f"{org_name}/{req['repo']}", service, authz)
        if not allowed:
            unauthorized.append({"repo": f"{service}/{org_name}/{req['repo']}", "error": "Not Authorized"})
            continue

        if branch_name:
            query = Template(GITLAB_QUERY_WITH_BRANCH).substitute(
                count=count, org_name=org_name, repo=req["repo"], branch=branch_name
            )
            query_list.append(query)
        else:
            # If no branch was specified don't include ref in the query so
            # we can distinguish between no branch and invalid branch in the
            # query results.
            query = Template(GITLAB_QUERY_NO_BRANCH).substitute(count=count, org_name=org_name, repo=req["repo"])
            query_list.append(query)

        query_map["repo%d" % count] = {"repo": "%s/%s" % (org_name, req["repo"]), "branch": branch_name}
        count += 1

    return query_list, query_map, unauthorized


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
