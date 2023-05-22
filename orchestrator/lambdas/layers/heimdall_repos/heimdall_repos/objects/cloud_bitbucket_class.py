from string import Template
from heimdall_repos.repo_layer_env import (
    BITBUCKET_PUBLIC_BRANCH_QUERY,
    BITBUCKET_PUBLIC_ORG_QUERY,
    BITBUCKET_PUBLIC_REPO_QUERY,
    BITBUCKET_PUBLIC_SPECIFIC_BRANCH_QUERY,
)
from heimdall_repos.objects.abstract_bitbucket_class import AbstractBitbucket


class CloudBitbucket(AbstractBitbucket):
    def __init__(self, service):
        super().__init__(service, "CloudBitbucket")

    def is_public(self, repo: dict) -> bool:
        return not repo.get("is_private")

    def has_next_page(self, response_dict: dict) -> bool:
        if response_dict.get("next"):
            return True
        return False

    def get_cursor(self, response_dict: dict):
        # The value of "next" is a url. We only need the page.
        next_page = response_dict.get("next")
        return next_page.split("=")[1]

    def get_branch_name(self, ref: dict) -> str or None:
        """Gets the name of the branch.
        We cannot use just the name since branches with spaces will not note the necessary special characters.
        """
        href = self.json_utils.get_object_from_json_dict(ref, ["links", "self", "href"])
        if href:
            return href.split("/refs/branches/")[1]
        return None

    def construct_bitbucket_org_url(self, url: str, org: str, cursor: str) -> str:
        return Template(BITBUCKET_PUBLIC_ORG_QUERY).substitute(service_url=url, org=org, cursor=cursor)

    def construct_bitbucket_repo_url(self, url: str, org: str, repo: str, cursor: str) -> str:
        return Template(BITBUCKET_PUBLIC_REPO_QUERY).substitute(service_url=url, org=org, repo=repo, cursor=cursor)

    def construct_bitbucket_branch_url(self, url: str, org: str, repo: str, cursor: str, branch: str = None):
        if branch is not None:
            return Template(BITBUCKET_PUBLIC_SPECIFIC_BRANCH_QUERY).substitute(
                service_url=url, org=org, repo=repo, cursor=cursor, branch=branch
            )
        return Template(BITBUCKET_PUBLIC_BRANCH_QUERY).substitute(service_url=url, org=org, repo=repo, cursor=cursor)

    def get_default_cursor(self):
        return "1"
