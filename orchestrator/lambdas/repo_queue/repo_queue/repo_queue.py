# pylint: disable=no-name-in-module, no-member
import json
from itertools import zip_longest

from botocore.exceptions import ClientError

from heimdall_repos.ado import ADORepoProcessor
from heimdall_repos.bitbucket_utils import ProcessBitbucketRepos
from heimdall_repos.github_utils import ProcessGithubRepos
from heimdall_repos.gitlab_utils import ProcessGitlabRepos
from heimdall_utils.aws_utils import get_heimdall_secret, get_sqs_connection
from heimdall_utils.get_services import get_services_dict
from heimdall_utils.utils import Logger
from heimdall_utils.variables import REGION
from repo_queue.repo_queue_env import ORG_QUEUE, REPO_QUEUE

log = Logger(__name__)


def run(event=None, _context=None, services_file=None) -> None:
    full_services_dict = get_services_dict(services_file)
    services = full_services_dict.get("services")
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


def query(service, org, service_dict, page, default_branch_only, plugins, external_orgs, batch_id: str) -> list:
    if not service_dict:
        log.error(f"Service {service} was not found and therefore deemed unsupported")
        return []
    api_key = get_api_key(service_dict.get("secret_loc"))
    if not api_key:
        log.error(f"Could not retrieve Service {service} api key.")
        return []
    cursor = page["cursor"]

    ret = []
    if service_dict.get("type") == "github":
        github_class = ProcessGithubRepos(
            queue=ORG_QUEUE,
            service=service,
            org=org,
            service_dict=service_dict,
            api_key=api_key,
            cursor=cursor,
            default_branch_only=default_branch_only,
            plugins=plugins,
            external_orgs=external_orgs,
            batch_id=batch_id,
        )
        ret = github_class.query_github()
    elif service_dict.get("type") in ["gitlab"]:
        gitlab_class = ProcessGitlabRepos(
            queue=ORG_QUEUE,
            service=service,
            org=org,
            service_dict=service_dict,
            api_key=api_key,
            cursor=cursor,
            default_branch_only=default_branch_only,
            plugins=plugins,
            external_orgs=external_orgs,
            batch_id=batch_id,
        )
        if not gitlab_class.validate_input():
            log.error("Validation failed for %s", service)
        else:
            ret = gitlab_class.query_gitlab()
    elif service_dict.get("type") == "bitbucket":
        bitbucket_class = ProcessBitbucketRepos(
            queue=ORG_QUEUE,
            service=service,
            org=org,
            service_dict=service_dict,
            api_key=api_key,
            cursor=cursor,
            default_branch_only=default_branch_only,
            plugins=plugins,
            external_orgs=external_orgs,
            batch_id=batch_id,
        )
        ret = bitbucket_class.query_bitbucket()
    elif service_dict.get("type") == "ado":
        ado = ADORepoProcessor(
            queue=ORG_QUEUE,
            service=service,
            org=org,
            service_dict=service_dict,
            api_key=api_key,
            cursor=cursor,
            default_branch_only=default_branch_only,
            plugins=plugins,
            external_orgs=external_orgs,
            batch_id=batch_id,
        )
        ret = ado.query()
    return ret


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
