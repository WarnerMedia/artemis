"""
trivy output parser
"""
import json
from engine.plugins.lib import utils

logger = utils.setup_logging("trivy SBOM")

import json

# Gets the scan and formats it to work with the processor
def clean_output_application_sbom(output:list) -> list:
    results = []
    type = None
    for item in output["components"]:
        if item["type"] == "application":
            continue
        if item["type"] == "operating-system":
            continue
        bom_ref = item["bom-ref"]
        name = item.get("group", "") + item["name"]
        version = item["version"]
        licenses=[]
        licenses_list = item.get("licenses", [])
        for lic in licenses_list:
            licenses.append(
                {
                    "id": lic.get("license").get("name", "placeholder"),
                    "name": lic.get("license").get("name", "placeholder")
                }
            )
        properties = item.get("properties", [])
        for prop in properties:
            if prop["name"] == "aquasecurity:trivy:PkgType":
                type = convert_bundler(prop["value"])
                break
        results.append({
            "bom-ref" : bom_ref,
            "name" : name,
            "version" : version,
            "licenses": licenses,
            "type" : type
        })
    return results

# def get_library(output):
#     for 

def convert_bundler(component_type: str) -> str:
    if component_type == "bundler":
        return "gem"
    return component_type.lower()

