import os
import unittest
from unittest.mock import patch

from heimdall_orgs import org_queue_gitlab
from heimdall_utils.utils import get_json_from_file

TEST_DIR = os.path.dirname(os.path.abspath(__file__))
GITLAB_ORG_FILE = os.path.abspath(os.path.join(TEST_DIR, "data", "gitlab_org_response.json"))
GITLAB_ORG_SET = {"testorg1", "testorg4", "testorg5", "testorg6"}


class TestOrgQueueGitlab(unittest.TestCase):
    def setUp(self) -> None:
        self.org_branch_results = get_json_from_file(GITLAB_ORG_FILE)

    def test_get_org_full_paths(self):
        result = org_queue_gitlab._get_org_full_paths(self.org_branch_results)
        self.assertEqual(GITLAB_ORG_SET, result)

    @patch.object(org_queue_gitlab.GitlabOrgs, "_request_orgs")
    def test_get_all_orgs_multiple_pages(self, mock_request):
        gitlab_orgs = org_queue_gitlab.GitlabOrgs("git.example.com", None, None)
        self.assertEqual(gitlab_orgs._request_orgs, mock_request)
        mock_request.return_value = MockResponse(self.org_branch_results, 3)
        result = gitlab_orgs._get_all_groups()
        self.assertEqual(GITLAB_ORG_SET, result)

    @patch.object(org_queue_gitlab.GitlabOrgs, "_request_orgs")
    def test_get_all_orgs_one_page(self, mock_request):
        gitlab_orgs = org_queue_gitlab.GitlabOrgs("git.example.com", None, None)
        self.assertEqual(gitlab_orgs._request_orgs, mock_request)
        mock_request.return_value = MockResponse(self.org_branch_results, 1)
        result = gitlab_orgs._get_all_groups()
        self.assertEqual(GITLAB_ORG_SET, result)


class MockResponse:
    def __init__(self, data, total_pages):
        self.headers = {"X-Total-Pages": str(total_pages)}
        self.data = data
        self.text = str(self.data)
        self.total_pages = total_pages
        self.items_per_list = int(len(self.data) / self.total_pages)
        if self.items_per_list == 0:
            raise ValueError("Test value for total pages exceeds size of branch results")
        self.current = 0

    def json(self):
        sublist = self.data[self.current : self.current + self.items_per_list]
        self.current += self.items_per_list
        return sublist
