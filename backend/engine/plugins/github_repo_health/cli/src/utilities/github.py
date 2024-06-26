from functools import cache
from urllib.parse import quote

import requests

from github import Auth as GithubAuth, Github as GithubClient

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

        token = self._auth.token
        headers = self._get_request_headers(token)

        owner_escaped = quote(owner)
        repo_escaped = quote(repo)

        url = f"{API_BASE_URL}/repos/{owner_escaped}/{repo_escaped}/actions/permissions"

        return requests.get(url, headers=headers).json()

    @cache
    def get_selected_actions_repository(self, owner, repo):
        if self._verbose:
            print(f'[GITHUB] Calling "get_selected_actions_repository" with owner="{owner}", repo="{repo}"')

        token = self._auth.token
        headers = self._get_request_headers(token)

        owner_escaped = quote(owner)
        repo_escaped = quote(repo)

        url = f"{API_BASE_URL}/repos/{owner_escaped}/{repo_escaped}/actions/permissions/selected-actions"
        response = requests.get(url, headers=headers)

        return response.json()

    @cache
    def get_branch_protection(self, owner, repo, branch):
        if self._verbose:
            print(
                f'[GITHUB] Calling "get_branch_protection" with owner="{owner}", repo="{repo}", and branch="{branch}"'
            )

        return self._github.get_repo(f"{owner}/{repo}").get_branch(branch).get_protection().raw_data

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

    def _get_request_headers(self, token):
        return {"Authorization": f"token {token}", GITHUB_API_NAME_HEADER: GITHUB_API_NAME}
