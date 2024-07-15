from string import Template
from aws_lambda_powertools import Logger
from heimdall_repos.repo_layer_env import (
    BITBUCKET_PUBLIC_BRANCH_QUERY,
    BITBUCKET_PUBLIC_COMMIT_QUERY,
    BITBUCKET_PUBLIC_ORG_QUERY,
    BITBUCKET_PUBLIC_REPO_QUERY,
    BITBUCKET_PUBLIC_SINGLE_REPO_QUERY,
    BITBUCKET_PUBLIC_DEFAULT_BRANCH_QUERY,
)
from heimdall_repos.objects.abstract_bitbucket_class import AbstractBitbucket
from heimdall_utils.env import APPLICATION

log = Logger(service=APPLICATION, name="CloudBitbucket", child=True)


class CloudBitbucket(AbstractBitbucket):
    def __init__(self, service):
        super().__init__(service, log)

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

    def get_default_branch_name(self, response_dict: dict):
        return response_dict.get("main_branch", {}).get("name", None)

    def construct_bitbucket_org_url(self, url: str, org: str, cursor: str) -> str:
        return Template(BITBUCKET_PUBLIC_ORG_QUERY).substitute(service_url=url, org=org, cursor=cursor)

    def construct_bitbucket_repo_url(self, url: str, org: str, repo: str, cursor: str) -> str:
        return Template(BITBUCKET_PUBLIC_REPO_QUERY).substitute(service_url=url, org=org, repo=repo, cursor=cursor)

    def construct_bitbucket_branch_url(self, url: str, org: str, repo: str, cursor: str):
        return Template(BITBUCKET_PUBLIC_BRANCH_QUERY).substitute(service_url=url, org=org, repo=repo, cursor=cursor)

    def construct_bitbucket_commit_url(self, url: str, org: str, repo: str, commit_id: str):
        return Template(BITBUCKET_PUBLIC_COMMIT_QUERY).substitute(service_url=url, org=org, repo=repo, commit=commit_id)

    def construct_bitbucket_default_branch_url(self, url: str, org: str, repo: str):
        return Template(BITBUCKET_PUBLIC_DEFAULT_BRANCH_QUERY).substitute(service_url=url, org=org, repo=repo)

    def construct_bitbucket_single_repo_url(self, url: str, org: str, repo: str):
        return Template(BITBUCKET_PUBLIC_SINGLE_REPO_QUERY).substitute(service_url=url, org=org, repo=repo)

    def get_default_cursor(self):
        return "1"
