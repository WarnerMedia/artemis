from enum import Enum


class AuthType(Enum):
    APP = "app"
    SVC = "service_account"


class Resources(str, Enum):
    STATS = "stats"


class ServiceType(str, Enum):
    ADO = "ado"
    BITBUCKET_V1 = "bitbucket_v1"
    BITBUCKET_V2 = "bitbucket_v2"
    GITHUB = "github"
    GITLAB = "gitlab"
