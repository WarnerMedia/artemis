from sbom_report.report import get_report


def handler(event, _=None):
    scan_id = event["scan_id"]

    return get_report(scan_id)
