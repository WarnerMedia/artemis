import uuid

import simplejson as json

from artemisdb.artemisdb.consts import ComponentType
from artemisdb.artemisdb.models import Component, License, RepoComponentScan, Scan
from artemislib.aws import AWSConnect
from artemislib.consts import SBOM_JSON_S3_KEY
from artemislib.env import SCAN_DATA_S3_BUCKET, SCAN_DATA_S3_ENDPOINT
from artemislib.logging import Logger
from utils.plugin import Result
from processor.sbom import get_component

logger = Logger(__name__)


def process_sbom(result: Result, scan: Scan):
    # Go through the graphs
    for obj in result.details[0]:
        process_dependency(obj, scan)

    # Write the dependency information to S3
    write_sbom_json(scan.scan_id, result.details)


def process_dependency(dep: dict, scan: Scan):
    component = get_component(dep["name"], dep["version"], scan, dep.get("type"))

    # Keep a copy of the license objects so they only have to be retrieved from the DB once
    license_obj_cache = {}

    licenses = []
    for license in dep["licenses"]:
        license_id = license.get("id").lower()
        print(f"Licenses: {license_id}")
        if license_id not in license_obj_cache:
            # If we don't have a local copy of the license object get it from the DB
            license_obj_cache[license_id], _ = License.objects.get_or_create(
                license_id=license_id, defaults={"name": license["name"]}
            )

        # Add the license object to the list for this component
        licenses.append(license_obj_cache[license_id])

    # Update the component's set of licenses
    if licenses:
        component.licenses.set(licenses)


def write_sbom_json(scan_id: str, sbom: str) -> None:
    aws = AWSConnect()
    s3_file_data = None
    s3_file_list = []
    s3_file_list = aws.get_s3_file_list(
        prefix=(f"scans/{scan_id}/sbom/"),
        s3_bucket=SCAN_DATA_S3_BUCKET,
        endpoint_url=SCAN_DATA_S3_ENDPOINT,
    )
    # if file already exists, add to it
    if "artemis.json" in s3_file_list:
        try:
            s3_file_data = aws.get_s3_file(
            path=(SBOM_JSON_S3_KEY % scan_id),
            s3_bucket=SCAN_DATA_S3_BUCKET,
            endpoint_url=SCAN_DATA_S3_ENDPOINT,
            )
            aws.write_s3_file(
                path=(SBOM_JSON_S3_KEY % scan_id),
                body=s3_file_data + json.dumps(sbom, indent=2),
                s3_bucket=SCAN_DATA_S3_BUCKET,
                endpoint_url=SCAN_DATA_S3_ENDPOINT,
            )
        except Exception as error:
            logger.error(error)
    else:
        # if file does not already exist, create and write to it
        aws.write_s3_file(
            path=(SBOM_JSON_S3_KEY % scan_id),
            body=json.dumps(sbom, indent=2),
            s3_bucket=SCAN_DATA_S3_BUCKET,
            endpoint_url=SCAN_DATA_S3_ENDPOINT,
        )
    