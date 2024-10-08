# pylint: disable=no-member
from typing import Union

import requests
from aws_lambda_powertools import Logger

from heimdall_orgs.const import TIMEOUT
from heimdall_utils.aws_utils import GetProxySecret
from heimdall_utils.env import APPLICATION
from heimdall_utils.utils import JSONUtils, HeimdallException
from heimdall_utils.variables import REV_PROXY_DOMAIN_SUBSTRING, REV_PROXY_SECRET_HEADER

log = Logger(service=APPLICATION, name=__name__, child=True)

GITHUB_ORG_QUERY = """
query getLogin($cursor: String) {
  organizations(first: 100, after: $cursor){nodes{login}, pageInfo{startCursor, endCursor, hasNextPage}}
}
"""


class GithubOrgs:
    def __init__(self, service: str, api_url: str, api_key: str, has_next_page=True, cursor=None):
        """
        gets organizations for github enterprise services
        :param service: str name of the service
        :param api_url: str url of the service including the api endpoint to be used.
        :param api_key: str service api key
        """
        self.service = service
        self.api_url = api_url
        self.api_key = api_key
        self.org_set = set()
        self.json_utils = JSONUtils(log)
        self.has_next_page = has_next_page
        self.cursor = cursor

    @classmethod
    def get_all_orgs(cls, service, api_url, api_key):
        """
        Gets all the available orgs for a private github server
        """
        github_orgs = cls(service, api_url, api_key)
        if not github_orgs.get_org_set():
            raise HeimdallException(f"Unexpected error occurred getting {service}")

        while github_orgs.has_next_page:
            github_orgs.get_org_set()

        log.info(
            "Queuing %d service orgs for service %s",
            len(github_orgs.org_set),
            service,
        )
        return github_orgs.org_set

    def get_org_set(self) -> bool:
        response = self._request_orgs(self.cursor)
        if not response:
            return False
        response_orgs = response.get("data", {}).get("organizations", {})
        response_page_info = response_orgs.get("pageInfo")
        self.has_next_page = response_page_info.get("hasNextPage")
        self.org_set.update(_process_orgs(response_orgs))
        self.cursor = response_page_info.get("endCursor")
        return True

    def _request_orgs(self, cursor=None) -> Union[dict, None]:
        """
        Gets orgs from the service, using the service API.
        NOTE: Current logic only supports private github services.
        :param cursor: where to start in the query
        :return: dict response
        """
        if cursor in {"null", "None", None}:
            cursor = None
        else:
            cursor = f'"{cursor}"'
        if not self.api_url:
            log.info("Service %s url was not found and therefore deemed unsupported", self.service)
            return None
        response = self._query_service(GITHUB_ORG_QUERY, cursor)

        return response

    def _query_service(self, query, cursor):
        if not self.api_url:
            log.info(
                "Service %s url was not found and therefore deemed unsupported",
                self.service,
            )
            return None
        headers = {
            "Authorization": "bearer %s" % self.api_key,
            "Content-Type": "application/json",
        }
        if REV_PROXY_DOMAIN_SUBSTRING and REV_PROXY_DOMAIN_SUBSTRING in self.api_url:
            headers[REV_PROXY_SECRET_HEADER] = GetProxySecret()

        try:
            response = requests.post(
                url=self.api_url,
                headers=headers,
                json={"query": query, "variables": {"cursor": cursor}},
                timeout=TIMEOUT,
            )
        except requests.exceptions.Timeout:
            raise HeimdallException(f"Request timed out after {TIMEOUT}s retrieving orgs for {self.service}")
        except requests.ConnectionError as e:
            raise HeimdallException(f"Error connecting to {self.service}: {e}")

        if response.status_code != 200 or response is None:
            log.info("Error retrieving orgs for %s: %s", self.service, response.text)
            return None

        response = response.json()

        errors = response.get("errors", None)
        if errors:
            log.info("Error in GraphQL query for %s. Error Message: %s", self.service, errors)
            return None

        return response


def _process_orgs(org_dict: dict) -> set:
    org_output_set = set()
    org_list = org_dict.get("nodes", {})

    for org in org_list:
        org_output_set.add(org.get("login"))
    return org_output_set
