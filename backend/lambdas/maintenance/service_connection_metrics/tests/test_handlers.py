import json
import unittest
from unittest.mock import patch, MagicMock, AsyncMock

from artemislib.services import ServiceType, AuthType
from service_connection_metrics.handlers import check_service, parse_service
from service_connection_metrics.service_handlers import ArtemisService
from aiohttp import ClientSession

MOCK_KEY = "fake_key"
MOCK_KEY_BASE64 = "ZmFrZV9rZXk="
SUCCESSFUL_AUTH_CHECK = {
    "service": "test_org",
    "service_type": ServiceType.GITHUB,
    "reachable": True,
    "auth_successful": True,
    "auth_type": AuthType.SVC,
    "error": None,
}

NEGATIVE_AUTH_RESULT = {
    "service": "test_org",
    "service_type": ServiceType.ADO,
    "reachable": False,
    "auth_successful": False,
    "auth_type": AuthType.SVC,
    "error": "Unable to authenticate",
}


def get_mock_memcache_client(cache_value=None):
    mock_client = MagicMock()
    if cache_value is not None:
        mock_client.get.return_value = json.dumps(cache_value).encode("utf-8")
    else:
        mock_client.get.return_value = None
    mock_client.set.return_value = None
    return mock_client


class TestServiceConnectionMetrics(unittest.IsolatedAsyncioTestCase):
    def test_parse_service(self):
        services_dict = {"test_org": {"type": ServiceType.GITHUB, "secret_loc": "foo"}}
        svc = parse_service(services_dict, "test_org")
        self.assertEqual(svc.service_name, "test_org")
        self.assertEqual(svc.service["type"], ServiceType.GITHUB)

    def test_parse_bitbucket_service_v1(self):
        services_dict = {
            "bitbucketorg": {
                "type": "bitbucket",
                "secret_loc": "foo",
                "url": "https://bitbucket.example.com/api/1.0",
            }
        }
        svc = parse_service(services_dict, "bitbucketorg")
        self.assertEqual(svc.service_name, "bitbucketorg")
        self.assertEqual(svc.service["type"], ServiceType.BITBUCKET_V1.value)

    def test_parse_bitbucket_service_v2(self):
        services_dict = {
            "bitbucketorg": {
                "type": "bitbucket",
                "secret_loc": "foo",
                "url": "https://bitbucket.example.com/api/2.0",
            }
        }
        svc = parse_service(services_dict, "bitbucketorg")
        self.assertEqual(svc.service_name, "bitbucketorg")
        self.assertEqual(svc.service["type"], ServiceType.BITBUCKET_V2.value)

    @patch(
        "service_connection_metrics.handlers.SERVICE_HANDLERS",
        {ServiceType.GITHUB: AsyncMock(return_value=SUCCESSFUL_AUTH_CHECK)},
    )
    async def test_check_service_successful(self):
        services_dict = {"test_org": {"type": ServiceType.GITHUB, "secret_loc": "foo"}}
        svc = ArtemisService(service_name="test_org", org="", service=services_dict["test_org"])
        async with ClientSession() as session:
            result = await check_service(session, svc, key=MOCK_KEY)
        self.assertTrue(result["reachable"])
        self.assertTrue(result["auth_successful"])
        self.assertEqual(result["service"], "test_org")
        self.assertEqual(result["service_type"], ServiceType.GITHUB)
        self.assertIsNone(result["error"])

    @patch(
        "service_connection_metrics.handlers.SERVICE_HANDLERS",
        {ServiceType.GITHUB: AsyncMock(return_value=NEGATIVE_AUTH_RESULT)},
    )
    async def test_check_service_unsuccessful(self):
        services_dict = {"test_org": {"type": ServiceType.GITHUB, "secret_loc": "foo"}}
        svc = ArtemisService(service_name="test_org", org="", service=services_dict["test_org"])
        async with ClientSession() as session:
            result = await check_service(session, svc, key=MOCK_KEY)
        self.assertFalse(result["reachable"])
        self.assertFalse(result["auth_successful"])
        self.assertEqual(result["service"], "test_org")
        self.assertEqual(result["service_type"], ServiceType.ADO)
        self.assertEqual(result["error"], "Unable to authenticate")

    @patch(
        "service_connection_metrics.handlers.SERVICE_HANDLERS",
        {ServiceType.GITHUB: AsyncMock(side_effect=Exception("fail"))},
    )
    async def test_check_service_handler_error_handling(self):
        services_dict = {"test_org": {"type": ServiceType.GITHUB, "secret_loc": "foo"}}
        svc = ArtemisService(service_name="test_org", org="", service=services_dict["test_org"])
        async with ClientSession() as session:
            result = await check_service(session, svc, key=MOCK_KEY)
        self.assertFalse(result["reachable"])
        self.assertFalse(result["auth_successful"])
        self.assertEqual(result["error"], "An unexpected error occurred in Artemis")

    @patch("service_connection_metrics.handlers.SERVICE_HANDLERS", {})
    async def test_check_service_unsupported_type(self):
        services_dict = {"test_org": {"type": ServiceType.GITHUB, "secret_loc": "foo"}}
        svc = ArtemisService(service_name="test_org", org="", service=services_dict["test_org"])
        async with ClientSession() as session:
            result = await check_service(session, svc, key=MOCK_KEY)
        self.assertFalse(result["reachable"])
        self.assertFalse(result["auth_successful"])
        self.assertEqual(result["error"], "Unsupported service type")
