import uuid

import simplejson as json

from artemisdb.artemisdb.models import License, Scan
from artemislib.aws import AWSConnect
from artemislib.consts import SBOM_JSON_S3_KEY
from artemislib.env import SCAN_DATA_S3_BUCKET, SCAN_DATA_S3_ENDPOINT
from artemislib.logging import Logger
from utils.plugin import Result
from processor.sbom import get_component
from processor.sbom import convert_output

logger = Logger(__name__)


def process_sbom(result: Result, scan: Scan):
    results = result.details[0]
    parsed = result.details[1]
    # Go through the results
    for obj in parsed:
        process_dependency(obj, scan)

    # Write the dependency information to S3
    write_sbom_json(scan.scan_id, results)


def process_dependency(dep: dict, scan: Scan):
    component = get_component(dep["name"], dep["version"], scan, dep["type"])

    # Keep a copy of the license objects so they only have to be retrieved from the DB once
    license_obj_cache = {}

    licenses = []
    for license in dep["licenses"]:
        license_id = license.get("id").lower()
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
    # Check if file already exists
    logger.debug(f"AWS acc ID: {aws.get_acc_id()}")
    print(f"AWS ACC ID: {aws.get_acc_id()}")
    try:
        s3_file_data = aws.get_s3_file(
            path=(SBOM_JSON_S3_KEY % scan_id),
            s3_bucket=SCAN_DATA_S3_BUCKET,
            endpoint_url=SCAN_DATA_S3_ENDPOINT,
        )
    except Exception as error:
        logger.error(error)
    if s3_file_data != None:
        # if file already exists, add to it
        body = [convert_output(s3_file_data), sbom]
        try:
            aws.write_s3_file(
                path=(SBOM_JSON_S3_KEY % scan_id),
                body=json.dumps(body, indent=2),
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
