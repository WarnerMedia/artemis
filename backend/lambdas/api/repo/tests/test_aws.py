import json
import os
import unittest

import boto3
import pytest

from repo.util import aws
from repo.util.aws import AWSConnect

APPLICATION = os.environ.get("APPLICATION", "artemis")

PROPERTIES_LOC = f"{APPLICATION}/properties"
TEST_SECRET = f"{APPLICATION}/github-api-key"
TEST_S3_KEY = "scan_data/integ-test-data/www/0ec1e9de-3dab-4435-977f-d7a5a5212722"
TEST_S3_DATA = {"value": "key"}


@pytest.mark.integtest
class TestAWS(unittest.TestCase):
    # NOTE: This test does looks for default profile when run locally
    def setUp(self) -> None:
        self.get_secret_properties()

        self.prep_create_s3_object()

    def get_secret_properties(self):
        # get env properties
        self.secrets_manager = boto3.client("secretsmanager", region_name=aws.DEFAULT_REGION)
        secret = self.secrets_manager.get_secret_value(SecretId=PROPERTIES_LOC)["SecretString"]
        self.properties = json.loads(secret)

    def prep_create_s3_object(self):
        # Prep for test_aws_get_s3_object
        self.s3 = boto3.resource("s3", region_name=aws.DEFAULT_REGION)
        self.test_s3_object = self.s3.Object(self.properties["s3_bucket"], TEST_S3_KEY)
        self.test_s3_object.put(Body=json.dumps(TEST_S3_DATA))

    def tearDown(self) -> None:
        self.test_s3_object.delete()

    def test_aws_init(self):
        AWSConnect()

    def test_aws_object_sqs_not_none(self):
        aws_connect = AWSConnect()
        self.assertTrue(aws_connect._SQS)

    def test_aws_object_s3_not_none(self):
        aws_connect = AWSConnect()
        self.assertTrue(aws_connect._S3)

    def test_aws_object_secrets_manager_not_none(self):
        aws_connect = AWSConnect()
        self.assertTrue(aws_connect._SECRETS_MANAGER)

    def test_aws_same_instance(self):
        instance1 = AWSConnect()
        instance2 = AWSConnect()
        self.assertEqual(instance1, instance2)

    def test_aws_get_secret_success(self):
        aws_connect = AWSConnect()
        self.assertTrue(aws_connect._SECRETS_MANAGER)
        secret = aws_connect.get_secret(TEST_SECRET)
        self.assertTrue(isinstance(secret.get("key"), str))

    def test_aws_get_s3_object(self):
        aws_connect = AWSConnect()
        s3_object = aws_connect.get_s3_object(TEST_S3_KEY, self.properties["s3_bucket"])
        s3_object = s3_object.get()

        self.assertEqual(TEST_S3_DATA, json.loads(s3_object["Body"].read().decode("utf-8")))
