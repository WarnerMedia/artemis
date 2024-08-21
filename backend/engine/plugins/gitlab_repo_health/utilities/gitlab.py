import numbers
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
)


class Gitlab:
    """
    Wrapper class for Gitlab so that we can cache responses and abstract away API calls
    """

    def __init__(self, key, service_url, verbose=True):
        self._verbose = verbose
        self._url = f"https://{service_url}/api/v4"
        self._key = key
        self._headers = {"Authorization": "Bearer %s" % key, "Content-Type": "application/json"}
        if (
            has_rev_proxy_domain_substring()
            and has_rev_proxy_secret_header()
            and get_rev_proxy_domain_substring() in service_url
        ):
            self._headers[get_rev_proxy_secret_header()] = get_rev_proxy_secret()

    @cache
    def are_vulnerability_alerts_enabled(self, owner, repo):
        if self._verbose:
            print(f'[GITLAB] Calling "check vulnerability alerts" with owner="{owner}", repo="{repo}"')

        return self._github.get_repo(f"{owner}/{repo}").get_vulnerability_alert()

    @cache
    def get_actions_permissions_repository(self, owner, repo):
        if self._verbose:
            print(f'[GITLAB] Calling "get_actions_permissions_repository" with owner="{owner}", repo="{repo}"')

        owner_escaped = quote(owner)
        repo_escaped = quote(repo)

        url = f"{self._url}/repos/{owner_escaped}/{repo_escaped}/actions/permissions"

        return self._authenticated_get(url).json()

    @cache
    def get_selected_actions_repository(self, owner, repo):
        if self._verbose:
            print(f'[GITLAB] Calling "get_selected_actions_repository" with owner="{owner}", repo="{repo}"')

        owner_escaped = quote(owner)
        repo_escaped = quote(repo)

        url = f"{self._url}/repos/{owner_escaped}/{repo_escaped}/actions/permissions/selected-actions"

        return self._authenticated_get(url).json()

    @cache
    def get_branch_protection(self, owner, repo, branch):
        if self._verbose:
            print(
                f'[GITLAB] Calling "get_branch_protection" with owner="{owner}", repo="{repo}", and branch="{branch}"'
            )

        project_escaped = self._quote(f"{owner}/{repo}")
        branch_escaped = self._quote(branch)

        url = f"{self._url}/projects/{project_escaped}/protected_branches/{branch_escaped}"

        return self._authenticated_get(url).json()

    @cache
    def get_branch_rules(self, owner, repo, branch):
        if self._verbose:
            print(f'[GITLAB] Calling "get_branch_rules" with owner="{owner}", repo="{repo}", and branch="{branch}"')

        project_escaped = self._quote(f"{owner}/{repo}")
        branch_escaped = self._quote(branch)

        url = f"{self._url}/projects/{project_escaped}/protected_branches/{branch_escaped}"

        return self._authenticated_get(url).json()

    @cache
    def get_repo_ruleset(self, owner, repo, ruleset_id):
        if self._verbose:
            print(
                f'[GITLAB] Calling "get_repo_ruleset" with owner="{owner}", repo="{repo}", and ruleset_id="{ruleset_id}"'
            )

        owner_escaped = quote(owner)
        repo_escaped = quote(repo)
        ruleset_id_escaped = ruleset_id if isinstance(ruleset_id, numbers.Number) else quote(ruleset_id)

        url = f"{self._url}/repos/{owner_escaped}/{repo_escaped}/rulesets/{ruleset_id_escaped}"

        return self._authenticated_get(url).json()

    @cache
    def get_repository(self, owner, repo):
        if self._verbose:
            print(f'[GITLAB] Calling "get_repository" with owner="{owner}", repo="{repo}"')
        project_escaped = quote(f"{owner}/{repo}", safe="")

        url = f"{self._url}/projects/{project_escaped}"
        print(url)
        return self._authenticated_get(url).json()

    @cache
    def get_repository_content(self, owner, repo, path):
        if self._verbose:
            print(f'[GITLAB] Calling "get_repository_content" with owner="{owner}", repo="{repo}", and path="{path}"')

        return self._github.get_repo(f"{owner}/{repo}").get_contents(path).raw_data

    def get_default_branch(self, owner, repo):
        repository = self.get_repository(owner, repo)

        return repository.get("default_branch")

    def get_branch_hash(self, owner, repo, branch):
        if self._verbose:
            print(f'[GITLAB] Calling "get_branch_hash" with owner="{owner}", repo="{repo}", branch="{branch}"')

        project_escaped = self._quote(f"{owner}/{repo}")
        branch_escaped = self._quote(branch)

        url = f"{self._url}/projects/{project_escaped}/repository/branches/{branch_escaped}"

        branch = self._authenticated_get(url).json()
        return branch.get("commit").get("id")

    @staticmethod
    def get_client_from_config(token_location, service_url, verbose=True):
        aws = AWSConnect()
        auth_config = aws.get_secret(token_location)

        return Gitlab(auth_config.get("key"), service_url, verbose)

    def _authenticated_get(self, url):
        response = requests.get(url, headers=self._headers)

        if response.status_code >= 400:
            raise Exception(response.status_code, response.json(), response.headers)
        else:
            return response

    def _quote(self, string: str) -> str:
        return quote(string, safe="")
