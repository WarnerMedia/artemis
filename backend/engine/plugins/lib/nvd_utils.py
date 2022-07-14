import requests

from engine.plugins.lib.utils import CVE_API_URL, get_object_from_json_dict


def get_cve_severity(cve_id: str, logger):
    """Goes to nvd.nist.gov to get the severity of the cve
    :param cve_id: id of the cve to search
    :param logger: log object used by parent plugin
    """
    if not cve_id.startswith("CVE"):
        return None
    cve_url = f"{CVE_API_URL}/{cve_id}"
    response = requests.get(cve_url)
    if response.status_code != 200:
        logger.error("Error retrieving CVE severity query: %s \n %s", cve_url, response.text)
        return None
    response = response.json()
    response_items = response.get("result", {}).get("CVE_Items")
    if response_items and len(response_items) > 0:
        return get_object_from_json_dict(
            response_items[0], ["impact", "baseMetricV3", "cvssV3", "baseSeverity"], logger
        ).lower()
    return None
