import json
from typing import Any, Optional

import boto3
from botocore.exceptions import ClientError
from mypy_boto3_ec2 import EC2ServiceResource
from mypy_boto3_lambda import LambdaClient
from mypy_boto3_s3 import S3ServiceResource
from mypy_boto3_s3.service_resource import BucketObjectsCollection, Object as S3Object
from mypy_boto3_secretsmanager import SecretsManagerClient
from mypy_boto3_sqs import SQSClient

from artemislib.env import (
    APPLICATION_TAG,
    AWS_DEFAULT_REGION,
    DEFAULT_S3_ENDPOINT,
    S3_BUCKET,
    SCAN_DATA_S3_ENDPOINT,
    SQS_ENDPOINT,
)
from logging import Logger
from artemislib.logging import Logger as ArtemisLogger


def _client_error_code(e: ClientError) -> str:
    """
    Extracts the client error code from a generic ClientError.

    Returns an empty string if the ClientError did not include a code.
    """
    return e.response.get("Error", {}).get("Code", "")


def _client_error_message(e: ClientError) -> str:
    """
    Extracts the client error message from a generic ClientError.

    Returns an empty string if the ClientError did not include a message.
    """
    return e.response.get("Error", {}).get("Message", "")


class LambdaError(Exception):
    pass


class AWSConnect:
    _instance = None
    _EC2: EC2ServiceResource
    _LAMBDA: LambdaClient
    _SECRETS_MANAGER: SecretsManagerClient
    _S3: dict[str, S3ServiceResource]
    _SQS: SQSClient
    log: Logger

    def __new__(cls, region: str = AWS_DEFAULT_REGION, queue: Optional[str] = None):
        if cls._instance is None:
            cls._instance = super(AWSConnect, cls).__new__(cls)
            cls._instance.log = ArtemisLogger("AWSConnect")
            cls._instance._LAMBDA = boto3.client("lambda", region_name=region)
            cls._instance._S3 = {DEFAULT_S3_ENDPOINT: boto3.resource("s3", region_name=region)}
            if SCAN_DATA_S3_ENDPOINT != DEFAULT_S3_ENDPOINT:
                cls._instance._S3[SCAN_DATA_S3_ENDPOINT] = boto3.resource(
                    "s3", region_name=region, endpoint_url=SCAN_DATA_S3_ENDPOINT
                )
            cls._instance._SECRETS_MANAGER = boto3.client("secretsmanager", region_name=region)
            cls._instance._SQS = boto3.client("sqs", endpoint_url=SQS_ENDPOINT, region_name=region)
            cls._instance._EC2 = boto3.resource("ec2", region_name=region)
        return cls._instance

    def get_secret(self, secret_name: str) -> Any:
        """
        Retrieves a JSON value from Secrets Manager.

        Returns None if the Secrets Manager value is not a string.
        Raises botocore.exceptions.ClientError if secret value is not set or cannot be decrypted.
        Raises json.JSONDecodeError if the value is not a valid JSON string.
        """
        raw_secret = self.get_secret_raw(secret_name)
        if raw_secret is not None:
            return json.loads(raw_secret)
        return None

    def get_secret_raw(self, secret_name: str) -> Optional[str]:
        """
        Retrieves a raw Secrets Manager string value.

        Returns None if the Secrets Manager value is not a string.
        Raises botocore.exceptions.ClientError if secret value is not set or cannot be decrypted.
        """
        try:
            get_secret_value_response = self._SECRETS_MANAGER.get_secret_value(SecretId=secret_name)
        except ClientError as e:
            if _client_error_code(e) in (
                "DecryptionFailureException",
                "InternalServiceErrorException",
                "InvalidParameterException",
                "InvalidRequestException",
                "ResourceNotFoundException",
            ):
                raise e
            self.log.error("Unable to get value: %s", _client_error_message(e))
        else:
            # Decrypts secret using the associated KMS CMK.
            # Depending on whether the secret is a string or binary, one of these
            # fields will be populated.
            if "SecretString" in get_secret_value_response:
                return get_secret_value_response["SecretString"]
        return None

    def get_s3_object(
        self, s3_key: str, s3_bucket: Optional[str] = S3_BUCKET, endpoint_url: str = DEFAULT_S3_ENDPOINT
    ) -> S3Object:
        """
        Creates a reference to an object in S3.

        Raises ValueError if the bucket is not specified.
        """
        if s3_bucket is None:
            raise ValueError("Source bucket must be specified")
        return self._S3[endpoint_url].Object(s3_bucket, s3_key)

    def copy_s3_object(
        self,
        s3_key: str,
        new_s3_key: str,
        s3_bucket: Optional[str] = S3_BUCKET,
        new_s3_bucket: Optional[str] = S3_BUCKET,
        endpoint_url: str = DEFAULT_S3_ENDPOINT,
    ) -> None:
        """
        Copies an S3 object from one location to another.

        Raises ValueError if source or destination bucket is not specified.
        """
        if s3_bucket is None:
            raise ValueError("Source bucket must be specified")
        if new_s3_bucket is None:
            raise ValueError("Destination bucket must be specified")

        new_obj = self._S3[endpoint_url].Bucket(new_s3_bucket).Object(new_s3_key)
        new_obj.copy({"Bucket": s3_bucket, "Key": s3_key})

    def invoke_lambda(self, name: str, payload: dict) -> dict:
        resp = self._LAMBDA.invoke(FunctionName=name, InvocationType="RequestResponse", Payload=json.dumps(payload))
        if resp["StatusCode"] == 200 and "FunctionError" not in resp:
            return json.load(resp["Payload"])
        else:
            self.log.error(f"Lambda function '{name}' failed")
            raise LambdaError

    def queue_msg(self, queue: str, msg: dict) -> bool:
        try:
            self._SQS.send_message(QueueUrl=queue, MessageBody=json.dumps(msg))
        except ClientError:
            self.log.error("Unable to queue message to %s", queue)
            return False
        return True

    def get_instance_ids(self) -> list[str]:
        instances = self._EC2.instances.filter(Filters=[{"Name": "tag:application", "Values": [APPLICATION_TAG]}])
        return [instance.id for instance in instances]

    def get_s3_file(
        self, path: str, s3_bucket: Optional[str] = S3_BUCKET, endpoint_url: str = DEFAULT_S3_ENDPOINT
    ) -> Optional[str]:
        """
        Retrieves a text object from S3 as a UTF-8 string.

        This is best-effort; any retrieval error will be logged and None returned.

        For non-text files, call get_s3_object() instead.

        Returns None if the S3 object is unable to be retrieved.
        Raises ValueError if the bucket is not specified.
        """
        obj = self.get_s3_object(path, s3_bucket, endpoint_url)
        if obj:
            try:
                return obj.get()["Body"].read().decode("utf-8")
            except ClientError as e:
                self.log.error("Unable to get S3 file: %s", _client_error_message(e))
                return None
        self.log.error("Unable to get S3 object")
        return None

    def write_s3_file(
        self, path: str, body: str, s3_bucket: Optional[str] = S3_BUCKET, endpoint_url: str = DEFAULT_S3_ENDPOINT
    ) -> None:
        """
        Write a string to S3.

        Raises ValueError if the bucket is not specified.
        Raises botocore.exceptions.ClientError if the write fails.
        """
        obj = self.get_s3_object(path, s3_bucket, endpoint_url)
        if obj:
            obj.put(Body=body)

    def delete_s3_files(
        self, prefix: str, s3_bucket: Optional[str] = S3_BUCKET, endpoint_url: str = DEFAULT_S3_ENDPOINT
    ) -> int:
        """
        Recursively delete S3 objects.

        Returns the number of objects which were deleted.
        Raises ValueError if the bucket is not specified.
        Raises botocore.exceptions.ClientError if the deletion fails.
        """
        if s3_bucket is None:
            raise ValueError("Source bucket must be specified")
        count = 0
        bucket = self._S3[endpoint_url].Bucket(s3_bucket)
        resp = bucket.objects.filter(Prefix=prefix).delete()
        for item in resp:
            count += len(item.get("Deleted", []))
        return count

    def get_s3_file_list(
        self, prefix: str, s3_bucket: Optional[str] = S3_BUCKET, endpoint_url: str = DEFAULT_S3_ENDPOINT
    ) -> BucketObjectsCollection:
        """
        Lists all objects matching a prefix.

        Returns an iterable object collection.
        Raises ValueError if the bucket is not specified.
        """
        if s3_bucket is None:
            raise ValueError("Source bucket must be specified")
        self.log.debug("[get_s3_file_list] prefix=%s, bucket=%s, endpoint=%s", prefix, s3_bucket, endpoint_url)
        bucket = self._S3[endpoint_url].Bucket(s3_bucket)
        return bucket.objects.filter(Prefix=prefix)
