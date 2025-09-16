import json
from typing import TypedDict, Literal, Optional
from artemisdb.artemisdb.models import Repo, Scan, User
from artemislib.datetime import format_timestamp
from artemislib.logging import Logger
from artemislib.memcached import get_memcache_client
from artemislib.services import ServiceType, AuthType, ServiceConnectionStatus

log = Logger(__name__)


class Service:
    def __init__(self, scan_org, services_dict) -> None:
        self.name = scan_org.lower()
        self._org = None
        if "/" in self.name:
            self._service_name, self._org = self.name.split("/", 1)
        else:
            self._service_name = self.name
        self._service = services_dict["services"][self._service_name]
        self._auth_type = AuthType.SVC

        # Update Bitbucket Service Type
        if self._service["type"] in ServiceType.BITBUCKET_V2:
            self._service["type"] = ServiceType.BITBUCKET_V2
            if "/1.0" in self._service["url"]:
                self._service["type"] = ServiceType.BITBUCKET_V1

    def to_dict(self) -> ServiceConnectionStatus:
        client = get_memcache_client()
        key = f"service_connection_status:{self.name}"
        result = client.get(key)

        if result:
            log.debug(f"Cache hit for service: {key}")
            return json.loads(result.decode())

        return {
            "service": self.name,
            "service_type": self._service["type"],
            "reachable": False,
            "auth_successful": False,
            "auth_type": self._auth_type.value,
            "error": f"Could not find entry for {self.name}",
        }

    def stats_to_dict(self, scope: list[list[list[str]]]):
        self._get_service_stats(scope)
        return {
            "service": self.name,
            "repo_count": self._repo_count,
            "total_scans": self._total_scan_count,
            "successful_scans": self._successful_scan_count,
            "failed_scans": self._failed_scan_count,
            "timestamps": {
                "oldest_scan": self._oldest_scan_timestamp,
                "latest_scan": self._latest_scan_timestamp,
            },
        }

    def _get_service_stats(self, scope: list[list[list[str]]]):
        repos = Repo.in_scope(scope).filter(service=self._service_name).order_by("repo")
        if self._org:
            repos = repos.filter(repo__startswith=f"{self._org}/")

        self._repo_count = repos.count()

        scans = Scan.objects.filter(repo__in=repos).order_by("created")

        self._total_scan_count = scans.count()
        self._successful_scan_count = scans.filter(status="completed").count()
        self._failed_scan_count = scans.filter(status="error").count()

        self._oldest_scan_timestamp = format_timestamp(scans.first().created)
        self._latest_scan_timestamp = format_timestamp(scans.last().created)

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
