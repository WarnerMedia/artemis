from functools import cache
from urllib.parse import quote

import requests
from octokit import Octokit

from . import GetRepositoryException, environment

API_BASE_URL = "https://api.github.com"
SCOPES_HEADER_NAME = "X-OAuth-Scopes"

GITHUB_API_NAME_HEADER = "X-GitHub-Api-Version"
GITHUB_API_NAME = "2022-11-28"


class Github:
    """
    Wrapper class for Octokit so that we can cache responses and abstract away API calls

    It is recommended to get a new object through the get_authenticated_client() static method
    """

    def __init__(self, octokit, verbose=False):
        self._github = octokit
        self._verbose = verbose

    @cache
    def check_vulnerability_alerts(self, owner, repo):
        if self._verbose:
            print(f'[GITHUB] Calling "check vulnerability alerts" with owner="{owner}", repo="{repo}"')

        return self._github.repos.check_vulnerability_alerts(owner=owner, repo=repo).json

    @cache
    def get_actions_permissions_repository(self, owner, repo):
        if self._verbose:
            print(f'[GITHUB] Calling "get_actions_permissions_repository" with owner="{owner}", repo="{repo}"')

        token = self._github.token
        headers = {"Authorization": f"token {token}", GITHUB_API_NAME_HEADER: GITHUB_API_NAME}

        owner_escaped = quote(owner)
        repo_escaped = quote(repo)

        url = f"{API_BASE_URL}/repos/{owner_escaped}/{repo_escaped}/actions/permissions"

        return requests.get(url, headers=headers).json()

    @cache
    def get_selected_actions_repository(self, owner, repo):
        if self._verbose:
            print(f'[GITHUB] Calling "get_selected_actions_repository" with owner="{owner}", repo="{repo}"')

        token = self._github.token
        headers = {"Authorization": f"token {token}", GITHUB_API_NAME_HEADER: GITHUB_API_NAME}

        owner_escaped = quote(owner)
        repo_escaped = quote(repo)

        url = f"{API_BASE_URL}/repos/{owner_escaped}/{repo_escaped}/actions/permissions/selected-actions"
        response = requests.get(url, headers=headers)

        return response.json()

    @cache
    def get_branch_protection(self, owner, repo, branch):
        if self._verbose:
            print(
                f'[GITHUB] Calling "get branch protection" with owner="{owner}", repo="{repo}", and branch="{branch}"'
            )

        return self._github.repos.get_branch_protection(owner=owner, repo=repo, branch=branch).json

    @cache
    def get_repository(self, owner, repo):
        if self._verbose:
            print(f'[GITHUB] Calling "get repository" with owner="{owner}", repo="{repo}"')

        return self._github.repos.get(owner=owner, repo=repo).json

    @cache
    def get_repository_content(self, owner, repo, path):
        if self._verbose:
            print(f'[GITHUB] Calling "get repository content" with owner="{owner}", repo="{repo}", and path="{path}"')

        return self._github.repos.get_repository_content(owner=owner, repo=repo, path=path).json

    def get_default_branch(self, owner, repo):
        repository = self.get_repository(owner, repo)

        err_message = repository.get("message")
        if err_message:
            raise GetRepositoryException(f'Problem getting repository "{owner}/{repo}": {err_message}')

        return repository.get("default_branch")

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
        octokit = Octokit(auth="token", token=token)

        return Github(octokit)

    @staticmethod
    def get_client_from_app(id, private_key):
        octokit = Octokit(auth="installation", app_id=id, private_key=private_key)

        return Github(octokit)
