from aiohttp import ClientSession
from base64 import b64encode
from dataclasses import dataclass
from typing import TypedDict, Literal, Optional

from artemislib.env import REV_PROXY_DOMAIN_SUBSTRING, REV_PROXY_SECRET_HEADER
from artemislib.github.app import GithubApp
from artemislib.services import VCSConfig, AuthType, ServiceConnectionStatus
from service_connection_metrics.aws import GetProxySecret


@dataclass
class ArtemisService:
    org: str
    service_name: str
    service: VCSConfig


async def test_github(
    session: ClientSession,
    key: str,
    artemis_vcs: ArtemisService,
    status: ServiceConnectionStatus,
) -> ServiceConnectionStatus:
    if artemis_vcs.org:
        # Attempt to get an app installation token for the organization
        github_app = GithubApp()
        token = github_app.get_installation_token(artemis_vcs.org, bypass_cache=True)
        if token:
            status["auth_successful"] = True
            status["reachable"] = True
            status["auth_type"] = AuthType.APP.value
            return status

    # Fall back to getting the PAT
    headers = {"Authorization": f"bearer {key}", "Content-Type": "application/json"}
    url = artemis_vcs.service["url"]
    revproxy = False
    if REV_PROXY_DOMAIN_SUBSTRING and REV_PROXY_DOMAIN_SUBSTRING in url:
        headers[REV_PROXY_SECRET_HEADER] = GetProxySecret()
        revproxy = True

    query = "query { viewer { login } }"
    variables = {}
    if artemis_vcs.org:
        query = "query getLogin($org: String!) {organization(login: $org) {login}}"
        variables["org"] = artemis_vcs.org

    try:
        async with session.post(url=url, headers=headers, json={"query": query, "variables": variables}) as response:
            status["reachable"] = True
            if response.status == 200:
                status["auth_successful"] = True
            else:
                status["auth_successful"] = False
                body = await response.text()
                if revproxy and response.status == 401 and body == "key is invalid":
                    # Request did not make it through the reverse proxy
                    status["reachable"] = False
                    status["error"] = "Reverse proxy authentication failure"
    except Exception as e:
        return _set_request_fail(status, e)

    return status


async def test_gitlab(
    session: ClientSession,
    key: str,
    artemis_vcs: ArtemisService,
    status: ServiceConnectionStatus,
) -> ServiceConnectionStatus:
    revproxy = False
    url = artemis_vcs.service["url"]
    headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}
    if REV_PROXY_DOMAIN_SUBSTRING and REV_PROXY_DOMAIN_SUBSTRING in url:
        headers[REV_PROXY_SECRET_HEADER] = GetProxySecret()
        revproxy = True
    payload = {"query": 'echo(text: "foo")'}

    try:
        async with session.post(url=url, headers=headers, json=payload) as response:
            status["reachable"] = True
            if response.status == 200:
                body = await response.json()
                echo = body.get("data", {}).get("echo", "")
                if echo != "nil says: foo":
                    status["auth_successful"] = True
                else:
                    status["auth_successful"] = False
            else:
                status["auth_successful"] = False
                body = await response.text()
                if revproxy and response.status == 401 and body == "key is invalid":
                    # Request did not make it through the reverse proxy
                    status["reachable"] = False
                    status["error"] = "Reverse proxy authentication failure"
    except Exception as e:
        return _set_request_fail(status, e)

    return status


async def test_ado(
    session: ClientSession,
    key: str,
    artemis_vcs: ArtemisService,
    status: ServiceConnectionStatus,
) -> ServiceConnectionStatus:
    headers = {"Authorization": "Basic %s" % _base64_encode(key), "Accept": "application/json"}
    url = f"{artemis_vcs.service['url']}/{artemis_vcs.org}/_apis/projects"
    try:
        async with session.get(url=url, headers=headers) as response:
            status["reachable"] = True
            if response.status == 200:
                status["auth_successful"] = True
            else:
                status["auth_successful"] = False
    except Exception as e:
        return _set_request_fail(status, e)

    return status


def _base64_encode(text: str, input_encoding="utf-8", output_encoding="utf-8") -> str:
    return b64encode(bytes(text, input_encoding)).decode(output_encoding)


async def test_bitbucket(
    session: ClientSession,
    key: str,
    artemis_vcs: ArtemisService,
    status: ServiceConnectionStatus,
    service_auth_url: str,
    repo_auth_url: Optional[str] = None,
) -> ServiceConnectionStatus:
    headers = {"Authorization": f"Basic {key}", "Accept": "application/json"}
    revproxy = False

    if REV_PROXY_DOMAIN_SUBSTRING and REV_PROXY_DOMAIN_SUBSTRING in artemis_vcs.service["url"]:
        headers[REV_PROXY_SECRET_HEADER] = GetProxySecret()
        revproxy = True

    try:
        async with session.get(url=service_auth_url, headers=headers) as response:
            status["reachable"] = True
            if response.status == 200:
                status["auth_successful"] = True

                if repo_auth_url:
                    async with session.get(url=repo_auth_url, headers=headers) as repo_response:
                        if repo_response.status == 200:
                            body = await repo_response.json()
                            status["auth_successful"] = body.get("size", 0) == 1
                        else:
                            status["auth_successful"] = False
                            if revproxy and repo_response.status == 401:
                                body = await repo_response.text()
                                if body == "key is invalid":
                                    status["reachable"] = False
                                    status["error"] = "Reverse proxy authentication failure"
            else:
                status["auth_successful"] = False
                if revproxy and response.status == 401:
                    body = await response.text()
                    if body == "key is invalid":
                        status["reachable"] = False
                        status["error"] = "Reverse proxy authentication failure"
    except Exception as e:
        return _set_request_fail(status, e)

    return status


async def test_bitbucket_v1(
    session: ClientSession,
    key: str,
    artemis_vcs: ArtemisService,
    status: ServiceConnectionStatus,
) -> ServiceConnectionStatus:
    repo_auth_url = ""
    if artemis_vcs.org:
        org, repo = artemis_vcs.org.split("/", 1)
        repo_auth_url = f"{artemis_vcs.service['url']}/projects/{org}/repos/{repo}"

    service_auth_url = f"{artemis_vcs.service['url']}/projects"
    return await test_bitbucket(session, key, artemis_vcs, status, service_auth_url, repo_auth_url)


async def test_bitbucket_v2(
    session: ClientSession,
    key: str,
    artemis_vcs: ArtemisService,
    status: ServiceConnectionStatus,
) -> ServiceConnectionStatus:
    url = artemis_vcs.service["url"]
    repo_auth_url = ""
    if artemis_vcs.org:
        repo_auth_url = f'{url}/user/permissions/workspaces?q=workspace.slug="{artemis_vcs.org}"'

    service_auth_url = f"{url}/user"
    return await test_bitbucket(session, key, artemis_vcs, status, service_auth_url, repo_auth_url)


def _set_request_fail(status: ServiceConnectionStatus, error: Exception):
    """
    Set the failure state for a request error, with an optional error message.

    Request errors are considered to be reachability failures for the purposes of system status.
    """
    status["reachable"] = False
    status["auth_successful"] = False
    status["error"] = str(error)
    return status
