import json
import os
import subprocess
import uuid
from decimal import Decimal

from engine.plugins.lib import utils
from engine.plugins.lib.const import DEFAULT_PLUGIN_JAVA_HEAP_SIZE
from engine.plugins.lib.line_numbers.resolver import LineNumberResolver

AGENT_SECRET_NAME = "veracode-sca"
AGENT_CONF_PATH = ".veracode/agent.yml"
AGENT_CONF_FORMAT = """agentAuthorization: %s
scmType: GIT
"""

LOG = utils.setup_logging("veracode_sbom")
RESOLVER = LineNumberResolver()


class AgentError(Exception):
    pass


class AgentDebug(Exception):
    pass


def main(in_args=None):
    args = utils.parse_args()

    sbom = []
    errors = []
    debug = []

    try:
        # Run the agent and get the JSON output
        output = run_agent(
            args.path,
            args.engine_vars.get("java_heap_size", DEFAULT_PLUGIN_JAVA_HEAP_SIZE),
            args.engine_vars.get("include_dev", False),
        )

        # Build the SBOM graph
        sbom = process_sbom(output["records"][0]["graphs"], output["records"][0]["libraries"])
    except AgentError as e:
        errors.append(str(e))
    except AgentDebug as e:
        debug.append(str(e))

    # Print the results to stdout
    print(json.dumps({"success": True, "details": sbom, "errors": errors, "debug": debug}))


def run_agent(scan_path: str, java_heap_size: str, include_dev: bool = False) -> dict:
    LOG.info("Running srcclr (including dev dependencies: %s)", include_dev)
    LOG.info("Java heap size: %s", java_heap_size)

    ret = {}

    env = {
        **os.environ,
        # Set the SRCCLR_API_TOKEN env var for the subprocess
        "SRCCLR_API_TOKEN": utils.get_secret(AGENT_SECRET_NAME, LOG)["agentAuthorization"],
        "JAVA_OPTS": f"-Xmx{java_heap_size}",  # Set the Java heap size
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


def process_sbom(graphs: list, libs: list) -> list:
    LOG.info("Processing SBOM")

    ret = []
    matched = set()
    for g in graphs:
        if g["filename"] is None or not g["directs"]:
            # Only process graphs that can be traced to a source and have dependencies
            continue

        graph = []
        for coord in g["directs"]:
            graph.append(process_dep(coord, libs, matched))

        if graph:
            ret.append(graph)

    ret.append(process_unmatched_libraries(libs, matched))

    return ret


def process_dep(dep: dict, libs: list, matched: set) -> dict:
    name = dep["coords"]["coordinate1"]
    if dep["coords"]["coordinate2"] is not None and dep["coords"]["coordinate1"] != dep["coords"]["coordinate2"]:
        name = f'{name}.{dep["coords"]["coordinate2"]}'

    ret = {
        "name": name,
        "version": dep["coords"]["version"],
        "licenses": lookup_licenses(
            dep["coords"]["coordinate1"], dep["coords"]["coordinate2"] or "", dep["coords"]["version"], libs
        ),
        "source": dep["filename"],
        "deps": [],
        "type": lookup_type(dep["coords"]["coordinate1"], dep["coords"]["coordinate2"] or "", libs),
    }

    matched.add((ret["name"], ret["version"]))

    for direct in dep["directs"]:
        ret["deps"].append(process_dep(direct, libs, matched))

    return ret


def lookup_licenses(coord1: str, coord2: str, version: str, libs: list) -> list:
    licenses = []

    for lib in libs:
        if lib["coordinate1"] == coord1 and lib["coordinate2"] == coord2:
            for v in lib["versions"]:
                if version != v["version"]:
                    continue

                for license in v["licenses"]:
                    licenses.append({"license_id": license["name"], "name": license["license"]})

    return licenses


def lookup_type(coord1: str, coord2: str, libs: list) -> str:
    for lib in libs:
        if lib["coordinate1"] == coord1 and lib["coordinate2"] == coord2:
            return lib["coordinateType"].lower()
    return None


def process_unmatched_libraries(libs: list, matched: set) -> list:
    """
    Process libraries that were founds but not matched within the dependency graph

    It is possible for srcclr to identify libraries but not their location within the dependency graph.
    This method goes through the list of libraries and includes any that were not already matched
    during dependency graph traversal. This ensures that at least all libraries identified are
    accounted for in the SBOM results.
    """
    ret = []
    for lib in libs:
        # Build the library name
        name = lib["coordinate1"]
        if lib["name"] == name.replace("_", "-"):  # Weird edge case. Python only?
            name = lib["name"]
        if lib["coordinate2"] and lib["coordinate1"] != lib["coordinate2"]:
            name = f'{name}.{lib["coordinate2"]}'

        # Loop through the versions
        for version in lib["versions"]:
            if (name, version["version"]) not in matched:
                # This library was in the list of libraries from srcclr but was not
                # able to be found within the dependency graph. It should still be included
                # in the results and we'll put it at the top level.
                ret.append(
                    {
                        "name": name,
                        "version": version["version"],
                        "licenses": [
                            # Don't need to lookup the libraries because they're right here
                            {"license_id": license["name"], "name": license["license"]}
                            for license in version["licenses"]
                        ],
                        # Use coordinate type  instead of a filename so it's marginally helpful in tracking it down
                        "source": lib["coordinateType"],
                        "deps": [],  # Obviously, otherwise it would be in the dependency graph
                        "type": lib["coordinateType"].lower() if lib["coordinateType"] != "MANUAL" else None,
                    }
                )
    return ret


if __name__ == "__main__":
    main()
