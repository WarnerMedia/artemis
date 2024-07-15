# pylint: disable=no-name-in-module, no-member
from typing import Union

import requests

from aws_lambda_powertools import Logger

from heimdall_orgs.const import TIMEOUT
from heimdall_utils.aws_utils import GetProxySecret
from heimdall_utils.env import APPLICATION
from heimdall_utils.variables import REV_PROXY_DOMAIN_SUBSTRING, REV_PROXY_SECRET_HEADER

log = Logger(service=APPLICATION, name=__name__, child=True)


class BitbucketOrgs:
    def __init__(
        self,
        service: str,
        api_url: str,
        api_key: str,
        is_last_page=True,
        next_page_start=0,
    ):
        self.service = service
        self.api_url = api_url
        self.api_key = api_key
        self.org_set = set()
        self.is_last_page = is_last_page
        self.next_page_start = next_page_start

    @classmethod
    def get_all_orgs(cls, service: str, api_url: str, api_key: str):
        bitbucket_orgs = cls(service, api_url, api_key)
        if not bitbucket_orgs.get_org_set():
            log.error("Unexpected error occurred getting %s orgs", bitbucket_orgs.service)
            return None
        while not bitbucket_orgs.is_last_page:
            bitbucket_orgs.get_org_set()

        log.info(
            "Queuing %d service orgs for service %s",
            len(bitbucket_orgs.org_set),
            bitbucket_orgs.service,
        )
        return bitbucket_orgs.org_set

    def get_org_set(self) -> bool:
        response = self.request_orgs(self.next_page_start)
        if not response:
            return False
        response_dict = response.json()
        self.is_last_page = response_dict.get("isLastPage")
        self.org_set.update(_process_orgs(response_dict))
        self.next_page_start = response_dict.get("nextPageStart")
        return True

    def request_orgs(self, start: int = 0) -> Union[dict, None]:
        if not self.api_url:
            log.info(
                "Service %s url was not found and therefore deemed unsupported",
                self.service,
            )
            return None
        headers = {
            "Authorization": "Basic %s" % self.api_key,
            "Content-Type": "application/json",
        }
        if REV_PROXY_DOMAIN_SUBSTRING and REV_PROXY_DOMAIN_SUBSTRING in self.api_url:
            headers[REV_PROXY_SECRET_HEADER] = GetProxySecret()

        try:
            response = requests.get(
                url=f"{self.api_url}/projects?limit=100&start={start}", headers=headers, timeout=TIMEOUT
            )
        except requests.exceptions.Timeout:
            log.error("Request timed out after %ss retrieving orgs for %s", TIMEOUT, self.service)
            return None
        except requests.ConnectionError as e:
            log.error("Error connecting to %s: %s", self.service, str(e))
            return None

        if response.status_code != 200:
            log.info("Error retrieving orgs for %s: %s", self.service, response.text)
            return None
        return response


def _process_orgs(org_dict: dict) -> set:
    org_output_set = set()
    org_list = org_dict.get("values")

    for org in org_list:
        org_output_set.add(org.get("key"))
    return org_output_set
