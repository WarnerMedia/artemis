from enum import Enum

RESOURCE_REPOS_SHORT = "repos"
RESOURCE_REPOS_LONG = "repositories"


class SearchVulnerabilitiesAPIIdentifier(Enum):
    GET_VULNS = "search_vulnerabilities_get_vulns"
    GET_REPOS = "search_vulnerabilities_get_repos"
