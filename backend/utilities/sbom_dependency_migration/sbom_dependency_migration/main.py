import argparse
import importlib.metadata
import simplejson as json

from artemisdb.artemisdb.models import Scan
from artemislib.aws import AWSConnect
from artemislib.consts import SBOM_JSON_S3_KEY
from artemislib.env import SCAN_DATA_S3_BUCKET, SCAN_DATA_S3_ENDPOINT
from artemislib.logging import Logger
from sbom_report.report import get_report

LOG = Logger(__name__)

__version__ = importlib.metadata.version("sbom_dependency_migration")


def main():
    parser = argparse.ArgumentParser(description=f"SBOM Dependency Migration {__version__}")
    parser.add_argument("--scanid", required=False, type=str, help="Scan ID of the scan to migrate")
    parser.add_argument("--all", required=False, action="store_true", help="Whether to migrate all SBOM scans")
    parser.add_argument("--include-batch", required=False, action="store_true", help="Whether to migrate batch scans")
    parser.add_argument("--list", required=False, action="store_true", help="List scans available to migrate")
    args = parser.parse_args()

    if args.all or args.list:
        qs = Scan.objects.filter(sbom=True)
        if not args.include_batch:
            qs = qs.filter(batch_priority=False)
        for s in qs:
            if s.dependency_set.exists():
                if args.list:
                    print(f"{s.scan_id} ({s.repo.service}/{s.repo.repo})")
                else:
                    LOG.info("Migrating %s (%s/%s)", s.scan_id, s.repo.service, s.repo.repo)
                    migrate(s.scan_id)
    else:
        migrate(args.scanid)


def migrate(scan_id: str):
    try:
        scan = Scan.objects.get(scan_id=scan_id)
    except Scan.DoesNotExist:
        LOG.error("Scan %s does not exist", scan_id)
        return

    if not scan.sbom:
        LOG.error("Scan %s is not an SBOM scan", scan.scan_id)
        return

    if scan.dependency_set.first() is None:
        LOG.error("Scan %s does not have any dependency information in the database", scan.scan_id)
        return

    LOG.info("Retrieving SBOM dependency tree from database")

    report = get_report(scan.scan_id, skip_s3=True)

    filepath = SBOM_JSON_S3_KEY % scan_id

    LOG.info("Writing dependency tree to %s", filepath)

    aws = AWSConnect()
    aws.write_s3_file(
        path=filepath,
        body=json.dumps(report["sbom"]),
        s3_bucket=SCAN_DATA_S3_BUCKET,
        endpoint_url=SCAN_DATA_S3_ENDPOINT,
    )

    LOG.info("Cleaning up dependency tree from database")

    scan.delete_dependency_set()

    LOG.info("SBOM dependency migration complete")
