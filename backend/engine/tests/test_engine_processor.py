import os
import random
import unittest
from base64 import b64encode
from copy import deepcopy
from tempfile import TemporaryDirectory
from unittest.mock import patch

import pytest

from analyzerdb.analyzerdb.models import Scan
from processor import processor as engine_processor
from processor.details import Details
from processor.scan_details import ScanDetails
from utils.git import get_last_commit_timestamp
from utils.services import _get_services_from_file

TEST_DIR = os.path.dirname(os.path.abspath(__file__))
TEST_METADATA = os.path.join(TEST_DIR, "data/metadata.json")

SERVICES_FILE = os.path.join(TEST_DIR, "data", "services.json")

TEST_SERVICES = {"github": {"type": "github", "url": "graphql", "use_deploy_key": False}}
TEST_DETAILS = {
    "repo": "testorg/testrepo",
    "service": "github",
    "scan_id": "11111aaaa",
    "url": "http://github/testorg/testrepo",
    "plugins": [],
}


class TestEngineProcessor(unittest.TestCase):
    def test_engine_processor_create(self):
        processor = engine_processor.EngineProcessor(TEST_SERVICES, "scan", TEST_DETAILS, {}, object)
        self.assertIsInstance(processor.details, Details)
        self.assertIsInstance(processor.action_details, ScanDetails)

    def test_engine_processor_docker_image_required_true(self):
        pytest.xfail("Trivy plugin is temporarily disabled due to unexpected vulns reporting.")
        details = deepcopy(TEST_DETAILS)
        details["plugins"] = ["test", "tslint", "test", "trivy"]
        processor = engine_processor.EngineProcessor(TEST_SERVICES, "scan", details, {}, object)
        expected_result = True
        result = processor.docker_images_required()
        self.assertEqual(expected_result, result)

    def test_engine_processor_docker_image_required_false(self):
        details = deepcopy(TEST_DETAILS)
        details["plugins"] = ["test", "tslint"]
        processor = engine_processor.EngineProcessor(TEST_SERVICES, "scan", details, {}, object)
        expected_result = False
        result = processor.docker_images_required()
        self.assertEqual(expected_result, result)

    def test_use_hostname_or_url_hostname_exists(self):
        service_dict = {"hostname": "test_service"}
        service = "github.com"
        repo = "/ORG/REPO_NAME"
        url = f"{service}{repo}"
        expected_result = f"{service_dict['hostname']}{repo}"
        result = engine_processor.use_hostname_or_url(service, url, service_dict)
        self.assertEqual(expected_result, result)

    def test_use_hostname_or_url_hostname_none(self):
        service_dict = {"hostname": None}
        service = "github.com"
        repo = "/ORG/REPO_NAME"
        url = f"{service}{repo}"
        expected_result = url
        result = engine_processor.use_hostname_or_url(service, url, service_dict)
        self.assertEqual(expected_result, result)

    def test_handle_key_gitlab(self):
        key = "key123"
        service_type = "gitlab"
        service_key = "oauth2:$key"
        expected_key = f"oauth2:{key}"
        result_key = engine_processor.handle_key(key, service_type, service_key)
        self.assertEqual(expected_key, result_key)

    def test_handle_key_no_service_key(self):
        key = "key123"
        service_type = "github"
        service_key = None
        expected_key = key
        result_key = engine_processor.handle_key(key, service_type, service_key)
        self.assertEqual(expected_key, result_key)

    def test_handle_key_bitbucket(self):
        key = "key123"
        service_type = "bitbucket"
        service_key = "other"
        encoded_key = b64encode(key.encode("utf-8"))
        expected_key = key
        result_key = engine_processor.handle_key(encoded_key, service_type, service_key)
        self.assertEqual(expected_key, result_key)

    def test_get_most_severe(self):
        services = deepcopy(TEST_SERVICES)
        services["github"]["use_deploy_key"] = True
        processor = engine_processor.EngineProcessor(services, "scan", TEST_DETAILS, {}, object)

        test_cases = [
            ({"item_severity": "High", "cached_severity": "Low"}, "High"),
            ({"item_severity": "Low", "cached_severity": "High"}, "High"),
            ({"item_severity": "Nonsense", "cached_severity": "High"}, "High"),
            ({"item_severity": "Medium", "cached_severity": "Nonsense"}, "Medium"),
            ({"item_severity": "NewJunk", "cached_severity": "OldJunk"}, "NewJunk"),
        ]

        for test_case in test_cases:
            with self.subTest(test_case=test_case):
                actual = processor._get_most_severe(test_case[0]["item_severity"], test_case[0]["cached_severity"])
                self.assertEqual(actual, test_case[1])

    @patch.object(engine_processor, "get_api_key")
    @patch.object(engine_processor, "git_clone")
    def test_pull_repo_ssh(self, git_clone_mock, get_api_key):
        self.assertEqual(engine_processor.get_api_key, get_api_key)
        self.assertEqual(engine_processor.git_clone, git_clone_mock)
        expected_result = "test return"
        git_clone_mock.return_value = expected_result
        services = deepcopy(TEST_SERVICES)
        services["github"]["use_deploy_key"] = True
        processor = engine_processor.EngineProcessor(services, "scan", TEST_DETAILS, {}, object)
        result = processor.pull_repo()
        self.assertTrue(git_clone_mock.called)
        self.assertTrue(get_api_key.called)
        self.assertEqual(expected_result, result)

    @patch.object(engine_processor, "get_api_key")
    @patch.object(engine_processor, "git_pull")
    def test_pull_repo_http(self, git_pull_mock, get_api_key):
        self.assertEqual(engine_processor.get_api_key, get_api_key)
        self.assertEqual(engine_processor.git_pull, git_pull_mock)
        expected_result = "test return"
        git_pull_mock.return_value = expected_result

        class DummyDBScanObject:
            def get_scan_object():
                return Scan()

        processor = engine_processor.EngineProcessor(TEST_SERVICES, "scan", TEST_DETAILS, DummyDBScanObject, object)
        result = processor.pull_repo()
        self.assertTrue(git_pull_mock.called)
        self.assertTrue(get_api_key.called)
        self.assertEqual(expected_result, result)

    @pytest.mark.integtest
    def test_git_log(self):
        test_url = "https://github.com/turnerlabs/samlkeygen.git"
        test_repo = "turnerlabs/samlkeygen"
        details = deepcopy(TEST_DETAILS)
        details["repo"] = test_repo
        details["url"] = test_url
        services = _get_services_from_file(SERVICES_FILE).get("services")
        processor = engine_processor.EngineProcessor(services, "scan", details, {}, object)
        with TemporaryDirectory() as working_dir:
            processor.action_details.scan_working_dir = os.path.join(working_dir, processor.get_scan_id())
            processor.pull_repo()
            # call git log on cloned repo
            self.assertIsNotNone(get_last_commit_timestamp(processor.get_scan_working_dir()))

    @pytest.mark.integtest
    def test_create_cache_item(self):
        details = deepcopy(TEST_DETAILS)
        services = _get_services_from_file(SERVICES_FILE).get("services")
        processor = engine_processor.EngineProcessor(services, "scan", details, {})
        rand_id = random.randbytes(15)
        cache_item = f"test_item_{rand_id}"
        expected_result = "medium"

        processor._create_severity_cache_item(cache_item, expected_result)
        result = processor.lookup_cache.lookup(cache_item)

        self.assertEqual(expected_result, result)

    @pytest.mark.integtest
    def test_create_cache_item_update(self):
        details = deepcopy(TEST_DETAILS)
        services = _get_services_from_file(SERVICES_FILE).get("services")
        processor = engine_processor.EngineProcessor(services, "scan", details, {})
        rand_id = random.randbytes(15)
        cache_item = f"test_item_{rand_id}"
        expected_result = "medium"

        processor._create_severity_cache_item(cache_item, "low")
        processor._create_severity_cache_item(cache_item, expected_result)
        result = processor.lookup_cache.lookup(cache_item)

        self.assertEqual(expected_result, result)
