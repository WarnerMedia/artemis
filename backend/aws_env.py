#!/usr/bin/python

import argparse
import json
import sys

import requests


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("queue_type", choices=["nat", "public"], type=str)
    parser.add_argument("app", type=str)

    return parser.parse_args()


args = parse_args()

resp = requests.put("http://169.254.169.254/latest/api/token", headers={"X-aws-ec2-metadata-token-ttl-seconds": 21600})
if resp.status_code != 200:
    sys.exit(1)

token = resp.text

resp = requests.get(
    "http://169.254.169.254/latest/dynamic/instance-identity/document", headers={"X-aws-ec2-metadata-token": token}
)
if resp.status_code != 200:
    sys.exit(1)

ident = json.loads(resp.text)

task_queue = "https://sqs.%s.amazonaws.com/%s/%s-task-queue-%s" % (
    ident["region"],
    ident["accountId"],
    args.app,
    args.queue_type,
)

priority_task_queue = "https://sqs.%s.amazonaws.com/%s/%s-priority-task-queue-%s" % (
    ident["region"],
    ident["accountId"],
    args.app,
    args.queue_type,
)

callback_queue = "https://sqs.%s.amazonaws.com/%s/%s-callback-queue" % (ident["region"], ident["accountId"], args.app)

event_queue = "https://sqs.%s.amazonaws.com/%s/%s-event-queue" % (ident["region"], ident["accountId"], args.app)

ecr = "%s.dkr.ecr.%s.amazonaws.com" % (ident["accountId"], ident["region"])

django_secret_arn = "arn:aws:secretsmanager:%s:%s:secret:%s/django-secret-key" % (
    ident["region"],
    ident["accountId"],
    args.app,
)
db_creds_arn = "arn:aws:secretsmanager:%s:%s:secret:%s/db-user" % (ident["region"], ident["accountId"], args.app)

print("TASK_QUEUE=%s" % task_queue)
print("PRIORITY_TASK_QUEUE=%s" % priority_task_queue)
print("ECR=%s" % ecr)
# HOST_WORKING_DIR is mapped into the engine/plugin docker containers for holding the cloned repo
print("HOST_WORKING_DIR=/repos")
print("INSTANCE_ID=%s" % ident["instanceId"])
print("DEFAULT_DEPTH=500")
print("CALLBACK_QUEUE=%s" % callback_queue)
print("EVENT_QUEUE=%s" % event_queue)
print("ANALYZER_DJANGO_SECRETS_ARN=%s" % django_secret_arn)
print("ANALYZER_DB_CREDS_ARN=%s" % db_creds_arn)
print("S3_BUCKET=%s-%s" % (args.app, ident["accountId"]))
print("LOG_GROUP=/%s/engine/cluster/%s" % (args.app, args.queue_type))
