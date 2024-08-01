from typing import cast
import boto3
from json import JSONDecodeError
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

    def test_get_secret_dict(self):
        secretsmgr = boto3.client("secretsmanager", region_name="us-east-1")
        secretsmgr.create_secret(
            Name="secret_foo",
            SecretString='{"foo": "1234", "bar": "baz"}',
        )
        aws = AWSConnect(region=DEFAULT_REGION)
        actual = aws.get_secret("secret_foo")
        self.assertIsInstance(actual, dict)
        actual = cast(dict[str, str], actual)
        self.assertEqual(actual["foo"], "1234")
        self.assertEqual(actual["bar"], "baz")

    def test_get_secret_invalid_json(self):
        secretsmgr = boto3.client("secretsmanager", region_name="us-east-1")
        secretsmgr.create_secret(
            Name="secret_foo",
            SecretString="iji};;ii",
        )
        aws = AWSConnect(region=DEFAULT_REGION)
        with self.assertRaises(JSONDecodeError):
            aws.get_secret("secret_foo")

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

    def test_get_s3_object(self):
        s3 = boto3.client("s3", region_name=DEFAULT_REGION)
        s3.create_bucket(Bucket="src")
        s3.put_object(Bucket="src", Key="foo/bar", Body=b"baz")

        aws = AWSConnect(region=DEFAULT_REGION)
        obj = aws.get_s3_object("foo/bar", "src")
        self.assertEqual(obj.get()["Body"].read(), b"baz")

    def test_get_s3_object_missing_bucket(self):
        aws = AWSConnect(region=DEFAULT_REGION)
        with self.assertRaises(ValueError):
            aws.get_s3_object("foo/bar", None)

    def test_copy_s3_object(self):
        s3 = boto3.client("s3", region_name=DEFAULT_REGION)
        s3.create_bucket(Bucket="src")
        s3.put_object(Bucket="src", Key="foo/bar", Body=b"baz")
        s3.create_bucket(Bucket="dest")

        aws = AWSConnect(region=DEFAULT_REGION)
        aws.copy_s3_object("foo/bar", "baz/quux", "src", "dest")

        res = s3.get_object(Bucket="dest", Key="baz/quux")
        self.assertEqual(res["Body"].read(), b"baz")

    def test_copy_s3_object_missing_buckets(self):
        aws = AWSConnect(region=DEFAULT_REGION)
        with self.assertRaises(ValueError):
            aws.copy_s3_object("foo/bar", "baz/quux", None, "dest")
        with self.assertRaises(ValueError):
            aws.copy_s3_object("foo/bar", "baz/quux", "src", None)

    def test_get_s3_file(self):
        s3 = boto3.client("s3", region_name=DEFAULT_REGION)
        s3.create_bucket(Bucket="src")
        s3.put_object(Bucket="src", Key="foo/bar", Body=b"quux")

        aws = AWSConnect(region=DEFAULT_REGION)
        actual = aws.get_s3_file("foo/bar", "src")
        self.assertEqual(actual, "quux")

    def test_get_s3_file_missing_bucket(self):
        aws = AWSConnect(region=DEFAULT_REGION)
        with self.assertRaises(ValueError):
            aws.get_s3_file("nonexistent", None)

    def test_get_s3_file_error(self):
        aws = AWSConnect(region=DEFAULT_REGION)
        actual = aws.get_s3_file("nonexistent", "nothing")
        self.assertIsNone(actual)

    def test_write_s3_file(self):
        s3 = boto3.client("s3", region_name=DEFAULT_REGION)
        s3.create_bucket(Bucket="dest")

        aws = AWSConnect(region=DEFAULT_REGION)
        aws.write_s3_file("foo/bar/baz.txt", "lorem ipsum", "dest")

        resp = s3.get_object(Bucket="dest", Key="foo/bar/baz.txt")
        self.assertEqual(resp["Body"].read().decode("utf-8"), "lorem ipsum")

    def test_write_s3_file_missing_bucket(self):
        aws = AWSConnect(region=DEFAULT_REGION)
        with self.assertRaises(ValueError):
            aws.write_s3_file("nonexistent", "foo bar", None)

    def test_delete_s3_files(self):
        s3 = boto3.client("s3", region_name=DEFAULT_REGION)
        s3.create_bucket(Bucket="dest")
        s3.put_object(Bucket="dest", Key="foo.md", Body=b"foo")
        s3.put_object(Bucket="dest", Key="foo/bar.txt", Body=b"foo")
        s3.put_object(Bucket="dest", Key="foo/bar/baz.txt", Body=b"foo")
        s3.put_object(Bucket="dest", Key="foo/baz.txt", Body=b"foo")

        aws = AWSConnect(region=DEFAULT_REGION)
        count = aws.delete_s3_files("foo/", "dest")
        self.assertEqual(count, 3)
        # Confirm that only the prefixed files were deleted.
        self.assertIsNotNone(aws.get_s3_file("foo.md", "dest"))
        self.assertIsNone(aws.get_s3_file("foo/bar.txt", "dest"))
        self.assertIsNone(aws.get_s3_file("foo/bar/baz.txt", "dest"))
        self.assertIsNone(aws.get_s3_file("foo/baz.txt", "dest"))

    def test_delete_s3_files_missing_bucket(self):
        aws = AWSConnect(region=DEFAULT_REGION)
        with self.assertRaises(ValueError):
            aws.delete_s3_files("foo/", None)

    def test_get_s3_file_list(self):
        s3 = boto3.client("s3", region_name=DEFAULT_REGION)
        s3.create_bucket(Bucket="list")
        s3.put_object(Bucket="list", Key="foo.md", Body=b"foo")
        s3.put_object(Bucket="list", Key="foo/bar.txt", Body=b"foo")
        s3.put_object(Bucket="list", Key="foo/bar/baz.txt", Body=b"foo")
        s3.put_object(Bucket="list", Key="foo/baz.txt", Body=b"foo")

        aws = AWSConnect(region=DEFAULT_REGION)
        actual = [x.key for x in aws.get_s3_file_list("foo/", "list")]
        self.assertCountEqual(
            actual,
            [
                "foo/bar.txt",
                "foo/bar/baz.txt",
                "foo/baz.txt",
            ],
        )

    def test_get_s3_file_list_missing_bucket(self):
        aws = AWSConnect(region=DEFAULT_REGION)
        with self.assertRaises(ValueError):
            aws.get_s3_file_list("foo/", None)
