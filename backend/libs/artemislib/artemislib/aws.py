import json
from typing import Union

import boto3
from botocore.exceptions import ClientError

from artemislib.env import (
    APPLICATION_TAG,
    AWS_DEFAULT_REGION,
    DEFAULT_S3_ENDPOINT,
    S3_BUCKET,
    SCAN_DATA_S3_ENDPOINT,
    SQS_ENDPOINT,
)
from artemislib.logging import Logger


class LambdaError(Exception):
    pass


class AWSConnect:
    _instance = None
    _SECRETS_MANAGER = None
    _S3 = None
    log = None

    def __new__(cls, region: str = AWS_DEFAULT_REGION, queue: str = None):
        if cls._instance is None:
            cls._instance = super(AWSConnect, cls).__new__(cls)
            cls._instance.log = Logger("AWSConnect")
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

    def get_secret(self, secret_name):
        """
        Retrieves a JSON value from Secrets Manager.

        Returns None if the Secrets Manager value is not a string.
        Raises botocore.exceptions.ClientError if secret value is not set or cannot be decrypted.
        """
        raw_secret = self.get_secret_raw(secret_name)
        if raw_secret is not None:
            return json.loads(raw_secret)
        return None

    def get_secret_raw(self, secret_name):
        """
        Retrieves a raw Secrets Manager string value.

        Returns None if the Secrets Manager value is not a string.
        Raises botocore.exceptions.ClientError if secret value is not set or cannot be decrypted.
        """
        try:
            get_secret_value_response = self._SECRETS_MANAGER.get_secret_value(SecretId=secret_name)
        except ClientError as e:
            if e.response["Error"]["Code"] in (
                "DecryptionFailureException",
                "InternalServiceErrorException",
                "InvalidParameterException",
                "InvalidRequestException",
                "ResourceNotFoundException",
            ):
                raise e
            self.log.error("Unable to get value: %s", e.response["Error"]["Message"])
        else:
            # Decrypts secret using the associated KMS CMK.
            # Depending on whether the secret is a string or binary, one of these
            # fields will be populated.
            if "SecretString" in get_secret_value_response:
                return get_secret_value_response["SecretString"]
        return None

    def get_s3_object(self, s3_key, s3_bucket=S3_BUCKET, endpoint_url: str = DEFAULT_S3_ENDPOINT):
        self.log.debug("[get_s3_object] key=%s, bucket=%s, endpoint=%s", s3_key, s3_bucket, endpoint_url)
        if s3_bucket:
            return self._S3[endpoint_url].Object(s3_bucket, s3_key)

    def copy_s3_object(
        self, s3_key, new_s3_key, s3_bucket=S3_BUCKET, new_s3_bucket=S3_BUCKET, endpoint_url: str = DEFAULT_S3_ENDPOINT
    ):
        """
        Copies an S3 object from one location to another.
        """
        copy_source = {"Bucket": s3_bucket, "Key": s3_key}
        new_obj = self._S3[endpoint_url].Bucket(new_s3_bucket).Object(new_s3_key)
        new_obj.copy(copy_source)

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
        self, path: str, s3_bucket: str = S3_BUCKET, endpoint_url: str = DEFAULT_S3_ENDPOINT
    ) -> Union[str, None]:
        obj = self.get_s3_object(path, s3_bucket, endpoint_url)
        if obj:
            try:
                return obj.get()["Body"].read().decode("utf-8")
            except ClientError as e:
                self.log.error("Unable to get S3 file: %s", e.response["Error"]["Message"])
                return None
        self.log.error("Unable to get S3 object")
        return None

    def write_s3_file(
        self, path: str, body: str, s3_bucket: str = S3_BUCKET, endpoint_url: str = DEFAULT_S3_ENDPOINT
    ) -> None:
        obj = self.get_s3_object(path, s3_bucket, endpoint_url)
        if obj:
            obj.put(Body=body)

    def delete_s3_files(self, prefix: str, s3_bucket: str = S3_BUCKET, endpoint_url: str = DEFAULT_S3_ENDPOINT) -> int:
        count = 0
        bucket = self._S3[endpoint_url].Bucket(s3_bucket)
        resp = bucket.objects.filter(Prefix=prefix).delete()
        for item in resp:
            count += len(item.get("Deleted", []))
        return count

    def get_s3_file_list(
        self, prefix: str, s3_bucket: str = S3_BUCKET, endpoint_url: str = DEFAULT_S3_ENDPOINT
    ) -> list:
        self.log.debug("[get_s3_file_list] prefix=%s, bucket=%s, endpoint=%s", prefix, s3_bucket, endpoint_url)
        bucket = self._S3[endpoint_url].Bucket(s3_bucket)
        return bucket.objects.filter(Prefix=prefix)
