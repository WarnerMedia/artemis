import os
import unittest

from engine.plugins.gitsecrets.secrets_processor import SecretProcessor

# Extra trailing slashes included to make sure they get cleaned up
TEST_DIR = os.path.dirname(os.path.abspath(__file__)) + "//"

TEST_REL_PATH_1 = "data/test_git_secret_1.txt"
TEST_REL_PATH_2 = "data/test_git_secret_:_1.txt"
TEST_REL_PATH_3 = "data/test_git_secret_"

TEST_FILE_PATH_1 = os.path.join(TEST_DIR, TEST_REL_PATH_1)
TEST_FILE_PATH_2 = os.path.join(TEST_DIR, TEST_REL_PATH_2)
TEST_FILE_PATH_LIST = [os.path.join(TEST_DIR, TEST_REL_PATH_3), "_1.txt"]
TEST_LINE_NUM_AND_SSH = ":5:-----BEGIN RSA PRIVATE KEY-----"
TEST_FULL_RESPONSE = TEST_FILE_PATH_1 + TEST_LINE_NUM_AND_SSH
TEST_FULL_RESPONSE_EDGE = TEST_FILE_PATH_2 + TEST_LINE_NUM_AND_SSH


class TestGitSecrets(unittest.TestCase):
    def test_process_response_success(self):
        processor = SecretProcessor(base_path=TEST_DIR)

        success = processor.process_response(TEST_FULL_RESPONSE)

        self.assertTrue(success)
        self.assertEqual(TEST_REL_PATH_1, processor.filename)
        self.assertEqual(5, processor.line_number)
        self.assertEqual("ssh", processor.secret_type)

    def test_process_response_colon_edge_case(self):
        processor = SecretProcessor(base_path=TEST_DIR)

        success = processor.process_response(TEST_FULL_RESPONSE_EDGE)

        self.assertTrue(success)
        self.assertEqual(TEST_REL_PATH_2, processor.filename)
        self.assertEqual(5, processor.line_number)
        self.assertEqual("ssh", processor.secret_type)

    def test_process_response_file_does_not_exist(self):
        processor = SecretProcessor(base_path=TEST_DIR)

        success = processor.process_response("file_doesnt_exist" + TEST_LINE_NUM_AND_SSH)

        self.assertFalse(success)

    def test_process_filename_success(self):
        processor = SecretProcessor(base_path=TEST_DIR)

        processor.split = [TEST_FILE_PATH_1, "5", "-------"]

        self.assertTrue(processor._process_filename())
        self.assertEqual(TEST_REL_PATH_1, processor.filename)

    def test_process_filename_colon_edge_case(self):
        processor = SecretProcessor(base_path=TEST_DIR)

        processor.split = TEST_FILE_PATH_LIST + ["5", "-------"]

        self.assertTrue(processor._process_filename())
        self.assertEqual(TEST_REL_PATH_2, processor.filename)

    def test_process_filename_file_not_found(self):
        processor = SecretProcessor(base_path=TEST_DIR)

        processor.split = ["does not exist", "5", "-------"]

        self.assertFalse(processor._process_filename())

    def test_process_line_number_success(self):
        processor = SecretProcessor(base_path=TEST_DIR)

        processor.split = ["5", "-------"]

        self.assertTrue(processor._process_line_number())
        self.assertEqual(5, processor.line_number)

    def test_process_line_number_not_int(self):
        processor = SecretProcessor(base_path=TEST_DIR)

        processor.split = ["5.pem", "-------"]

        self.assertFalse(processor._process_line_number())

    def test_process_secret_type_ssh(self):
        processor = SecretProcessor(base_path=TEST_DIR)

        processor._secret = "------"

        processor._process_secret_type()

        self.assertEqual("ssh", processor.secret_type)

    def test_process_secret_type_mongo(self):
        processor = SecretProcessor(base_path=TEST_DIR)

        processor._secret = "mongodb://fakeuser:fakepass@example-db"

        processor._process_secret_type()

        self.assertEqual("mongo", processor.secret_type)

    def test_process_secret_type_aws(self):
        processor = SecretProcessor(base_path=TEST_DIR)

        processor._secret = "AKIATHISISNOTREALKEY"

        processor._process_secret_type()

        self.assertEqual("aws", processor.secret_type)

    def test_process_secret_pass(self):
        processor = SecretProcessor(base_path=TEST_DIR)
        secret_key = "-----BEGIN RSA PRIVATE KEY-----"

        processor.split = [secret_key]

        self.assertTrue(processor._process_secret())
        self.assertEqual(secret_key, processor.secret)

    def test_extract_match_slack_webhook(self):
        webhook = "https://hooks.slack.com/services/T01234567/B09876543/thisisnotarealwebhook123"

        processor = SecretProcessor(base_path=TEST_DIR)
        actual = processor._extract_match(webhook)

        self.assertEqual(webhook, actual)

    def test_secret_type_slack(self):
        processor = SecretProcessor(base_path=TEST_DIR)
        processor._secret = "https://hooks.slack.com/services/T01234567/B09876543/thisisnotarealwebhook123"

        processor._process_secret_type()

        self.assertEqual("slack", processor.secret_type)

    def test_property_filename_read_only(self):
        processor = SecretProcessor(base_path=TEST_DIR)
        processor.filename = "test"
        with self.assertRaises(ValueError):
            processor.filename = "test2"

    def test_property_line_number_read_only(self):
        processor = SecretProcessor(base_path=TEST_DIR)
        processor.line_number = "test"
        with self.assertRaises(ValueError):
            processor.line_number = "test2"

    def test_property_secret_read_only(self):
        processor = SecretProcessor(base_path=TEST_DIR)
        processor.secret = "test"
        with self.assertRaises(ValueError):
            processor.secret = "test2"

    def test_property_secret_type_read_only(self):
        processor = SecretProcessor(base_path=TEST_DIR)
        processor.secret_type = "test"
        with self.assertRaises(ValueError):
            processor.secret_type = "test2"

    def test_extract_match(self):
        test_cases = [
            "mongodb://user:pass@localhost:12345",
            "mongodb://user:pass@localhost",
            "mongodb+srv://user:pass@localhost:12345",
            "mongodb+srv://user:pass@localhost",
            "postgres://user:pass@localhost:12345",
            "postgres://user:pass@localhost",
            "amzn.mws.00000000-0000-0000-0000-000000000000",
            "AIza00000000000000000000000000000000000",
            "https://hooks.slack.com/services/T00000000/B00000000/000000000000000000000000",
            "AKIA0000000000000000",
            "ASIA0000000000000000",
            "ACCA0000000000000000",
            "EAACEdEose0cBA0000000000000000",
            "facebook_key = '00000000000000000000000000000000'",
            "api_key = '00000000000000000000000000000000'",
            "secret_key = '00000000000000000000000000000000'",
            "0000-00000000000000000000000000000000.apps.googleusercontent.com",
            "ya29.0000000000000000000000000000000000000000000000000000000",
            "http://user:pass@localhost:6379",
            "https://user:pass@localhost:6379",
            "http://user:pass@localhost",
            "https://user:pass@localhost",
            "ftp://user:pass@localhost",
            "ftps://user:pass@localhost",
            "http://user:pass@localhost:1234",
            "https://user:pass@localhost:1234",
            "ftp://user:pass@localhost:1234",
            "ftps://user:pass@localhost:1234",
            "heroku_key = 00000000-0000-0000-0000-000000000000",
            "00000000000000000000000000000000-us00",
            "key-00000000000000000000000000000000",
            "access_token$production$0000000000000000$00000000000000000000000000000000",
            "sk_live_00000000000000000000000000000000",
            "xoxp-000000000000-000000000000-000000000000-00000000000000000000000000000000",
            "sk_live_000000000000000000000000",
            "rk_live_000000000000000000000000",
            "sq0atp-0000000000000000000000",
            "sq0csp-0000000000000000000000000000000000000000000",
            "SK00000000000000000000000000000000",
            "twitter_key = 1000-0000000000000000000000000000000000000000",
            'twitter_key = "0000000000000000000000000000000000000000000"',
            "A3T00000000000000000",
            "-----BEGIN PRIVATE KEY-----",
            "ghp_000000000000000000000000000000000000",
        ]
        extra = " AAAAAAAAAA "

        processor = SecretProcessor(base_path=TEST_DIR)

        for test_case in test_cases:
            with self.subTest(test_case=test_case):
                # Test that the regex correctly extracts the secret from surrounding text
                actual = processor._extract_match(f'{extra}\n{extra}"{test_case}"{extra}\n{extra}')
                self.assertEqual(test_case, actual)
