import unittest

import botocore.exceptions

try:
    from event_dispatch.event_dispatch import determine_secrets_management_processes
except (botocore.exceptions.ClientError, botocore.exceptions.NoCredentialsError):
    raise unittest.SkipTest("Unit Test requires AWS Credentials to run. Skipping.")

SERVICES = {
    "services": {
        "service1": {
            "secrets_management": {
                "process1": {"include": ["*"], "exclude": []},
                "process2": {"include": [], "exclude": ["*"]},
            }
        },
        "service2": {
            "secrets_management": {
                "process1": {"include": [], "exclude": ["*"]},
                "process2": {"include": ["*"], "exclude": []},
            }
        },
        "service3": {
            "secrets_management": {
                "process1": {"include": ["*"], "exclude": ["org/foo*"]},
                "process2": {"include": ["org/foo*"], "exclude": []},
            }
        },
        "service4": {
            "secrets_management": {
                "process1": {"include": ["*"], "exclude": []},
                "process2": {"include": ["org/foo*"], "exclude": []},
            }
        },
    }
}


class TestValidators(unittest.TestCase):
    def test_determine_process(self):
        test_cases = [
            {"event": {"service": "service1", "repo": "org/repo"}, "expected": ["process1"]},
            {"event": {"service": "service2", "repo": "org/repo"}, "expected": ["process2"]},
            {"event": {"service": "service3", "repo": "org/repo"}, "expected": ["process1"]},
            {"event": {"service": "service3", "repo": "org/foobar"}, "expected": ["process2"]},
            {"event": {"service": "service4", "repo": "org/repo"}, "expected": ["process1"]},
            {"event": {"service": "service4", "repo": "org/foobar"}, "expected": ["process1", "process2"]},
        ]
        for test_case in test_cases:
            with self.subTest(test_case=test_case):
                actual = determine_secrets_management_processes(test_case["event"], SERVICES)
                self.assertEqual(test_case["expected"], actual)
