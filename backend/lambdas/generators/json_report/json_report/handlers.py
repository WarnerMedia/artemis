from json_report.report import get_report


def handler(event, _=None):
    scan_id = event["scan_id"]
    params = event["filters"]

    return get_report(scan_id, params)
