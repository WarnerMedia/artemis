import requests
import responses
from responses import matchers
import unittest
from unittest.mock import patch

from system_services.util.service import Service
from system_services.util.const import ServiceType


class TestService(unittest.TestCase):
    @patch("system_services.util.service.get_api_key", lambda *x, **y: None)
    def test_missing_auth_key(self):
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
                "error": "Unable to retrieve key",
            },
        )

    @responses.activate
    @patch("system_services.util.service.SERVICE_AUTH_CHECK_TIMEOUT", 123)
    @patch("system_services.util.service.get_api_key", lambda *x, **y: "fake_key")
    def test_configured_timeout(self):
        service_dict = {
            "services": {"org": {"type": ServiceType.ADO, "secret_loc": "foo", "url": "http://example.com"}}
        }
        svc = Service("org/repo", service_dict)
        responses.get(
            "http://example.com/repo/_apis/projects",
            body=requests.Timeout(),
            match=[matchers.request_kwargs_matcher({"timeout": 123})],
        )
        actual = svc.to_dict()
        # responses will throw "Connection error" if not matched.
        self.assertNotEqual(actual["error"], "Connection error")

    @responses.activate
    @patch("system_services.util.service.get_api_key", lambda *x, **y: "fake_key")
    def test_timeout_error(self):
        service_dict = {
            "services": {"org": {"type": ServiceType.ADO, "secret_loc": "foo", "url": "http://example.com"}}
        }
        svc = Service("org/repo", service_dict)
        responses.get("http://example.com/repo/_apis/projects", body=requests.Timeout())
        actual = svc.to_dict()
        self.assertEqual(
            actual,
            {
                "service": "org/repo",
                "service_type": ServiceType.ADO,
                "reachable": False,
                "auth_successful": False,
                "auth_type": "service_account",
                "error": "Timeout",
            },
        )

    @responses.activate
    @patch("system_services.util.service.get_api_key", lambda *x, **y: "fake_key")
    def test_connect_error(self):
        service_dict = {
            "services": {"org": {"type": ServiceType.ADO, "secret_loc": "foo", "url": "http://example.com"}}
        }
        svc = Service("org/repo", service_dict)
        # responses will throw ConnectionError on any unregistered URL.
        actual = svc.to_dict()
        self.assertEqual(
            actual,
            {
                "service": "org/repo",
                "service_type": ServiceType.ADO,
                "reachable": False,
                "auth_successful": False,
                "auth_type": "service_account",
                "error": "Connection error",
            },
        )

    @responses.activate
    @patch("system_services.util.service.get_api_key", lambda *x, **y: "fake_key")
    def test_generic_request_error(self):
        service_dict = {
            "services": {"org": {"type": ServiceType.ADO, "secret_loc": "foo", "url": "http://example.com"}}
        }
        svc = Service("org/repo", service_dict)
        # All request errors other than Timeout or ConnectionError are treated
        # as generic "Request Failed" errors.
        responses.get("http://example.com/repo/_apis/projects", body=requests.TooManyRedirects())
        actual = svc.to_dict()
        self.assertEqual(
            actual,
            {
                "service": "org/repo",
                "service_type": ServiceType.ADO,
                "reachable": False,
                "auth_successful": False,
                "auth_type": "service_account",
                "error": "Request failed",
            },
        )

    @responses.activate
    @patch("system_services.util.service.get_api_key", lambda *x, **y: "fake_key")
    def test_ado_auth_failed(self):
        service_dict = {
            "services": {"org": {"type": ServiceType.ADO, "secret_loc": "foo", "url": "http://example.com"}}
        }
        svc = Service("org/repo", service_dict)
        responses.get("http://example.com/repo/_apis/projects", status=403)
        actual = svc.to_dict()
        self.assertEqual(
            actual,
            {
                "service": "org/repo",
                "service_type": ServiceType.ADO,
                "reachable": True,
                "auth_successful": False,
                "auth_type": "service_account",
                "error": None,
            },
        )

    @responses.activate
    @patch("system_services.util.service.get_api_key", lambda *x, **y: "fake_key")
    def test_ado_success(self):
        service_dict = {
            "services": {"org": {"type": ServiceType.ADO, "secret_loc": "foo", "url": "http://example.com"}}
        }
        svc = Service("org/repo", service_dict)
        responses.get(
            "http://example.com/repo/_apis/projects",
            status=200,
            match=[matchers.header_matcher({"Authorization": "Basic fake_key"})],
        )
        actual = svc.to_dict()
        self.assertEqual(
            actual,
            {
                "service": "org/repo",
                "service_type": ServiceType.ADO,
                "reachable": True,
                "auth_successful": True,
                "auth_type": "service_account",
                "error": None,
            },
        )
