from enum import Enum


class AuthType(Enum):
    APP = "app"
    SVC = "service_account"


class Resources(str, Enum):
    STATS = "stats"


class ServiceType(str, Enum):
    ADO = "ado"
    BITBUCKET = "bitbucket"
    GITHUB = "github"
    GITLAB = "gitlab"
