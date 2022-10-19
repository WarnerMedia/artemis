import json
import uuid

import boto3
from botocore.exceptions import ClientError
from django.db import transaction

from artemisdb.artemisdb.consts import ReportStatus, ScanStatus
from artemisdb.artemisdb.models import Group, Repo, Report, ScanBatch, ScanScheduleRun, User
from artemislib.aws import AWS_DEFAULT_REGION
from repo.util.const import DEFAULT_S3_DL_EXPIRATION_SECONDS
from repo.util.env import (
    DEFAULT_BATCH_PRIORITY,
    PRIORITY_TASK_QUEUE,
    PRIORITY_TASK_QUEUE_NAT,
    REPORT_QUEUE,
    S3_BUCKET,
    SQS_ENDPOINT,
    TASK_QUEUE,
    TASK_QUEUE_NAT,
)
from repo.util.utils import get_iso_timestamp, get_ttl_expiration, is_qualified, is_sbom


class LambdaError(Exception):
    pass


class AWSConnect:
    _instance = None
    _SQS = None
    _S3 = None
    _S3_CLIENT = None
    _SECRETS_MANAGER = None

    def __new__(cls, region=AWS_DEFAULT_REGION):
        if cls._instance is None:
            cls._instance = super(AWSConnect, cls).__new__(cls)
            cls._instance._SQS = boto3.client("sqs", endpoint_url=SQS_ENDPOINT, region_name=region)
            cls._instance._S3 = boto3.resource("s3", region_name=region)
            cls._instance._S3_CLIENT = boto3.client("s3", region_name=region)
            cls._instance._SECRETS_MANAGER = boto3.client("secretsmanager", region_name=region)
            cls._instance._LAMBDA = boto3.client("lambda", region_name=region)
        return cls._instance

    def queue_repo_for_scan(
        self,
        name,
        repo_url,
        repo_size,
        service,
        public=False,
        plugins=None,
        depth=None,
        branch=None,
        include_dev=False,
        callback_url=None,
        client_id=None,
        batch_priority=DEFAULT_BATCH_PRIORITY,
        identity=None,
        categories=None,
        nat_queue=False,
        diff_base=None,
        schedule_run=None,
        batch_id=None,
        include_paths: list = None,
        exclude_paths: list = None,
    ):
        # If the request included batch_priority=True then this is a batch scan
        # and has lower priority than on-demand scans. Put these scans in the
        # normal task queue, which is only serviced when the priority task queue
        # is empty.
        if batch_priority and nat_queue:
            queue_url = TASK_QUEUE_NAT
        elif batch_priority:
            queue_url = TASK_QUEUE
        elif nat_queue:
            queue_url = PRIORITY_TASK_QUEUE_NAT
        else:
            queue_url = PRIORITY_TASK_QUEUE

        if not queue_url:
            raise KeyError("queue_url is None. Check Lambda environment variables.")

        scan = self.create_scan(
            name,
            branch,
            service,
            identity=identity,
            categories=categories,
            plugins=plugins,
            depth=depth,
            include_dev=include_dev,
            callback={"url": callback_url, "client_id": client_id},
            batch_priority=batch_priority,
            schedule_run=schedule_run,
            batch_id=batch_id,
            include_paths=include_paths,
            exclude_paths=exclude_paths,
        )
        try:
            self._SQS.send_message(
                QueueUrl=queue_url,
                MessageAttributes={
                    "action": {"DataType": "String", "StringValue": "scan"},
                    "timestamp": {"DataType": "String", "StringValue": get_iso_timestamp()},
                },
                MessageBody=json.dumps(
                    {
                        "repo": name,
                        "service": service,
                        "scan_id": str(scan.scan_id),
                        "url": repo_url,
                        "public": public,
                        "plugins": plugins,
                        "repo_size": repo_size,
                        "depth": depth,
                        "branch": branch,
                        "include_dev": include_dev,
                        "callback": {"url": callback_url, "client_id": client_id},
                        "features": identity.features,
                        "diff_base": diff_base,
                        "batch_id": batch_id,
                    }
                ),
            )
        except ClientError:
            self.update_status(scan, ScanStatus.ERROR.value, errors=["Unable to queue task"])
        return str(scan.scan_id)

    def create_scan(
        self,
        repo,
        ref,
        service,
        identity=None,
        categories=None,
        plugins=None,
        depth=None,
        include_dev=False,
        callback=None,
        batch_priority=DEFAULT_BATCH_PRIORITY,
        schedule_run=None,
        batch_id=None,
        include_paths: list = None,
        exclude_paths: list = None,
    ):
        """
        Creates the scan record in the database
        """
        run = None
        owner = None
        owner_group = None
        batch = None
        if schedule_run is not None:
            run = ScanScheduleRun.objects.get(run_id=schedule_run)
            owner = run.schedule.owner
        elif identity.principal_type in ["user", "user_api_key"]:
            owner = User.objects.filter(email=identity.principal_id).first()
        elif identity.principal_type == "group_api_key":
            owner_group = Group.objects.filter(group_id=identity.principal_id).first()
        if batch_id is not None:
            try:
                batch = ScanBatch.objects.get(batch_id=batch_id)
            except ScanBatch.DoesNotExist:
                # The batch ID was previously validated to exist but there's a race condition when
                # we implement batch deletion/cleanup so handle when the batch does not exist.
                # The 'batch' variable is already initialized to None so we can just pass here.
                pass
        with transaction.atomic():
            # The DB cleanup process will delete repo objects that don't have any associated scans
            # so that when all of the scans from a deleted repo age out we also clean up the repo
            # records. We need to do repo and scan creation in a transaction so that we don't have
            # a race condition where a repo would get deleted immediately after creation should the
            # DB cleanup happen to run between repo creation and scan creation.
            repo, _created = Repo.objects.get_or_create(repo=repo, service=service)
            scan = repo.scan_set.create(
                scan_id=uuid.uuid4(),
                ref=ref,
                status=ScanStatus.QUEUED.value,
                expires=get_ttl_expiration(),
                owner=owner,
                owner_group=owner_group,
                categories=categories,
                plugins=plugins,
                depth=depth,
                include_dev=include_dev,
                callback=callback,
                batch_priority=batch_priority,
                sbom=is_sbom(plugins),
                qualified=is_qualified(plugins),
                schedule_run=run,
                batch=batch,
                include_paths=include_paths or [],
                exclude_paths=exclude_paths or [],
            )
        return scan

    def update_status(self, scan, status, errors=None):
        """
        Updates the scan with the latest status.
        """

        scan.status = status
        if errors:
            scan.errors = errors
        scan.save()

    def get_s3_object(self, s3_key, s3_bucket=S3_BUCKET):
        return self._S3.Object(s3_bucket, s3_key)

    def get_s3_presigned_url(self, s3_key, s3_bucket=S3_BUCKET, expiration=DEFAULT_S3_DL_EXPIRATION_SECONDS):
        try:
            return self._S3_CLIENT.generate_presigned_url(
                "get_object", Params={"Bucket": s3_bucket, "Key": s3_key}, ExpiresIn=expiration
            )
        except ClientError as e:
            print(e.response)
        return None

    def get_key(self, secret_name):
        try:
            return self._SECRETS_MANAGER.get_secret_value(SecretId=secret_name)
        except ClientError as e:
            if e.response["Error"]["Code"] in (
                "DecryptionFailureException",
                "InternalServiceErrorException",
                "InvalidParameterException",
                "InvalidRequestException",
                "ResourceNotFoundException",
            ):
                raise e
            print(e.response)
        return None

    def get_secret(self, secret_name):
        get_secret_value_response = self.get_key(secret_name)
        if not get_secret_value_response:
            return None
        # Decrypts secret using the associated KMS CMK.
        # Depending on whether the secret is a string or binary, one of these
        # fields will be populated.
        if "SecretString" in get_secret_value_response:
            secret = get_secret_value_response["SecretString"]
            return json.loads(secret)
        return None

    def invoke_lambda(self, name: str, payload: dict) -> dict:
        resp = self._LAMBDA.invoke(FunctionName=name, InvocationType="RequestResponse", Payload=json.dumps(payload))
        if resp["StatusCode"] == 200 and "FunctionError" not in resp:
            return json.load(resp["Payload"])
        else:
            raise LambdaError

    def queue_report(self, report_id: str) -> bool:
        try:
            self._SQS.send_message(QueueUrl=REPORT_QUEUE, MessageBody=json.dumps({"report_id": report_id}))
            return True
        except ClientError:
            report = Report.objects.get(report_id=report_id)
            report.status = ReportStatus.FAILED.value
            return False
