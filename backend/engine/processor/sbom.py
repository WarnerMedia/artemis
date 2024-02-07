import uuid

import simplejson as json

from artemisdb.artemisdb.consts import ComponentType
from artemisdb.artemisdb.models import Component, License, RepoComponentScan, Scan
from artemislib.aws import AWSConnect
from artemislib.consts import SBOM_JSON_S3_KEY
from artemislib.env import SCAN_DATA_S3_BUCKET, SCAN_DATA_S3_ENDPOINT
from artemislib.logging import Logger
from utils.plugin import Result

logger = Logger(__name__)


def process_sbom(result: Result, scan: Scan):
    # The graphs are all moved into one list instead of lists of lists so that all of the tree roots are in this list.
    # The "source" field identifies the different graphs from each other.
    flattened = []

    # Go through the graphs
    for graph in result.details:
        # Process all the direct dependencies of this graph
        for direct in graph:
            process_dependency(direct, scan)
            flattened.append(direct)  # Add the direct to the flattened list

    # Write the dependency information to S3
    write_sbom_json(scan.scan_id, flattened)


def process_dependency(dep: dict, scan: Scan):
    component = get_component(dep["name"], dep["version"], scan, dep.get("type"))

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

    for child in dep["deps"]:
        process_dependency(dep=child, scan=scan)


def get_component(name: str, version: str, scan: Scan, component_type: str = None) -> Component:
    label = str(uuid.uuid4()).replace("-", "")  # Dash is not in the allowed character set for ltree labels
    component, created = Component.objects.get_or_create(
        name=name, version=version, defaults={"label": label, "component_type": component_type}
    )

    if not created and component.component_type in [None, ComponentType.UNKNOWN.value] and component_type is not None:
        # Update the component type if not already set
        component.component_type = component_type.lower()
        component.save()

    # Get the component/repo mapping, creating it if necessary. This mapping is maintained so that the SBOM
    # components API can do efficient filtering based on user scope or last scan time. Previously we used
    # the path through the dependency and scan tables for this but it was unusable in practice due to the
    # size of those tables.
    component_repo, created = RepoComponentScan.objects.get_or_create(
        repo=scan.repo, component=component, defaults={"scan": scan}
    )
    if not created:
        # Update the scan to point to this latest scan. We're only tracking the latest scan right now
        # for filtering on when a component was last seen.
        component_repo.scan = scan
        component_repo.save()

    return component


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
    
