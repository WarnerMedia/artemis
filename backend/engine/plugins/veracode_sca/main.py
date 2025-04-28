import json
import os
import subprocess
import uuid
from copy import deepcopy
from decimal import Decimal
from typing import Tuple

from engine.plugins.lib import utils
from engine.plugins.lib.const import DEFAULT_PLUGIN_JAVA_HEAP_SIZE
from engine.plugins.lib.line_numbers.resolver import LineNumberResolver

AGENT_SECRET_NAME = "veracode-sca"
AGENT_CONF_PATH = ".veracode/agent.yml"
AGENT_CONF_FORMAT = """agentAuthorization: %s
scmType: GIT
"""

LOG = utils.setup_logging("veracode_sca")
RESOLVER = LineNumberResolver()


class AgentError(Exception):
    pass


class AgentDebug(Exception):
    pass


def main(in_args=None):
    args = utils.parse_args()

    vulns = {}
    errors = []
    debug = []

    try:
        # Run the agent and get the JSON output
        output = run_agent(
            args.path,
            args.engine_vars.get("java_heap_size", DEFAULT_PLUGIN_JAVA_HEAP_SIZE),
            args.engine_vars.get("include_dev", False),
        )

        # Build the results dictionary from the vulns and libraries
        vulns = process_vulns(output["records"][0]["vulnerabilities"], output["records"][0]["libraries"])

        # Process the vulnerable packages to determine their source locations
        vulns = process_libs(vulns, output["records"][0]["graphs"], base_path=args.path)
    except AgentError as e:
        errors.append(str(e))
    except AgentDebug as e:
        debug.append(str(e))

    # Print the results to stdout
    print(json.dumps({"success": True, "details": vulns, "errors": errors, "debug": debug}))


def run_agent(scan_path: str, java_heap_size: str, include_dev: bool = False) -> dict:
    LOG.info("Running srcclr (including dev dependencies: %s)", include_dev)
    LOG.info("Java heap size: %s", java_heap_size)

    ret = {}

    env = {
        **os.environ,
        # Set the SRCCLR_API_TOKEN env var for the subprocess
        "SRCCLR_API_TOKEN": utils.get_secret(AGENT_SECRET_NAME, LOG)["agentAuthorization"],
        # Set the Java heap size, JVM string usage optimizations
        "JAVA_OPTS": f"-Xmx{java_heap_size} -XX:+OptimizeStringConcat -XX:+UseStringDeduplication",
    }

    if not include_dev:
        env["SRCCLR_SCOPE"] = "prod"

    # Generate a randomized filename for srcclr to write the JSON output to. We can't just read the JSON off of stdout
    # because srcclr puts warning messages on stdout instead of stderr, which messes up the JSON parsing.
    json_file = f"/tmp/srcclr-{uuid.uuid4()}.json"

    try:
        r = subprocess.run(
            ["srcclr", "scan", "--json", json_file, "--no-upload", "--recursive", "--url", scan_path],
            capture_output=True,
            check=False,
            env=env,
        )

        if r.returncode != 0:
            raise AgentError(r.stderr.decode("utf-8").strip())

        try:
            with open(json_file) as f:
                ret = json.load(f, parse_float=Decimal)
        except FileNotFoundError:
            if r.stdout:
                LOG.info(r.stdout.decode("utf-8").strip())
            msg = "Veracode SCA agent generated no results for this repository"
            if "ERROR" in r.stdout.decode("utf-8"):
                # If the output includes an ERROR message extract it from stdout and append it to the debug message
                start = r.stdout.decode("utf-8").find("ERROR")
                error_msg = r.stdout.decode("utf-8")[start:].strip().replace("\t", " ")
                msg = f"{msg} [{error_msg}]"
            raise AgentDebug(msg)
    finally:
        # Make sure the JSON output file gets cleaned up
        if os.path.exists(json_file):
            os.unlink(json_file)

    return ret


def process_vulns(vulns: list, libs: list) -> list:
    LOG.info("Processing vulns")

    ret = []
    unique_vulns = set()
    for vuln in vulns:
        for lib in vuln["libraries"]:
            ident = f"CVE-{vuln['cve']}" if vuln["cve"] is not None else vuln.get("_links", {}).get("html", "Unknown")
            unique_vulns.add(ident)
            (name, version, sha, coord_type) = library_lookup(libs, lib["_links"]["ref"])
            advisory_ids = [ident]
            if vuln["cve"] is not None and vuln.get("_links", {}).get("html") is not None:
                advisory_ids.append(vuln["_links"]["html"])
            ret.append(
                {
                    "component": f"{name}-{version}",
                    "source": coord_type,  # Default to coordinate type just in case
                    "id": ident,
                    "description": vuln["overview"],
                    "severity": cvss2_to_sev(vuln["cvssScore"]),
                    "remediation": details_to_remediation(lib["details"]),
                    "filename": None,
                    "line": None,
                    "sha1": sha,
                    "inventory": {
                        "component": {"name": name, "version": version, "type": coord_type.lower()},
                        "advisory_ids": advisory_ids,
                    },
                }
            )

    LOG.info("%s vulns discovered (%s unique)", len(ret), len(unique_vulns))

    return ret


def process_libs(vulns: list, graphs: list, base_path: str) -> list:
    LOG.info("Processing libraries")

    expanded_vulns = []
    for vuln in vulns:
        source = set()

        for item in graphs:
            source = source.union(check_graph(vuln["component"], item, sha1=vuln["sha1"]))

        # No longer needed and we don't want it in the final dict
        del vuln["sha1"]

        if not source:
            # If no source graphs were identified still include the vuln as-is
            expanded_vulns.append(vuln)
            continue

        # Expand the vuln so that there's one per source item. This way the filename and line number information is
        # 1:1 with the source.
        for source_item in source:
            new_vuln = deepcopy(vuln)
            new_vuln["source"] = source_item[0]
            new_vuln["filename"] = source_item[2]
            new_vuln["line"] = source_item[3]
            if source_item[2] is not None and source_item[3] is None:
                # If the filename is identified but the line number isn't use the resolver to find the line number
                full_filename = os.path.join(base_path, source_item[2])
                RESOLVER.load_file(full_filename)
                new_vuln["line"] = RESOLVER.find(source_item[1], filename=full_filename).get("line", None)

                # This is a special case for NPM that may occur. It's possible for Veracode to report the package in
                # the lockfile but not use a search string that matches in the lockfile. In this case if the
                # package.json file is present load it and search it as well.
                if (
                    new_vuln["line"] is None  # Line number was not found
                    and full_filename.endswith("package-lock.json")  # package-lock.json was searched
                    and os.path.exists(
                        full_filename.replace("package-lock.json", "package.json")  # package.json present
                    )
                ):
                    new_full_filename = full_filename.replace("package-lock.json", "package.json")
                    RESOLVER.load_file(new_full_filename)
                    new_vuln["line"] = RESOLVER.find(source_item[1], filename=new_full_filename).get("line", None)

            expanded_vulns.append(new_vuln)

    # Replace the existing vulns list with the expanded list
    return expanded_vulns


def check_graph(pkg: str, item: dict, parent: str = None, top_level: bool = True, sha1: str = None) -> set:
    ret = set()

    # The first time through check_graph() should skip the path because the coordinate is going to be for the top-level
    # package name, which will be the same for everything in the file. Only start building the path upon recursion,
    # which is when the actual dependencies start
    path = None
    if not top_level:
        path = f"{parent}>{item['coords']['coordinate1']}" if parent else item["coords"]["coordinate1"]

    # Check the coords and add the source filename if it matches
    if item["coords"] and check_graph_coords(pkg, item["coords"]):
        ret.add(
            # This would be better as a dict or something but a tuple is hashable which means it can go into a set
            (f"{item['filename']}: {path}" if path else item["filename"], path, item["filename"], item["lineNumber"])
        )
    elif top_level and item["coords"] is None and sha1 is not None and item["sha1"] == sha1:
        # This seems to be the conditions that occur when the dependency is directly in the repo
        ret.add((item["filename"], None, item["filename"], item["lineNumber"]))

    # Recurse through all the directs
    for direct in item["directs"]:
        ret = ret.union(check_graph(pkg, direct, path, top_level=False, sha1=sha1))

    return ret


def check_graph_coords(pkg: str, coords: dict) -> bool:
    return f"{coords.get('coordinate1')}-{coords.get('version')}" == pkg


def library_lookup(libs: list, link: str) -> Tuple[str, str, str, str]:
    # The link string is a reference into structure of the JSON returned by the agent. Since we're starting from
    # the "libraries" key we only need the last three parts of the path to find the object within the dictionary that
    # is being referenced.
    ref = link.split("/")[-3:]

    lib_index = int(ref[0])
    ver_index = int(ref[2])

    name = libs[lib_index]["coordinate1"]
    version = libs[lib_index]["versions"][ver_index]["version"]
    sha1 = libs[lib_index]["versions"][ver_index]["sha1"]
    coord_type = libs[lib_index]["coordinateType"]

    return (name, version, sha1, coord_type)


def cvss2_to_sev(cvss: Decimal) -> str:
    # https://nvd.nist.gov/vuln-metrics/cvss
    if cvss >= 7:
        return "high"
    elif cvss >= 4:
        return "medium"
    else:
        return "low"


def details_to_remediation(details: list) -> str:
    # Go through any details looking for actionable information to use as remediation details
    for detail in details:
        if detail["updateToVersion"]:
            # Use the update version if available
            return f"Update to: {detail['updateToVersion']}"
        elif detail["fixText"]:
            # Use the fix text if available and there's no update version
            return detail["fixText"]
        elif detail["patch"]:
            # Use the patch information if there's no update version or fix version
            return f"Patch: {detail['patch']}"

    # There's no remediation info so return an empty string
    return ""


if __name__ == "__main__":
    main()
