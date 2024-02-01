"""
trivy output parser

ToDo: Will need to use topologically sorted graphs using DFS algorithm
"""
import json
from typing import NamedTuple
from engine.plugins.lib import utils

logger = utils.setup_logging("trivy SBOM")

DESC_REMEDIATION_SPLIT = "## Recommendation"

# use SBOM output and build a new list that only contains information we need
def clean_output_application_sbom(output: list) -> list:
    output = convert_output(output)
    results = []
    licenses=[]
    deps = output["dependencies"]
    for item in output["components"]:
        if (item["type"] == "application"):
            continue
        bom_ref = item["bom-ref"]
        name = item["name"]
        version = item["version"]
        licenses_list = item.get("licenses")
        for lic in licenses_list:
            licenses.append({"name": lic.get(["license"]["name"])})
        type = convert_bundler(item["properties"][1]["value"])
        results.append({
            "bom-ref" : bom_ref,
            "name" : name,
            "version" : version,
            "licenses": licenses,
            "deps" : [],
            "type" : type
        })
    return results, deps

def process_deps(output: list) -> list:
    output, deps = clean_output_application_sbom(output)
    for dep in deps:
        dep["ref"]



def convert_bundler(component_type: str) -> str:
    if component_type == "bundler":
        return "gem"
    return component_type.lower()

def convert_output(output_str: str):
    if not output_str:
        return None
    try:
        return json.loads(output_str)
    except json.JSONDecodeError as e:
        logger.error(e)
        return None