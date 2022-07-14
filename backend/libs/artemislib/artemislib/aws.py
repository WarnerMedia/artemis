import json
import os

import boto3
from botocore.exceptions import ClientError

from artemislib.logging import Logger

# https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-envvars.html#envvars-list
#
# If AWS_DEFAULT_REGION is already set use that. If not default to us-east-2.
AWS_DEFAULT_REGION = os.environ.get("AWS_DEFAULT_REGION", "us-east-2")
S3_BUCKET = os.environ.get("S3_BUCKET", None)
SQS_ENDPOINT = os.environ.get("SQS_ENDPOINT", None)
APPLICATION = os.environ.get("APPLICATION", "artemis")
APPLICATION_TAG = os.environ.get("APPLICATION_TAG", APPLICATION)


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
            cls._instance._S3 = boto3.resource("s3", region_name=region)
            cls._instance._SECRETS_MANAGER = boto3.client("secretsmanager", region_name=region)
            cls._instance._SQS = boto3.client("sqs", endpoint_url=SQS_ENDPOINT, region_name=region)
            cls._instance._EC2 = boto3.resource("ec2", region_name=region)
        return cls._instance

    def get_secret(self, secret_name):
        raw_secret = self.get_secret_raw(secret_name)
        if raw_secret is not None:
            return json.loads(raw_secret)
        return None

    def get_secret_raw(self, secret_name):
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

    def get_s3_object(self, s3_key, s3_bucket=S3_BUCKET):
        if s3_bucket:
            return self._S3.Object(s3_bucket, s3_key)

    def copy_s3_object(self, s3_key, new_s3_key, s3_bucket=S3_BUCKET, new_s3_bucket=S3_BUCKET):
        copy_source = {"Bucket": s3_bucket, "Key": s3_key}
        new_obj = self._S3.Bucket(new_s3_bucket).Object(new_s3_key)
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
