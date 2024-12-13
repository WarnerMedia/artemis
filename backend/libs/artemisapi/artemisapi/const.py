from enum import Enum
from http import HTTPStatus

DEFAULT_RESPONSE_MESSAGE_OVERRIDES = {
    HTTPStatus.BAD_REQUEST: "Invalid request",
    HTTPStatus.UNAUTHORIZED: "Unauthenticated",
    HTTPStatus.FORBIDDEN: "Unauthorized",
}

REPO_SEARCH_CICD_TOOL_PARAM = "cicd_tool"

###############################################################################
# API Identifiers
###############################################################################


class SearchRepositoriesAPIIdentifier(Enum):
    GET = "search_repositories_get"


class SearchVulnerabilitiesAPIIdentifier(Enum):
    GET_VULNS = "search_vulnerabilities_get_vulns"
    GET_REPOS = "search_vulnerabilities_get_repos"
