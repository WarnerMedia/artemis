from copy import copy

from engine.plugins.lib.cve import find_cves
from engine.plugins.lib.line_numbers.resolver import LineNumberResolver


def _normalize_severity(severity: str) -> str:
    if severity == "moderate":
        return "medium"
    return severity


def parse_advisory(adv: dict, package_file: str, lockfile: dict, resolver: LineNumberResolver, path: str) -> list:
    results = []

    # npm can pull in multiple versions of a module
    versions = _find_versions(lockfile, adv["name"], adv["nodes"], resolver)

    # Create an entry for each CVE/version pairing
    for via in adv["via"]:
        if isinstance(via, str):
            # Skip vias that are strings
            continue

        # Find the CVEs that go with the advisory URL
        cves = find_cves(via["url"])
        advisory_ids = copy(cves)
        if not cves:
            # If there are no CVEs use the URL itself as the vuln ID
            cves = [via["url"]]
        advisory_ids.append(via["url"])

        for cve in cves:
            for ver in versions:
                results.append(
                    {
                        "component": f"{adv['name']}-{ver['version']}",
                        "source": f"{package_file}: {ver['path']}",
                        "id": cve,
                        "description": via["title"],
                        "severity": _normalize_severity(via["severity"]),
                        "remediation": "",
                        "filename": str(ver["filename"] or "").replace(f"{path}", ""),
                        "line": ver["line"],
                        "inventory": {
                            "component": {"name": adv["name"], "version": ver["version"], "type": "npm"},
                            "advisory_ids": sorted(list(set(filter(None, advisory_ids)))),
                        },
                    }
                )

    return results


def _find_versions(lockfile: dict, component: str, nodes: list, resolver: LineNumberResolver) -> list:
    if lockfile["lockfileVersion"] == 1:
        return _find_versions_v1(lockfile, component, resolver)
    elif lockfile["lockfileVersion"] == 2:
        return _find_versions_v2(lockfile, nodes, resolver)
    return []


def _find_versions_v1(lockfile: dict, component: str, resolver: LineNumberResolver, parent: str = None) -> list:
    """
    Parse a v1 lockfile structure (npm v6 and earlier) to find all of the component versions. This is a recursive
    function to traverse the dependency tree and find the path to the component. This path is built up as a string
    'dep1>dep2>dep3' so that it's easier to identify vulnerable dependencies that are actually dependencies of
    dependencies.
    """
    versions = []

    if "dependencies" not in lockfile:
        return []

    if component in lockfile["dependencies"]:
        path = f"{parent}>{component}" if parent else component
        if lockfile["dependencies"][component].get("bundled", False):
            # If the component is bundled it does not have its own integrity.
            # Instead use the bundling package's integrity.
            integrity = lockfile.get("integrity")
        else:
            integrity = lockfile["dependencies"][component].get("integrity")
        source = resolver.find(integrity) or resolver.find(path)
        versions.append(
            {
                "path": path,
                "version": lockfile["dependencies"][component]["version"],
                "integrity": integrity,
                "dev": lockfile["dependencies"][component].get("dev", False),
                "filename": source.get("filename"),
                "line": source.get("line"),
            }
        )

    # Look through all the dependencies and recurse through sub-dependencies looking for the component
    for dep in lockfile["dependencies"]:
        if "dependencies" in lockfile["dependencies"][dep]:
            new_parent = f"{parent}>{dep}" if parent else dep
            versions += _find_versions_v1(lockfile["dependencies"][dep], component, resolver, new_parent)

    return versions


def _find_versions_v2(lockfile: dict, nodes: list, resolver: LineNumberResolver) -> list:
    """
    Parse a v2 lockfile structure (npm v7) to find all the component versions. The node name is converted to the
    desired format through substring replacement: node_modules/dep1/node_modules/dep2/node_modules/dep3 becomes
    dep1>dep2>dep3.
    """
    versions = []
    for node in nodes:
        pkg = lockfile["packages"][node]
        path = f"/{node}".replace("/node_modules/", ">")[1:]
        source = resolver.find(pkg["integrity"]) or resolver.find(path)
        versions.append(
            {
                "path": path,
                "version": pkg["version"],
                "integrity": pkg["integrity"],
                "dev": pkg.get("dev", False),
                "filename": source["filename"],
                "line": source["line"],
            }
        )
    return versions
