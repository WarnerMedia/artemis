# pylint: disable=no-member
from enum import Enum
import json
import os
from fnmatch import fnmatch
from typing import Any, Union, TypedDict, Literal

from artemislib.aws import S3_BUCKET, AWSConnect
from artemislib.consts import SERVICES_S3_KEY
from artemislib.logging import Logger

log = Logger(__name__)


class AuthType(Enum):
    APP = "app"
    SVC = "service_account"


class ServiceType(str, Enum):
    ADO = "ado"
    BITBUCKET_V1 = "bitbucket_v1"
    BITBUCKET_V2 = "bitbucket_v2"
    GITHUB = "github"
    GITLAB = "gitlab"


class VCSConfig(TypedDict):
    """Configuration of a VCS service integration"""

    secret_loc: str
    type: Literal["ado", "bitbucket_v1", "bitbucket_v2", "github", "gitlab"]
    hostname: str
    url: str
    branch_url: str
    diff_url: str
    allow_all: bool
    api_key_add: str
    use_deploy_key: bool
    batch_queries: bool
    nat_connect: bool
    app_integration: bool
    http_basic_auth: bool
    initial_page: str
    secrets_management: dict
    application_metadata: dict


def _get_services_from_file(service_file="services.json") -> Union[Any, None]:
    if os.path.exists(service_file):
        with open(service_file) as services_file:
            return json.load(services_file)
    log.error(
        "%s not found or could not load contents into dictionary,services will be unrecognized and invalidated",
        service_file,
    )
    return None


def _get_services_s3_object(s3_key) -> Any:
    aws_connect = AWSConnect()
    s3_object = aws_connect.get_s3_object(s3_key)
    return json.loads(s3_object.get()["Body"].read().decode("utf-8"))


def get_services_dict(services_loc: str = SERVICES_S3_KEY) -> Union[Any, None]:
    if S3_BUCKET:
        return _get_services_s3_object(services_loc)
    log.warning("S3_BUCKET is None, please confirm this is a testing environment.")
    return _get_services_from_file(services_loc)


class InvalidServicesPatternError(Exception):
    pass


class ServiceParser:
    def __init__(self, scan_orgs):
        self.scan_orgs = {}
        for org in scan_orgs:
            # Build up a mapping of service names and service/org names to full fnmatch-compatible wildcard patterns.
            # Strip out the repo part of an org pattern if it has one.
            split = org.split("/")
            self.scan_orgs[org.replace("/*", "")] = f"{split[0]}/{split[1]}" if len(split) > 2 else org

    def get_services_and_orgs(self, scopes) -> list:
        """
        Builds the list of services and orgs match the scopes provided
        """
        service_orgs = set()

        for scope in scopes:
            # Strip off the repo part of the scope if it exists
            split = scope.split("/")
            test_scope = f"{split[0]}/{split[1]}" if len(split) > 2 else scope

            for org in self.scan_orgs:
                # Check if the scope matches the org...
                #
                # The first fnmatch() matches if the scope is a superset of the org
                #   Example:
                #     - Org: service/org
                #     - Scope: service/*
                #   Example:
                #     - Org: service/org1
                #     - Scope: service/org*
                #
                # The second fnmatch() matches if the org is a superset of the scope
                #   Example:
                #     - Org: service/*
                #     - Scope: service/org
                #
                # If the scope is equal to the org both will match.
                #
                # Neither fnmatch() will match if the scope and org are different
                #   Example:
                #     - Org: service/org1
                #     - Scope: service/org2
                #   Example:
                #     - Org: service/*
                #     - Scope: otherservice/*
                first = fnmatch(self.scan_orgs[org], test_scope)
                second = fnmatch(test_scope, self.scan_orgs[org])

                if first or second:
                    service_orgs.add(org)

        # Convert the set to a list and sort
        return sorted(list(service_orgs))


def get_services_and_orgs_for_scope(authz) -> list:
    # Load services.json
    services_dict = get_services_dict(SERVICES_S3_KEY)

    # Start with the repos list. These are the service/orgs when we
    # only scan a subset of the whole VCS (like public GitHub).
    repo_list = services_dict.get("repos", [])

    # Loop through the service definitions
    for service in services_dict.get("services", {}):
        # If the service is set to allow all then it's not in the
        # repo list so append to the list it with a wildcard
        if services_dict["services"][service].get("allow_all", False):
            repo_list.append(f"{service}/*")

    # Apply the user's scope to the repo list
    service_parser = ServiceParser(repo_list)
    scan_orgs = service_parser.get_services_and_orgs(authz)
    return scan_orgs
