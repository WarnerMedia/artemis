import unittest

from engine.plugins.ghas_secrets.formatter import _normalize_secret_type


class TestPluginGHASSecrets(unittest.TestCase):
    def test_normalize_secret_type(self):
        test_cases = [
            ("aws_access_key_id", "aws"),
            ("not_aws_key", "not_aws_key"),
            ("google_api_key", "google"),
            ("github_ssh_private_key", "ssh"),
            ("slack_incoming_webhook_url", "slack"),
            ("slack_workflow_webhook_url", "slack"),
        ]
        for test_case in test_cases:
            with self.subTest(test_case=test_case):
                actual = _normalize_secret_type(test_case[0])
                self.assertEqual(actual, test_case[1])
