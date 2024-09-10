from functools import cache
from urllib.parse import quote
import requests

from artemislib.aws import AWSConnect
from engine.plugins.gitlab_repo_health.utilities.environment import (
    get_rev_proxy_domain_substring,
    has_rev_proxy_domain_substring,
    get_rev_proxy_secret_header,
    has_rev_proxy_secret_header,
    get_rev_proxy_secret,
    APPLICATION,
)


class Gitlab:
    """
    Wrapper class for GitLab so that we can cache responses and abstract away API calls
    """

    def __init__(self, key: str, service_url: str, verbose: bool = False):
        self._verbose = verbose
        self._url = f"https://{service_url}/api/v4"
        self._key = key
        self._headers = {"Authorization": "Bearer %s" % key, "Content-Type": "application/json"}

        if (
            has_rev_proxy_domain_substring()
            and has_rev_proxy_secret_header()
            and get_rev_proxy_domain_substring() in service_url  # type: ignore
        ):
            aws = AWSConnect()

            proxy_secret = aws.get_secret_raw(get_rev_proxy_secret())
            if proxy_secret:
                self._headers[get_rev_proxy_secret_header()] = proxy_secret

    @cache
    def get_approvals(self, owner: str, repo: str):
        if self._verbose:
            print(f'[GITLAB] Calling "get_approvals" with owner="{owner}" and repo="{repo}"')

        repository = self.get_repository(owner, repo)

        id = repository.get("id")
        # For some reason, this URL fails with the project string, must use id.
        url = f"{self._url}/projects/{id}/approvals"
        return self._authenticated_get(url).json()

    @cache
    def get_approval_rules(self, owner: str, repo: str):
        if self._verbose:
            print(f'[GITLAB] Calling "get_approval_rules" with owner="{owner}" and repo="{repo}"')

        repository = self.get_repository(owner, repo)

        id = repository.get("id")
        # For some reason, this URL fails with the project string, must use id.
        url = f"{self._url}/projects/{id}/approval_rules"
        return self._authenticated_get(url).json()

    @cache
    def get_branch_protection(self, owner: str, repo: str, branch: str):
        if self._verbose:
            print(
                f'[GITLAB] Calling "get_branch_protection" with owner="{owner}", repo="{repo}", and branch="{branch}"'
            )

        project_escaped = self._quote(f"{owner}/{repo}")
        branch_escaped = self._quote(branch)

        url = f"{self._url}/projects/{project_escaped}/protected_branches/{branch_escaped}"

        return self._authenticated_get(url).json()

    @cache
    def get_branch_rules(self, owner: str, repo: str, branch: str):
        if self._verbose:
            print(f'[GITLAB] Calling "get_branch_rules" with owner="{owner}", repo="{repo}", and branch="{branch}"')

        repository = self.get_repository(owner, repo)

        id = repository.get("id")
        # For some reason, this URL fails with the project string, must use id.
        url = f"{self._url}/projects/{id}/push_rule"
        return self._authenticated_get(url).json()

    @cache
    def get_repository(self, owner: str, repo: str):
        if self._verbose:
            print(f'[GITLAB] Calling "get_repository" with owner="{owner}", repo="{repo}"')
        project_escaped = self._quote(f"{owner}/{repo}")

        url = f"{self._url}/projects/{project_escaped}"
        return self._authenticated_get(url).json()

    @cache
    def get_repository_content(self, owner: str, repo: str, branch: str, path: str):
        if self._verbose:
            print(
                f'[GITLAB] Calling "get_repository_content" with owner="{owner}", repo="{repo}", branch="{branch}", and path="{path}"'
            )

        project_escaped = self._quote(f"{owner}/{repo}")
        path_escaped = self._quote(path)
        branch_escaped = self._quote(branch)

        url = f"{self._url}/projects/{project_escaped}/repository/files/{path_escaped}?ref={branch_escaped}"
        return self._authenticated_get(url).json()

    def get_default_branch(self, owner: str, repo: str):
        repository = self.get_repository(owner, repo)

        return repository.get("default_branch")

    def get_branch_hash(self, owner: str, repo: str, branch: str):
        if self._verbose:
            print(f'[GITLAB] Calling "get_branch_hash" with owner="{owner}", repo="{repo}", branch="{branch}"')

        project_escaped = self._quote(f"{owner}/{repo}")
        branch_escaped = self._quote(branch)

        url = f"{self._url}/projects/{project_escaped}/repository/branches/{branch_escaped}"

        branch_hash = self._authenticated_get(url).json()
        return branch_hash.get("commit").get("id")

    @staticmethod
    def get_client_from_config(token_location: str, service_url: str, verbose: bool = True):
        aws = AWSConnect()
        auth_config = aws.get_secret(f"{APPLICATION}/{token_location}")

        return Gitlab(auth_config.get("key"), service_url, verbose)

    def _authenticated_get(self, url: str) -> requests.Response:
        response = requests.get(url, headers=self._headers)
        response.raise_for_status()

        return response

    def _quote(self, string: str) -> str:
        return quote(string, safe="")
