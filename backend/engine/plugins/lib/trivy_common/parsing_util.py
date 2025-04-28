"""
trivy output parser
"""

from typing import NamedTuple
from engine.plugins.lib.utils import setup_logging

logger = setup_logging("trivy")

DESC_REMEDIATION_SPLIT = "## Recommendation"


def parse_output(output: list) -> list:
    results = []
    if output:
        for item in output:
            source = item.get("Target")
            component_type = convert_type(item.get("Type", "N/A"))
            if item.get("Vulnerabilities") is None:
                continue
            cve_set = set()
            for vuln in item.get("Vulnerabilities"):
                vuln_id = vuln.get("VulnerabilityID")
                if vuln_id in cve_set:
                    continue
                cve_set.add(vuln_id)
                description_result = get_description_and_remediation(vuln.get("Description"), vuln.get("FixedVersion"))

                component = vuln.get("PkgName")
                if vuln.get("InstalledVersion"):
                    component = f"{component}-{vuln.get('InstalledVersion')}"
                results.append(
                    {
                        "component": component,
                        "source": source,
                        "id": vuln_id,
                        "description": description_result.description,
                        "severity": vuln.get("Severity", "").lower(),
                        "remediation": description_result.remediation,
                        "inventory": {
                            "component": {
                                "name": vuln.get("PkgName"),
                                "version": vuln.get("InstalledVersion"),
                                "type": component_type,
                            },
                            "advisory_ids": sorted(
                                list(set(filter(None, [vuln_id, vuln.get("PrimaryURL")] + vuln.get("References", []))))
                            ),
                        },
                    }
                )
    return results


def get_description_and_remediation(description, fixed_version) -> NamedTuple:
    """
    gets the description and remediation fields after pulling them from the vuln and appending/removing additional info
    :param fixed_version:
    :param description:
    :return: NamedTuple containing the description and remediation
    """
    result = NamedTuple("DescriptionResult", [("description", str), ("remediation", str)])
    if not description:
        description = ""
    remediation = ""
    if DESC_REMEDIATION_SPLIT in description:
        des_split = description.split(DESC_REMEDIATION_SPLIT)
        remediation = des_split[1].strip()
        description = des_split[0].strip()
    if fixed_version:
        remediation = f"Fixed Version: {fixed_version}. {remediation}".strip()
    result.description = description
    result.remediation = remediation
    return result


def convert_type(component_type: str) -> str:
    mapping = {"bundler": "gem"}
    return mapping.get(component_type, component_type).lower()
