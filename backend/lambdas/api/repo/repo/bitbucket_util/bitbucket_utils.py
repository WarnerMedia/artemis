# pylint: disable=no-member
from string import Template

import requests
from requests import Response

from repo.util.aws import AWSConnect
from repo.util.const import (
    BITBUCKET_PRIVATE_BRANCH_QUERY,
    BITBUCKET_PRIVATE_REPO_QUERY,
    BITBUCKET_PUBLIC_BRANCH_QUERY,
    BITBUCKET_PUBLIC_REPO_QUERY,
    PROCESS_RESPONSE_TUPLE,
)
from repo.util.env import DEFAULT_ORG, REV_PROXY_DOMAIN_SUBSTRING, REV_PROXY_SECRET_HEADER
from repo.util.utils import (
    GetProxySecret,
    Logger,
    auth,
    build_options_map,
    get_api_key,
    get_json_from_response,
    get_object_from_json_dict,
)

log = Logger(__name__)

SERVER_BRANCH_PAGE_LIMIT = 150
RATE_LIMIT_STATUS_CODE = 429
RATE_LIMIT_RESPONSE = "Rate limit for this resource has been exceeded"
server_branches = {}


class RepoQueueFields:
    def __init__(self, name, clone_url, size, service, public, branch, options_map):
        self.name = name
        self.clone_url = clone_url
        self.size = size
        self.service = service
        self.public = public
        self.branch = branch
        self.options = RepoQueueOptions.create_using_dict(options_map)

    def __eq__(self, other):
        if not isinstance(other, RepoQueueFields):
            return False
        return (
            self.name == other.name
            and self.clone_url == other.clone_url
            and self.size == other.size
            and self.service == other.service
            and self.public == other.public
            and self.branch == other.branch
            and self.options == other.options
        )


class RepoQueueOptions:
    def __init__(
        self,
        plugins,
        depth,
        include_dev,
        callback_url,
        client_id,
        batch_priority,
        categories,
        diff_base,
        schedule_run,
        batch_id,
        include_paths,
        exclude_paths,
    ):
        self.plugins = plugins
        self.depth = depth
        self.include_dev = include_dev
        self.callback_url = callback_url
        self.client_id = client_id
        self.batch_priority = batch_priority
        self.categories = categories
        self.diff_base = diff_base
        self.schedule_run = schedule_run
        self.batch_id = batch_id
        self.include_paths = include_paths
        self.exclude_paths = exclude_paths

    @classmethod
    def create_using_dict(cls, options_map):
        return cls(
            options_map.get("plugins"),
            options_map.get("depth"),
            options_map.get("include_dev"),
            options_map.get("callback_url"),
            options_map.get("client_id"),
            options_map.get("batch_priority"),
            options_map.get("categories"),
            options_map.get("diff_base"),
            options_map.get("schedule_run"),
            options_map.get("batch_id"),
            options_map.get("include_paths"),
            options_map.get("exclude_paths"),
        )

    def __eq__(self, other):
        if not isinstance(other, RepoQueueOptions):
            return False
        return (
            self.plugins == other.plugins
            and self.depth == other.depth
            and self.include_dev == other.include_dev
            and self.callback_url == other.callback_url
            and self.client_id == other.client_id
            and self.batch_priority == other.batch_priority
            and self.categories == other.categories
            and self.diff_base == other.diff_base
            and self.batch_id == other.batch_id
            and self.include_paths == other.include_paths
            and self.exclude_paths == other.exclude_paths
        )


def process_bitbucket(req_list, service, service_url, service_secret, nat_connect, identity) -> PROCESS_RESPONSE_TUPLE:
    options_map = build_options_map(req_list)
    return _query(req_list, options_map, service, service_url, service_secret, nat_connect, identity=identity)


def query_bitbucket_api(url: str, api_key: str) -> Response:
    headers = {"Authorization": "Basic %s" % api_key, "Accept": "application/json"}
    if REV_PROXY_DOMAIN_SUBSTRING and REV_PROXY_DOMAIN_SUBSTRING in url:
        headers[REV_PROXY_SECRET_HEADER] = GetProxySecret()
    with requests.session() as sess:
        response = sess.get(url=url, headers=headers)
        if response.status_code != 200:
            log.error("Error retrieving Bitbucket query: %s", response.text)
        return response


def construct_bitbucket_repo_url(service: str, url: str, org: str, repo: str) -> str:
    if service == "bitbucket":
        return Template(BITBUCKET_PUBLIC_REPO_QUERY).substitute(service_url=url, org=org, repo=repo)
    return Template(BITBUCKET_PRIVATE_REPO_QUERY).substitute(service_url=url, org=org, repo=repo)


def construct_bitbucket_branch_url(service: str, url: str, org: str, repo: str, branch: str):
    if service == "bitbucket":
        return Template(BITBUCKET_PUBLIC_BRANCH_QUERY).substitute(service_url=url, org=org, repo=repo, branch=branch)
    return Template(BITBUCKET_PRIVATE_BRANCH_QUERY).substitute(service_url=url, org=org, repo=repo, branch=branch)


def queue_repo(repo_fields: RepoQueueFields, nat_connect, identity) -> str:
    aws_connect = AWSConnect()
    # Queue the repo
    scan_id = aws_connect.queue_repo_for_scan(
        repo_fields.name,
        repo_fields.clone_url,
        repo_fields.size,
        repo_fields.service,
        public=repo_fields.public,
        plugins=repo_fields.options.plugins,
        depth=repo_fields.options.depth,
        branch=repo_fields.branch,
        include_dev=repo_fields.options.include_dev,
        callback_url=repo_fields.options.callback_url,
        client_id=repo_fields.options.client_id,
        batch_priority=repo_fields.options.batch_priority,
        identity=identity,
        categories=repo_fields.options.categories,
        nat_queue=nat_connect,
        diff_base=repo_fields.options.diff_base,
        schedule_run=repo_fields.options.schedule_run,
        batch_id=repo_fields.options.batch_id,
        include_paths=repo_fields.options.include_paths,
        exclude_paths=repo_fields.options.exclude_paths,
    )
    return scan_id


def prep_for_repo_queue(service: str, response_dict: dict, branch: str, options_map: dict) -> RepoQueueFields:
    """
    there is a difference between cloud API and private Server API
    Because of this, there are differences that need to be resolved prior to queueing the repo for scanning
    This will provide as an intermediary to ensure all fields are present
    """
    clone_list = get_object_from_json_dict(response_dict, ["links", "clone"])
    full_name = get_repo_full_name(response_dict)
    name_options_map = options_map.get(full_name, {})
    if not name_options_map:
        log.error("Options map could not find match for %s/%s. All options will be None.", service, full_name)

    clone_url = get_clone_url(clone_list)
    size = get_repo_size(response_dict.get("size"))
    public = is_repo_public(response_dict.get("is_private"), response_dict.get("public"))
    return RepoQueueFields(
        name=full_name,
        clone_url=clone_url,
        size=size,
        service=service,
        public=public,
        branch=branch,
        options_map=name_options_map,
    )


def is_repo_public(cloud_private: bool, server_public: bool) -> bool:
    """
    Checks if the repo is public
    """
    if cloud_private:
        return not cloud_private
    return server_public


def get_repo_size(size: int) -> int:
    """
    If bitbucket cloud, the size is available
    If bitbucket private server, the size is unavailable as of API V1 (06/2020)
    """
    if size:
        return int(size / 1024)
    return 0


def get_repo_full_name(response_dict):
    if response_dict.get("full_name"):
        return response_dict.get("full_name")
    repo = response_dict.get("slug")
    project = response_dict.get("project")
    if not project or not repo:
        log.error("Could not get full org/repo name from response.")
        return None
    org = project.get("key")
    return f"{org}/{repo}".lower()


def get_clone_url(clone_list: list or None) -> str or None:
    """
    Gets the clone url necessary to perform a 'git pull'
    Cloud bitbucket uses the name "https"
    Server bitbucket uses the name "http"
    """
    if not clone_list:
        return None
    for clone_item in clone_list:
        if clone_item.get("name") in ["http", "https"]:
            clone_url = clone_item.get("href")
            if clone_url and "@" in clone_url:
                # Strip the username out of the URL
                return f'https://{clone_url.split("@")[1]}'
            return clone_url
    return None


def get_repo_response_error(status_code: int, response_dict: dict or None) -> str or None:
    default_error = "Unknown error"
    if status_code == 200:
        return None
    if status_code == RATE_LIMIT_STATUS_CODE:
        return RATE_LIMIT_RESPONSE
    if response_dict:
        return get_object_from_json_dict(response_dict, ["error", "message"]) or default_error
    return default_error


def verify_branch_exists(service, branch_url, branch_name, key) -> dict:
    """
    Base function to verify the provided branch exists.
    return: {"status": bool, "response": str}
    """
    if service == "bitbucket":
        return verify_branch_exists_cloud(branch_url, branch_name, key)
    return verify_branch_exists_server(branch_url, branch_name, key)


def verify_branch_exists_cloud(branch_url, branch_name, key) -> dict:
    if not branch_name:
        return {"status": True, "response": None}
    # Query the BitBucket API for the repo branch
    branch_response = query_bitbucket_api(branch_url, key)
    return {"status": branch_response.status_code == 200, "response": branch_response.text}


def verify_branch_exists_server(branch_url, branch_name, key) -> dict:
    if not branch_name:
        return {"status": True, "response": None}

    if not server_branches.get(branch_url):
        branch_result = get_server_branches(branch_url, key)
        if not branch_result["status"]:
            return branch_result

    branch_exists = branch_name in server_branches[branch_url]
    return {"status": branch_exists, "response": "Branch not found"}


def get_server_branches(branch_url, key) -> dict:
    # Query the BitBucket API for the repo branches
    is_last_page = False
    start = 0
    server_branches[branch_url] = []
    while not is_last_page:
        # construct url with cursor
        branch_url_with_cursor = f"{branch_url}?cursor={start}&limit={SERVER_BRANCH_PAGE_LIMIT}"
        branch_response = query_bitbucket_api(branch_url_with_cursor, key)
        if branch_response.status_code != 200:
            log.warning("Branch url returned status code %d", branch_response.status_code)
            return {"status": False, "response": branch_response.text}

        branch_dict = get_json_from_response(branch_response.text)

        if not branch_dict:
            log.error("Branch response was not a dictionary: %s", branch_response.text)
            return {"status": False, "response": branch_response.text}

        for branch in branch_dict.get("values"):
            server_branches[branch_url].append(branch.get("displayId"))

        is_last_page = branch_dict.get("isLastPage")
        start = branch_dict.get("nextPageStart")
    return {"status": True, "response": None}


def _query(
    req_list, options_map, service, service_url, service_secret, nat_connect, identity
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
        repo = req["repo"]
        org_repo = f"{org_name}/{repo}".lower()

        # Validate that this API key is authorized to scan this repo
        allowed = auth(f"{org_name}/{repo}", service, identity.scope)
        if not allowed:
            unauthorized.append({"repo": f"{service}/{org_name}/{repo}", "error": "Not Authorized"})
            continue

        # Query the BitBucket API for the repo
        url = construct_bitbucket_repo_url(service, service_url, org_name, repo)
        response = query_bitbucket_api(url, key)

        log.info("Got API response")

        response_dict = get_json_from_response(response.text)

        # If there was an issue querying the repo, note the error (if possible), and continue
        error = get_repo_response_error(response.status_code, response_dict)
        if error:
            failed.append({"repo": org_repo, "error": error})
            log.error("Error with %s: %s", repo, error)
            continue

        branch_url = construct_bitbucket_branch_url(service, service_url, org_name, repo, branch_name)
        branch_result = verify_branch_exists(service, branch_url, branch_name, key)
        if not branch_result["status"]:
            # If we queried for a branch but no branch was returned fail the repo
            failed.append({"repo": org_repo, "error": branch_result["response"]})
            log.error("Error with %s/%s: branch could not be found: %s", service, repo, branch_name)
            continue

        if options_map[org_repo]["diff_base"]:
            # The scan has a diff base set so check whether it's a valid diff comparison
            compare = branch_name or "HEAD"
            if not _check_diff(service_url, key, org_repo, options_map[org_repo]["diff_base"], compare):
                # Diff specification is not valid.
                failed.append({"repo": org_repo, "error": "Diff base is not a valid comparison"})
                continue

        log.info("Queuing repo")

        repo_queue_collection = prep_for_repo_queue(service, response_dict, branch_name, options_map)
        scan_id = queue_repo(repo_queue_collection, nat_connect, identity=identity)
        full_name = get_repo_full_name(response_dict)
        queued.append(f"{full_name}/{scan_id}")
        log.info("Queued %s/%s", full_name, scan_id)

    return PROCESS_RESPONSE_TUPLE(queued, failed, unauthorized)


def _check_diff(url, key, org_repo, base, compare):
    headers = {"Authorization": "Basic %s" % key, "Accept": "application/json"}
    if REV_PROXY_DOMAIN_SUBSTRING and REV_PROXY_DOMAIN_SUBSTRING in url:
        headers[REV_PROXY_SECRET_HEADER] = GetProxySecret()

    # Do a HTTP HEAD request on the GitLab diff API to see if it's valid
    r = requests.head(url=f"{url}/repositories/{org_repo}/diff/{base}..{compare}", headers=headers)

    # HTTP 200 means diff exists
    return r.status_code == 200
