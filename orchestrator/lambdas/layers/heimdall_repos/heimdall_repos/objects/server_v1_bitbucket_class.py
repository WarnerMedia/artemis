from string import Template
from heimdall_repos.repo_layer_env import (
    BITBUCKET_PRIVATE_BRANCH_QUERY,
    BITBUCKET_PRIVATE_ORG_QUERY,
    BITBUCKET_PRIVATE_REPO_QUERY,
    BITBUCKET_PRIVATE_SPECIFIC_BRANCH_QUERY,
)
from heimdall_repos.objects.abstract_bitbucket_class import AbstractBitbucket


class ServerV1Bitbucket(AbstractBitbucket):
    def __init__(self, service):
        super().__init__(service, "ServerBitbucket")

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

    def construct_bitbucket_org_url(self, url: str, org: str, cursor: str) -> str:
        return Template(BITBUCKET_PRIVATE_ORG_QUERY).substitute(service_url=url, org=org, cursor=cursor)

    def construct_bitbucket_repo_url(self, url: str, org: str, repo: str, cursor: str) -> str:
        return Template(BITBUCKET_PRIVATE_REPO_QUERY).substitute(service_url=url, org=org, repo=repo, cursor=cursor)

    def construct_bitbucket_branch_url(self, url: str, org: str, repo: str, cursor: str, branch: str = None):
        if branch is not None:
            return Template(BITBUCKET_PRIVATE_SPECIFIC_BRANCH_QUERY).substitute(
                service_url=url, org=org, repo=repo, cursor=cursor, branch=branch
            )
        return Template(BITBUCKET_PRIVATE_BRANCH_QUERY).substitute(service_url=url, org=org, repo=repo, cursor=cursor)

    def get_default_cursor(self):
        return "0"
