import simplejson as json
from typing import Union

from artemisdb.artemisdb.models import Dependency, Scan
from artemislib.aws import AWSConnect
from artemislib.consts import SBOM_JSON_S3_KEY
from artemislib.env import SCAN_DATA_S3_BUCKET, SCAN_DATA_S3_ENDPOINT
from artemislib.logging import Logger

LOG = Logger(__name__)


def get_report(scan_id, skip_s3: bool = False):
    scan = Scan.objects.filter(scan_id=scan_id).first()
    if not scan:
        LOG.error("Scan %s does not exist", scan_id)
        return None

    LOG.info("Generating SBOM report for scan %s", scan.scan_id)

    report = scan.to_dict()

    sbom = None
    if not skip_s3:
        # Get the SBOM JSON file from S3, if it exists.
        sbom = get_sbom_json(scan.scan_id)

    if sbom:
        # File exists, use it for the SBOM contents
        report["sbom"] = sbom
    else:
        # File doesn't exist, fall back to pulling the dependencies from the DB
        LOG.info("SBOM file not retrieved from S3 (skip_s3 = %s), falling back to database", skip_s3)

        report["sbom"] = []

        for dep in scan.dependency_set.filter(parent__isnull=True):
            report["sbom"].append(process_dep(dep))

    return report


def process_dep(dep):
    c = dep.component.to_dict()
    c.update({"source": dep.source, "deps": get_deps(dep)})
    return c


def get_deps(parent) -> list:
    ret = []
    for dep in Dependency.objects.filter(parent=parent):
        ret.append(process_dep(dep))
    return ret


def get_sbom_json(scan_id: str) -> Union[list, None]:
    filename = SBOM_JSON_S3_KEY % scan_id
    LOG.info("Retrieving %s from S3", filename)

    aws = AWSConnect()
    sbom_file = aws.get_s3_file(filename, SCAN_DATA_S3_BUCKET, SCAN_DATA_S3_ENDPOINT)
    if sbom_file:
        try:
            return json.loads(sbom_file)
        except json.JSONDecodeError:
            LOG.error("Unable to load JSON file")
            return None

    LOG.error("Unable to retrieve file from S3")
    return None
