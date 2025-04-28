"""
trivy output parser
"""

from engine.plugins.lib.utils import setup_logging
from engine.plugins.lib.trivy_common.parsing_util import convert_type

from typing import Optional

logger = setup_logging("trivy_sbom")


# Gets the scan and formats it to work with the processor
def clean_output_application_sbom(output: dict) -> list:
    results = []
    type = None
    for item in output["components"]:
        # Skip these because these are just stating the package management files
        if item["type"] == "application":
            continue
        if item["type"] == "operating-system":
            continue
        bom_ref = item["bom-ref"]
        if "name" not in item:
            logger.error("Unable to parse trivy component: %s", item)
            continue
        if "group" in item:
            name = f"{item['group']}/{item['name']}"
        else:
            name = item["name"]
        version = item.get("version", "none")
        licenses = []
        licenses_list = item.get("licenses", [])
        for lic in licenses_list:
            # Handles edge case where Licenses array exists with a license object but the license obj is empty. This ensures that licenses stays an empty array so that the processor does not try to override this value
            if lic.get("license").get("name", None) == None:
                break
            licenses.append({"id": lic.get("license").get("name"), "name": lic.get("license").get("name")})
        properties = item.get("properties", [])
        for prop in properties:
            if prop["name"] == "aquasecurity:trivy:PkgType":
                type = convert_type(prop["value"])
                break
        results.append({"bom-ref": bom_ref, "name": name, "version": version, "licenses": licenses, "type": type})
    return results


# Updates the path to be relative to the repo instead of relative to artemis
def edit_application_sbom_path(repo: str, application_sbom_output: dict) -> dict:
    if application_sbom_output.get("metadata", {}).get("component", {}).get("name"):
        application_sbom_output["metadata"]["component"]["name"] = repo
    return application_sbom_output
