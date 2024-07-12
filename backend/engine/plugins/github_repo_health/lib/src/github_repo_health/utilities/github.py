import numbers
from functools import cache
from urllib.parse import quote

import requests
from github import Auth as GithubAuth
from github import Github as GithubClient
from github import GithubException

from . import environment

API_BASE_URL = "https://api.github.com"
GITHUB_API_NAME_HEADER = "X-GitHub-Api-Version"
GITHUB_API_NAME = "2022-11-28"


class Github:
    """
    Wrapper class for PyGithub so that we can cache responses and abstract away API calls

    It is recommended to get a new object through the get_authenticated_client() static method
    """

    def __init__(self, auth, verbose=False):
        self._auth = auth
        self._verbose = verbose

        self._github = GithubClient(auth=self._auth)

    @cache
    def are_vulnerability_alerts_enabled(self, owner, repo):
        if self._verbose:
            print(f'[GITHUB] Calling "check vulnerability alerts" with owner="{owner}", repo="{repo}"')

        return self._github.get_repo(f"{owner}/{repo}").get_vulnerability_alert()

    @cache
    def get_actions_permissions_repository(self, owner, repo):
        if self._verbose:
            print(f'[GITHUB] Calling "get_actions_permissions_repository" with owner="{owner}", repo="{repo}"')

        owner_escaped = quote(owner)
        repo_escaped = quote(repo)

        url = f"{API_BASE_URL}/repos/{owner_escaped}/{repo_escaped}/actions/permissions"

        return self._authenticated_get(url).json()

    @cache
    def get_selected_actions_repository(self, owner, repo):
        if self._verbose:
            print(f'[GITHUB] Calling "get_selected_actions_repository" with owner="{owner}", repo="{repo}"')

        owner_escaped = quote(owner)
        repo_escaped = quote(repo)

        url = f"{API_BASE_URL}/repos/{owner_escaped}/{repo_escaped}/actions/permissions/selected-actions"

        return self._authenticated_get(url).json()

    @cache
    def get_branch_protection(self, owner, repo, branch):
        if self._verbose:
            print(
                f'[GITHUB] Calling "get_branch_protection" with owner="{owner}", repo="{repo}", and branch="{branch}"'
            )

        return self._github.get_repo(f"{owner}/{repo}").get_branch(branch).get_protection().raw_data

    @cache
    def get_branch_rules(self, owner, repo, branch):
        if self._verbose:
            print(f'[GITHUB] Calling "get_branch_rules" with owner="{owner}", repo="{repo}", and branch="{branch}"')

        owner_escaped = quote(owner)
        repo_escaped = quote(repo)
        branch_escaped = quote(branch)

        url = f"{API_BASE_URL}/repos/{owner_escaped}/{repo_escaped}/rules/branches/{branch_escaped}"

        return self._authenticated_get(url).json()

    @cache
    def get_repo_ruleset(self, owner, repo, ruleset_id):

        if self._verbose:
            print(
                f'[GITHUB] Calling "get_repo_ruleset" with owner="{owner}", repo="{repo}", and ruleset_id="{ruleset_id}"'
            )

        owner_escaped = quote(owner)
        repo_escaped = quote(repo)
        ruleset_id_escaped = ruleset_id if isinstance(ruleset_id, numbers.Number) else quote(ruleset_id)

        url = f"{API_BASE_URL}/repos/{owner_escaped}/{repo_escaped}/rulesets/{ruleset_id_escaped}"

        return self._authenticated_get(url).json()

    @cache
    def get_repository(self, owner, repo):
        if self._verbose:
            print(f'[GITHUB] Calling "get_repository" with owner="{owner}", repo="{repo}"')

        return self._github.get_repo(f"{owner}/{repo}").raw_data

    @cache
    def get_repository_content(self, owner, repo, path):
        if self._verbose:
            print(f'[GITHUB] Calling "get_repository_content" with owner="{owner}", repo="{repo}", and path="{path}"')

        return self._github.get_repo(f"{owner}/{repo}").get_contents(path).raw_data

    def get_default_branch(self, owner, repo):
        repository = self.get_repository(owner, repo)

        return repository.get("default_branch")

    def get_branch_hash(self, owner, repo, branch):
        if self._verbose:
            print(f'[GITHUB] Calling "get_branch_hash" with owner="{owner}", repo="{repo}", branch="{branch}"')

        branch = self._github.get_repo(f"{owner}/{repo}").get_branch(branch).raw_data

        return branch.get("commit", {}).get("sha")

    @staticmethod
    def get_authenticated_client(verbose=False):
        if environment.has_github_token():
            if verbose:
                print("[GITHUB] Authenticating with token")

            token = environment.get_github_token()

            return Github.get_client_from_token(token)
        elif environment.has_github_installation_id() and environment.has_github_installation_private_key():
            if verbose:
                print("[GITHUB] Authenticating with Github App")

            installation_id = environment.get_github_installation_id()
            private_key = environment.get_github_installation_private_key()

            return Github.get_client_from_app(installation_id, private_key)
        else:
            raise Exception("No github credentials found in environment variables")

    @staticmethod
    def get_client_from_token(token):
        auth = GithubAuth.Token(token)

        return Github(auth)

    @staticmethod
    def get_client_from_app(id, private_key):
        auth = GithubAuth.AppAuth(id, private_key)

        return Github(auth)

    def _authenticated_get(self, url):
        # For the more obscure Github REST API endpoints that aren't exposed through PyGithub.
        # We hit them with `requests` directly and then raise a GithubException if the request
        # errored

        token = self._auth.token
        headers = self._get_request_headers(token)

        response = requests.get(url, headers=headers)

        if response.status_code >= 400:
            raise GithubException(response.status_code, response.json(), response.headers)
        else:
            return response

    def _get_request_headers(self, token):
        return {
            "Authorization": f"token {token}",
            GITHUB_API_NAME_HEADER: GITHUB_API_NAME,
        }
