# pylint: disable=no-member
import os
import unittest
from unittest.mock import patch

from heimdall_orgs import org_queue_bitbucket
from heimdall_utils.utils import Logger, get_json_from_file

TEST_DIR = os.path.dirname(os.path.abspath(__file__))

BITBUCKET_ORG_FILE = os.path.abspath(os.path.join(TEST_DIR, "data", "bitbucket_org_response.json"))
BITBUCKET_ORG_SET = {"ABC", "DEF", "GHI", "JKL", "MNO", "PQR"}

log = Logger(__name__)


class TestOrgQueueBitbucket(unittest.TestCase):
    def setUp(self) -> None:
        self.org_dict = get_json_from_file(BITBUCKET_ORG_FILE)

    @patch.object(org_queue_bitbucket.BitbucketOrgs, "request_orgs")
    def test_get_all_orgs_bitbucket_success(self, mock_request):
        bitbucket_orgs = org_queue_bitbucket.BitbucketOrgs("testservice", None, None)
        self.assertEqual(bitbucket_orgs.request_orgs, mock_request)
        mock_request.side_effect = [MockResponse(self.org_dict), None]

        if not bitbucket_orgs.get_org_set():
            log.error("Unexpected error occurred getting %s orgs", bitbucket_orgs.service)
            return None
        while not bitbucket_orgs.is_last_page:
            bitbucket_orgs.get_org_set()

        log.info("Queuing %d service orgs for service %s", len(bitbucket_orgs.org_set), bitbucket_orgs.service)

        result = bitbucket_orgs.org_set

        self.assertEqual(BITBUCKET_ORG_SET, result)

    def test_process_orgs_bitbucket_success(self):
        result = org_queue_bitbucket._process_orgs(self.org_dict)

        self.assertEqual(BITBUCKET_ORG_SET, result)


class MockResponse:
    def __init__(self, data):
        self.data = data

    def json(self):
        return self.data
