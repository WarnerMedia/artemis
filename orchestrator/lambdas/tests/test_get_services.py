import os
import unittest

import pytest

from heimdall_utils import get_services

TEST_DIR = os.path.dirname(os.path.abspath(__file__))
SERVICES_LOC = os.path.abspath(os.path.join(TEST_DIR, "data", "services.json"))
SERVICE_KEYS = ["services", "repos", "scan_orgs", "external_orgs"]
SERVICE_SERVICES = ["azure", "github", "gitlab", "bitbucket", "git.example.com"]


class TestServices(unittest.TestCase):
    def setUp(self) -> None:
        self.full_services_dict = get_services.get_services_dict(SERVICES_LOC)

    def test_verify_json_keys(self):
        service_keys = self.full_services_dict.keys()

        self.assertEqual(sorted(SERVICE_KEYS), sorted(service_keys))

    def test_verify_service_keys(self):
        service_keys = self.full_services_dict.get("services").keys()

        self.assertEqual(sorted(SERVICE_SERVICES), sorted(service_keys))
