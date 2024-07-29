from string import Template
from aws_lambda_powertools import Logger
from heimdall_repos.repo_layer_env import (
    BITBUCKET_PRIVATE_BRANCH_QUERY,
    BITBUCKET_PRIVATE_COMMIT_QUERY,
    BITBUCKET_PRIVATE_ORG_QUERY,
    BITBUCKET_PRIVATE_REPO_QUERY,
    BITBUCKET_PRIVATE_DEFAULT_BRANCH_QUERY,
    BITBUCKET_PRIVATE_SINGLE_REPO_QUERY,
)
from heimdall_repos.objects.abstract_bitbucket_class import AbstractBitbucket
from heimdall_utils.env import APPLICATION

log = Logger(service=APPLICATION, name="ServerBitbucket", child=True)


class ServerV1Bitbucket(AbstractBitbucket):
    def __init__(self, service):
        super().__init__(service, log)

    def is_public(self, repo: dict) -> bool:
        return repo.get("public")

    def has_next_page(self, response_dict: dict) -> bool:
        is_last_page = response_dict.get("isLastPage")
        if isinstance(is_last_page, bool) and not is_last_page:
            return True
        return False

    def get_cursor(self, response_dict: dict):
        return response_dict.get("nextPageStart")

    def get_branch_name(self, ref: dict) -> str:
        return ref.get("displayId")

    def get_default_branch_name(self, response_dict: dict) -> str:
        return self.get_branch_name(response_dict)

    def construct_bitbucket_org_url(self, url: str, org: str, cursor: str) -> str:
        return Template(BITBUCKET_PRIVATE_ORG_QUERY).substitute(service_url=url, org=org, cursor=cursor)

    def construct_bitbucket_repo_url(self, url: str, org: str, repo: str, cursor: str) -> str:
        return Template(BITBUCKET_PRIVATE_REPO_QUERY).substitute(service_url=url, org=org, repo=repo, cursor=cursor)

    def construct_bitbucket_branch_url(self, url: str, org: str, repo: str, cursor: str):
        return Template(BITBUCKET_PRIVATE_BRANCH_QUERY).substitute(service_url=url, org=org, repo=repo, cursor=cursor)

    def construct_bitbucket_commit_url(self, url: str, org: str, repo: str, commit_id: str):
        return Template(BITBUCKET_PRIVATE_COMMIT_QUERY).substitute(
            service_url=url, org=org, repo=repo, commit=commit_id
        )

    def construct_bitbucket_default_branch_url(self, url: str, org: str, repo: str):
        return Template(BITBUCKET_PRIVATE_DEFAULT_BRANCH_QUERY).substitute(service_url=url, org=org, repo=repo)

    def construct_bitbucket_single_repo_url(self, url: str, org: str, repo: str):
        return Template(BITBUCKET_PRIVATE_SINGLE_REPO_QUERY).substitute(service_url=url, org=org, repo=repo)

    def get_default_cursor(self):
        return "0"
