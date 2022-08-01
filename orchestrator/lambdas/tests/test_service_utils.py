import unittest

from heimdall_utils import service_utils

TEST_KEY = "I_am_a_test_key"


class TestServiceUtils(unittest.TestCase):
    def test_get_service_url_graphql_true(self):
        service_dict = {"url": "test_graphql_url", "branch_url": "test_api_url"}
        expected_response = "test_graphql_url"
        response = service_utils.get_service_url(service_dict, True)
        self.assertEqual(expected_response, response)

    def test_get_service_url_graphql_false(self):
        service_dict = {"url": "test_graphql_url", "branch_url": "test_api_url"}
        expected_response = "test_api_url"
        response = service_utils.get_service_url(service_dict, False)
        self.assertEqual(expected_response, response)

    def test_get_service_url_service_dict_none(self):
        expected_response = None
        response = service_utils.get_service_url(None, True)
        self.assertEqual(expected_response, response)

    def test_get_service_url_service_dict_no_url(self):
        service_dict = {"branch_url": "test_api_url"}
        expected_response = None
        response = service_utils.get_service_url(service_dict, True)
        self.assertEqual(expected_response, response)

    def test_handle_key_None(self):
        result = service_utils.handle_key(TEST_KEY, None)
        self.assertEqual(TEST_KEY, result)

    def test_handle_key_other(self):
        result = service_utils.handle_key(TEST_KEY, "other")
        self.assertEqual(None, result)

    def test_handle_key_template(self):
        service_key_prefix = "OAuth:"
        service_key = service_key_prefix + "$key"
        expected_result = service_key_prefix + TEST_KEY
        result = service_utils.handle_key(TEST_KEY, service_key)
        self.assertEqual(expected_result, result)
