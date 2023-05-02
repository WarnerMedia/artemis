import requests
from artemisdb.artemisdb.models import User
from artemislib.github.app import GithubApp
from artemislib.logging import Logger
from system_services.util.const import AuthType
from system_services.util.env import (
    APPLICATION,
    REV_PROXY_DOMAIN_SUBSTRING,
    REV_PROXY_SECRET,
    REV_PROXY_SECRET_HEADER,
    REV_PROXY_SECRET_REGION,
)

log = Logger(__name__)


class Service:
    def __init__(self, scan_org, services_dict) -> None:
        self.name = scan_org.lower()
        self._org = None
        if "/" in self.name:
            _service_name, self._org = self.name.split("/", 1)
        else:
            _service_name = self.name
        self._service = services_dict["services"][_service_name]
        self._reachable = False
        self._auth_successful = False
        self._auth_type = AuthType.SVC
        self._error = None

    def to_dict(self):
        self._test_auth()
        return {
            "service": self.name,
            "type": self._service["type"],
            "reachable": self._reachable,
            "auth_successful": self._auth_successful,
            "auth_type": self._auth_type.value,
            "error": self._error,
        }

    @classmethod
    def get_services(cls, email: str, services_dict: dict):
        ret = []
        try:
            user = User.objects.get(email=email, deleted=False)
            for scan_org in user.scan_orgs:
                ret.append(Service(scan_org, services_dict))
            return ret
        except User.DoesNotExist:
            return []

    def _test_auth(self):
        key = get_api_key(self._service["secret_loc"])
        if key is None:
            self._error = "Unable to retrieve key"

        if self._service["type"] == "github":
            self._test_github(key)
        elif self._service["type"] == "gitlab":
            self._test_gitlab(key)
        elif self._service["type"] == "bitbucket":
            self._test_bitbucket(key)
        elif self._service["type"] == "ado":
            self._test_ado(key)

    def _test_github(self, key: str):
        try:
            requests.get(url=self._service["url"], timeout=3)
            self._reachable = True
        except requests.ConnectionError:
            self._reachable = False
            self._auth_successful = False
            return

        if self._org is not None:
            # Attempt to get an app installation token for the organization
            github_app = GithubApp()
            token = github_app.get_installation_token(self._org, bypass_cache=True)
            if token is not None:
                self._auth_successful = True
                self._auth_type = AuthType.APP
                self._error = None
                return

        # Fall back to getting the PAT
        revproxy = False
        headers = {"Authorization": "bearer %s" % key, "Content-Type": "application/json"}
        if REV_PROXY_DOMAIN_SUBSTRING and REV_PROXY_DOMAIN_SUBSTRING in self._service["url"]:
            headers[REV_PROXY_SECRET_HEADER] = GetProxySecret()
            revproxy = True

        if self._org is not None:
            try:
                response = requests.post(
                    url=self._service["url"],
                    headers=headers,
                    json={"query": 'organization(login: "%s") { login }' % self._org},
                    timeout=3,
                )
                if response.status_code == 200:
                    self._auth_successful = True
                    self._auth_type = AuthType.SVC
                else:
                    self._auth_successful = False
                    if revproxy and response.status_code == 401 and response.text == "key is invalid":
                        # Request did not make it through the reverse proxy
                        self._reachable = False
                        self._error = "Reverse proxy authentication failure"
            except requests.ConnectionError:
                self._reachable = False
                self._auth_successful = False

    def _test_gitlab(self, key: str):
        revproxy = False
        headers = {"Authorization": "Bearer %s" % key, "Content-Type": "application/json"}
        if REV_PROXY_DOMAIN_SUBSTRING and REV_PROXY_DOMAIN_SUBSTRING in self._service["url"]:
            headers[REV_PROXY_SECRET_HEADER] = GetProxySecret()
            revproxy = True

        try:
            response = requests.post(
                url=self._service["url"], headers=headers, json={"query": 'echo(text: "foo")'}, timeout=3
            )
            self._reachable = True
            if response.status_code == 200:
                echo = response.json().get("data", {}).get("echo", "")
                if echo == "nil says: foo":
                    self._auth_successful = False
                else:
                    self._auth_successful = True
            else:
                self._auth_successful = False
                if revproxy and response.status_code == 401 and response.text == "key is invalid":
                    # Request did not make it through the reverse proxy
                    self._reachable = False
                    self._error = "Reverse proxy authentication failure"
        except requests.ConnectionError:
            self._reachable = False
            self._auth_successful = False

    def _test_bitbucket(self, key: str):
        revproxy = False
        headers = {"Authorization": "Basic %s" % key, "Accept": "application/json"}
        if REV_PROXY_DOMAIN_SUBSTRING and REV_PROXY_DOMAIN_SUBSTRING in self._service["url"]:
            headers[REV_PROXY_SECRET_HEADER] = GetProxySecret()
            revproxy = True

        try:
            response = requests.get(url=f'{self._service["url"]}/user', headers=headers, timeout=3)
            self._reachable = True
            if response.status_code == 200:
                if not self._org:
                    self._auth_successful = True
                else:
                    response = requests.get(
                        url=f'{self._service["url"]}/user/permissions/workspaces?q=workspace.slug="{self._org}"',
                        headers=headers,
                        timeout=3,
                    )
                    if response.status_code == 200 and response.json().get("size", 0) == 1:
                        self._auth_successful = True
                    else:
                        self._auth_successful = False
                        if revproxy and response.status_code == 401 and response.text == "key is invalid":
                            # Request did not make it through the reverse proxy
                            self._reachable = False
                            self._error = "Reverse proxy authentication failure"
            else:
                self._auth_successful = False
                if revproxy and response.status_code == 401 and response.text == "key is invalid":
                    # Request did not make it through the reverse proxy
                    self._reachable = False
                    self._error = "Reverse proxy authentication failure"
        except requests.ConnectionError:
            self._reachable = False
            self._auth_successful = False

    def _test_ado(self, key: str):
        headers = {"Authorization": "Basic %s" % key, "Accept": "application/json"}
        try:
            response = requests.get(f'{self._service["url"]}/{self._org}/_apis/projects', headers=headers)
            self._reachable = True
            if response.status_code == 200:
                self._auth_successful = True
            else:
                self._auth_successful = False
        except requests.ConnectionError:
            self._reachable = False
            self._auth_successful = False
        return


class GetProxySecret:
    _secret = None

    def __new__(cls):
        if not cls._secret:
            from repo.util.aws import AWSConnect  # pylint: disable=import-outside-toplevel

            aws_connect = AWSConnect(region=REV_PROXY_SECRET_REGION)
            cls._secret = aws_connect.get_key(REV_PROXY_SECRET)["SecretString"]
        return cls._secret


def get_api_key(service_secret):
    from artemislib.aws import AWSConnect, ClientError  # pylint: disable=import-outside-toplevel

    aws_connect = AWSConnect()
    try:
        secret = aws_connect.get_secret(f"{APPLICATION}/{service_secret}")
        if secret:
            return secret.get("key")
    except ClientError:
        return None
    return None
