import json
import unittest
from unittest.mock import patch, MagicMock

from artemislib.services import ServiceType
from system_services.util.service import Service


def get_mock_memcache_client(cache_value=None):
    mock_client = MagicMock()
    if cache_value is not None:
        mock_client.get.return_value = json.dumps(cache_value).encode("utf-8")
    else:
        mock_client.get.return_value = None
    mock_client.set.return_value = None
    return mock_client


class TestService(unittest.TestCase):
    @patch("system_services.util.service.get_memcache_client")
    def test_cache_hit(self, mock_get_memcache_client):
        cached_result = {
            "service": "test_org",
            "service_type": ServiceType.GITHUB,
            "reachable": True,
            "auth_successful": True,
            "auth_type": "service_account",
            "error": None,
        }
        mock_get_memcache_client.return_value = get_mock_memcache_client(cached_result)
        service_dict = {"services": {"test_org": {"type": ServiceType.GITHUB, "secret_loc": "foo"}}}
        svc = Service("test_org", service_dict)
        actual = svc.to_dict()
        self.assertEqual(actual, cached_result)

    @patch("system_services.util.service.get_memcache_client")
    def test_cache_miss(self, mock_get_memcache_client):
        mock_get_memcache_client.return_value = get_mock_memcache_client()
        service_dict = {"services": {"test_org": {"type": ServiceType.GITHUB, "secret_loc": "foo"}}}
        svc = Service("test_org", service_dict)
        actual = svc.to_dict()
        self.assertEqual(
            actual,
            {
                "service": "test_org",
                "service_type": ServiceType.GITHUB,
                "reachable": False,
                "auth_successful": False,
                "auth_type": "service_account",
                "error": "Could not find entry for test_org",
            },
        )
