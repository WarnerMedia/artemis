#!/usr/bin/env python3
import binascii
import os
import subprocess

DJANGO_SECRET_KEY = binascii.b2a_hex(os.urandom(15))
DB_PASSWORD = binascii.b2a_hex(os.urandom(15))

SQS_ENDPOINT = "http://%s:4566"

DOCKER_SOCKET = "/var/run/docker.sock"  # Default
if os.path.isfile(os.path.join(os.path.expanduser("~"), ".lima/default/qemu.pid")):
    # Lima is in use so get the docker socket path there. This assumes Lima is being run
    # instead of Docker Desktop.
    #
    # Sets the docker socket path to be the path to the rootless docker socket in the guest VM
    r = subprocess.run(["lima", "echo", "/var/run/$(id -u)/docker.sock"], capture_output=subprocess.STDOUT)
    if r.returncode == 0:
        DOCKER_SOCKET = r.stdout.decode("utf-8").strip()

# Localstack stuff
print("SQS_ENDPOINT=http://127.0.0.1:4566")
print("INTERNAL_SQS_ENDPOINT=http://localstack:4566")

print("TASK_QUEUE=https://127.0.0.1:4566/000000000000/artemis-task-queue")
print("INTERNAL_TASK_QUEUE=https://localstack:4566/000000000000/artemis-task-queue")

print("PRIORITY_TASK_QUEUE=https://127.0.0.1:4566/000000000000/artemis-priority-task-queue")
print("INTERNAL_PRIORITY_TASK_QUEUE=https://localstack:4566/000000000000/artemis-priority-task-queue")

print("CALLBACK_QUEUE=https://127.0.0.1:4566/000000000000/artemis-callback-queue")
print("INTERNAL_CALLBACK_QUEUE=https://localstack:4566/000000000000/artemis-callback-queue")

print("EVENT_QUEUE=https://127.0.0.1:4566/000000000000/artemis-event-queue")
print("INTERNAL_EVENT_QUEUE=https://localstack:4566/000000000000/artemis-event-queue")

print("REPORT_QUEUE=https://127.0.0.1:4566/000000000000/artemis-report-queue")
print("INTERNAL_REPORT_QUEUE=https://localstack:4566/000000000000/artemis-report-queue")

print("ARTEMIS_SCHEDULED_SCANS_QUEUE=https://127.0.0.1:4566/000000000000/artemis-scheduled-scan-queue")
print("INTERNAL_ARTEMIS_SCHEDULED_SCANS_QUEUE=https://localstack:4566/000000000000/artemis-scheduled-scan-queue")

print("ARTEMIS_SCAN_DATA_S3_ENDPOINT=https://127.0.0.1:4566")
print("INTERNAL_ARTEMIS_SCAN_DATA_S3_ENDPOINT=http://localstack:4566")

# These shouldn't need to be modified
print("ECR=")
print(f"ANALYZER_DJANGO_SECRET_KEY=b{DJANGO_SECRET_KEY.decode('utf-8')}")
print("ANALYZER_DB_NAME=artemisdb")
print("ANALYZER_DB_USERNAME=artemislocaldev")
print(f"ANALYZER_DB_PASSWORD=b{DB_PASSWORD.decode('utf-8')}")
print("ANALYZER_DB_HOST=127.0.0.1")
print("INTERNAL_ANALYZER_DB_HOST=artemisdb")
print("ANALYZER_DB_PORT=5432")
print("ARTEMIS_PRIVATE_DOCKER_REPOS_KEY=private_docker_repo_creds")
print(f"DOCKER_SOCKET={DOCKER_SOCKET}")
print("ARTEMIS_PLUGIN_JAVA_HEAP_SIZE=2g")
print("ARTEMIS_LOG_LEVEL=DEBUG")
print("ARTEMIS_NETWORK=default")

# These values need to be updated for the environment Artemis is deployed in
print("APPLICATION=artemis")  # Update if changing in the Terraform
print("AWS_PROFILE=")
print("S3_BUCKET=artemis-AWS_ACCOUNT_ID")
print("ARTEMIS_FEATURE_AQUA_ENABLED=0")
print("ARTEMIS_FEATURE_SNYK_ENABLED=0")
print("ARTEMIS_FEATURE_VERACODE_ENABLED=0")
print("ARTEMIS_API=https://ARTEMIS_FQDN/api/v1")
print("ARTEMIS_STATUS_LAMBDA=arn:aws:lambda:us-east-2:AWS_ACCOUNT_ID:function:artemis-system-status-handler")
print("ARTEMIS_GITHUB_APP_ID=")
print("ARTEMIS_LINK_GH_CLIENT_ID=")
print("ARTEMIS_LINK_GH_CLIENT_SECRET=")
print("ARTEMIS_MANDATORY_INCLUDE_PATHS=")
print("ARTEMIS_METADATA_SCHEME_MODULES=")
print("ARTEMIS_METADATA_FORMATTER_MODULE=")
print("AWS_DEFAULT_REGION=us-east-2")
print("ARTEMIS_FEATURE_GHAS_ENABLED=0")

print("ARTEMIS_SECRETS_EVENTS_ENABLED=false")
print("ARTEMIS_INVENTORY_EVENTS_ENABLED=false")
print("ARTEMIS_CONFIGURATION_EVENTS_ENABLED=false")
print("ARTEMIS_VULNERABILITY_EVENTS_ENABLED=false")

print("ARTEMIS_SCAN_DATA_S3_BUCKET=artemis-localstack")
print("ARTEMIS_LOCAL_SERVICES_OVERRIDE=0")
