import boto3
from moto import mock_aws
from botocore.exceptions import ClientError
import unittest

from artemislib.aws import AWSConnect

DEFAULT_REGION = "us-east-1"


@mock_aws
class TestAWSConnect(unittest.TestCase):
    def test_singleton(self):
        a = AWSConnect()
        b = AWSConnect()
        self.assertIsNotNone(a)
        self.assertIsNotNone(b)
        self.assertEqual(a, b)

    def test_get_secret(self):
        secretsmgr: boto3.SecretsManager.Client = boto3.client("secretsmanager", region_name="us-east-1")
        secretsmgr.create_secret(
            Name="secret_foo",
            SecretString='{"foo": "1234", "bar": "baz"}',
        )
        aws = AWSConnect(region=DEFAULT_REGION)
        actual = aws.get_secret("secret_foo")
        self.assertEqual(actual["foo"], "1234")
        self.assertEqual(actual["bar"], "baz")

    def test_get_secret_binary(self):
        secretsmgr = boto3.client("secretsmanager", region_name=DEFAULT_REGION)
        secretsmgr.create_secret(
            Name="secret_foo",
            SecretBinary=b"Wu5eipotCee9eifushee4ieH",
        )
        aws = AWSConnect(region=DEFAULT_REGION)
        actual = aws.get_secret("secret_foo")
        self.assertIsNone(actual)

    def test_get_secret_raw(self):
        secretsmgr = boto3.client("secretsmanager", region_name=DEFAULT_REGION)
        secretsmgr.create_secret(
            Name="secret_foo",
            SecretString="foo-bar-baz",
        )
        aws = AWSConnect(region=DEFAULT_REGION)
        actual = aws.get_secret_raw("secret_foo")
        self.assertEqual(actual, "foo-bar-baz")

    def test_get_secret_raw_binary(self):
        secretsmgr = boto3.client("secretsmanager", region_name=DEFAULT_REGION)
        secretsmgr.create_secret(
            Name="secret_foo",
            SecretBinary=b"vu3AhthoQua5umeiquae6EiB",
        )
        aws = AWSConnect(region=DEFAULT_REGION)
        actual = aws.get_secret_raw("secret_foo")
        self.assertIsNone(actual)

    def test_get_secret_raw_missing(self):
        secretsmgr = boto3.client("secretsmanager", region_name=DEFAULT_REGION)
        secretsmgr.create_secret(Name="secret_foo")
        aws = AWSConnect(region=DEFAULT_REGION)
        with self.assertRaises(ClientError):
            aws.get_secret_raw("secret_foo")

    def test_copy_s3_object(self):
        s3 = boto3.client("s3", region_name=DEFAULT_REGION)
        s3.create_bucket(Bucket="src")
        s3.put_object(Bucket="src", Key="foo/bar", Body=b"baz")
        s3.create_bucket(Bucket="dest")

        aws = AWSConnect(region=DEFAULT_REGION)
        aws.copy_s3_object("foo/bar", "baz/quux", "src", "dest")

        res = s3.get_object(Bucket="dest", Key="baz/quux")
        self.assertEqual(res["Body"].read(), b"baz")
