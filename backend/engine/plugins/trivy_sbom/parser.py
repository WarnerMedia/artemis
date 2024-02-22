"""
trivy output parser
"""
from engine.plugins.lib import utils
from utils import convert_type

logger = utils.setup_logging("trivy SBOM")

# Gets the scan and formats it to work with the processor
def clean_output_application_sbom(output: list) -> list:
    results = []
    type = None
    for item in output["components"]:
        # Skip these because these are just stating the package management files
        if item["type"] == "application":
            continue
        if item["type"] == "operating-system":
            continue
        bom_ref = item["bom-ref"]
        name = item.get("group", "") + item["name"]
        version = item["version"]
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
