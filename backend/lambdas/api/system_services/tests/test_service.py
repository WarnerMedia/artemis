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
