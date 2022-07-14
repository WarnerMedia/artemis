import json
import os
import unittest

import pytest

from repo.github_util.github_utils import _get_query_response
from repo.util.utils import get_api_key

TEST_DIR = os.path.dirname(os.path.abspath(__file__))

with open(os.path.join(TEST_DIR, "data/services.json")) as services_file:
    SERVICES_DICT = json.load(services_file)

PRIVATE_PROXY_GITHUB = SERVICES_DICT["services"]["git.example.com"]

QUERY_LIST = [
    """
    repo0: repository(owner: "example", name: "behavior3") {
                    url
                    nameWithOwner
                    isPrivate
                    diskUsage
                    }
    """
]


@pytest.mark.integtest
class TestGithub(unittest.TestCase):
    def test_private_github_rev_proxy_query(self):
        authorization = f"bearer {get_api_key(PRIVATE_PROXY_GITHUB['secret_loc'])}"

        resp = _get_query_response(authorization, PRIVATE_PROXY_GITHUB["url"], QUERY_LIST)
        self.assertEqual(resp["data"]["repo0"]["nameWithOwner"], "example/behavior3")
