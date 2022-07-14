import requests


def _retrieve_scan(scan_id: str, apikey: str, api_url: str) -> dict:
    print(f"Retrieving {scan_id}")
    r = requests.get(f"{api_url}{scan_id}", headers={"x-api-key": apikey})
    if r.status_code != requests.codes["ok"]:
        print(f"Error retrieving {scan_id}: {r.body}")
        return {}
    return r.json()


def retrieve_scans(scan_ids: list, apikey: str) -> list:
    scans = []
    for scan_id in scan_ids:
        scan = _retrieve_scan(scan_id, apikey)
        if scan:
            scans.append(scan)
    return scans


def parse_scan_ids(scans: str) -> list:
    return [s for s in scans.split(",") if s]
