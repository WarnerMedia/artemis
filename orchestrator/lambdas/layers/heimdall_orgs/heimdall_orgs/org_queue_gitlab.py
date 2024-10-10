# pylint: disable=no-name-in-module, no-member
from typing import Tuple, Union

import requests
from aws_lambda_powertools import Logger

from heimdall_orgs.const import TIMEOUT
from heimdall_utils.aws_utils import GetProxySecret
from heimdall_utils.env import APPLICATION
from heimdall_utils.utils import HeimdallException
from heimdall_utils.variables import REV_PROXY_DOMAIN_SUBSTRING, REV_PROXY_SECRET_HEADER

log = Logger(service=APPLICATION, name=__name__, child=True)


class GitlabOrgs:
    def __init__(self, service: str, api_url: str, api_key: str):
        """
        gets groups and subgroups
        :param service: str name of the service
        :param api_url: str url of the service including the api endpoint to be used.
        :param api_key: str service api key
        """
        self.service = service
        self.api_url = api_url
        self.api_key = api_key

    @classmethod
    def get_groups_and_subgroups(cls, service: str, api_url: str, api_key: str) -> set:
        """
        Gets and returns all gitlab groups and subgroups
        """
        gitlab_orgs = cls(service, api_url, api_key)
        group_set = gitlab_orgs._get_all_groups()
        subgroups = set()
        for group in group_set:
            subgroups.update(gitlab_orgs._get_all_subgroups(group))
        group_set.update(subgroups)
        log.info("Queuing %d service orgs for service %s", len(group_set), service)
        return group_set

    def _get_all_groups(self) -> set:
        response = self._request_orgs()
        if not response:
            return set()
        headers = response.headers
        total_pages = int(headers.get("X-Total-Pages", 0))
        org_set = _process_org_response(response)

        if total_pages and total_pages > 1:
            for page in range(2, total_pages + 1):
                temp_resp = self._request_orgs(page)
                temp_set = _process_org_response(temp_resp)
                org_set.update(temp_set)

        return org_set

    def _get_all_subgroups(self, group: Tuple[str, int]):
        """
        takes a gitlab group and recursively gets all associated subgroups
        """
        subgroups = self._request_subgroups(group)
        index = 0
        while index < len(subgroups):
            subgroups.extend(self._request_subgroups(subgroups[index]["id"]))
            index += 1
        return [str(subgroup["full_path"]) for subgroup in subgroups]

    def _request_subgroups(self, group: Tuple[str, int]) -> list:
        """Grabs the subgroup ids of a group if they exist.
        NOTE: subgroups can only be referenced by ID.
        """
        url = f"{self.api_url}/groups/{group}/subgroups?all_available=true&per_page=100"
        response = self._query_gitlab_api(url)
        if not response or response == "[]":
            return []
        total_pages = int(response.headers.get("X-Total-Pages") or 0)
        subgroups = response.json()

        # Get other pages of subgroups if more than 100
        if total_pages > 1:
            for page in range(2, total_pages + 1):
                page_url = f"{url}&page={page}"
                page_response = self._query_gitlab_api(page_url)
                if page_response:
                    page_response = page_response.json()
                    subgroups.extend(page_response)

        return subgroups

    def _request_orgs(self, page: int = 1) -> Union[requests.Response, None]:
        """
        Gets all groups from the service, using the service API.
        NOTE: Current logic only supports private gitlab services.
        :param page: int page for
        :return: dict response
        """
        if not self.api_url:
            log.info("Service %s url was not found and therefore deemed unsupported", self.service)
            return None
        url = f"{self.api_url}/groups?all_available=true&per_page=100&page={page}"
        response = self._query_gitlab_api(url)
        if not response:
            log.info("Error retrieving orgs for %s", self.service)
            return None
        return response

    def _query_gitlab_api(self, url: str) -> Union[requests.Response, None]:
        log.debug("GitLab API request: %s", url)
        headers = {"Authorization": "bearer %s" % self.api_key, "Content-Type": "application/json"}
        if REV_PROXY_DOMAIN_SUBSTRING and REV_PROXY_DOMAIN_SUBSTRING in url:
            headers[REV_PROXY_SECRET_HEADER] = GetProxySecret()

        try:
            response = requests.get(url=url, headers=headers, timeout=TIMEOUT)
        except requests.exceptions.Timeout:
            raise HeimdallException(f"Request timed out after {TIMEOUT}s retrieving orgs for {self.service}")
        except requests.ConnectionError as e:
            raise HeimdallException(f"Error connecting to {self.service,}: {e}")

        if response.status_code != 200:
            log.warning("Error retrieving query: %s", response.text)
            return None
        return response


def _process_org_response(response):
    """
    takes a response, pulls the json results, and returns a set of org_full_paths
    """
    orgs_list = response.json()
    return _get_org_full_paths(orgs_list)


def _get_org_full_paths(org_list):
    orgs_set = set()
    for org in org_list:
        if not org.get("parent_id"):
            orgs_set.add(org.get("full_path"))
    return orgs_set
