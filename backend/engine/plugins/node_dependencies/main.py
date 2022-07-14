"""
node_dependencies plugin
"""
import json
import os
from glob import glob

from engine.plugins.lib import utils
from engine.plugins.lib.line_numbers.resolver import LineNumberResolver
from engine.plugins.node_dependencies.audit import npm_audit
from engine.plugins.node_dependencies.parse import parse_advisory
from engine.plugins.node_dependencies.write_npmrc import handle_npmrc_creation

log = utils.setup_logging("node_dependencies")


def check_package_files(path: str, include_dev: bool = False) -> tuple:
    """
    Main Function
    Find all of the package.json files in the repo and run 'npm audit' against them.
    Parses the results and returns them with the errors.
    """
    results = []
    errors = []
    alerts = []

    # Find and loop through all the package.json files in the path
    files = glob("%s/**/package.json" % path, recursive=True)

    log.info("Found %d package.json files", len(files))

    # Build a set of all directories containing package files
    paths = set()
    for filename in files:
        paths.add(os.path.dirname(filename))

    # Write a .npmrc file based on the set of package.json files found
    handle_npmrc_creation(paths)

    for sub_path in paths:
        absolute_package_file = f"{sub_path}/package.json"
        relative_package_file = absolute_package_file.replace(path, "")

        # Run npm audit against the package file
        audit = npm_audit(sub_path, include_dev, path)
        res = audit["results"]

        # Add warnings returned from audit for this path to the final results
        if "warning" in res:
            alerts.append(res["warning"])

        lockfile = _load_lockfile(audit["lockfile"])
        if not lockfile:
            log.error("Unable to load lockfile: %s", audit["lockfile"].replace(path, ""))
            continue

        # Initialize the line number resolver with the package file if the lockfile was generated or the lockfile
        # if it was included in the repository
        resolver = LineNumberResolver(absolute_package_file if audit["lockfile_missing"] else audit["lockfile"])

        for adv in _extract_advisories(res):
            results += parse_advisory(adv, relative_package_file, lockfile, resolver, path)

        if "error" in res:
            errors.append(f"{relative_package_file}: {res['error']['summary']}")

    # Return the results
    return results, errors, alerts


def _extract_advisories(audit: dict) -> list:
    advisories = []

    for adv in audit.get("vulnerabilities", {}):
        for via in audit["vulnerabilities"][adv]["via"]:
            if isinstance(via, dict):
                # If the via list contains a dict instead of all strings include the vulnerable component
                advisories.append(audit["vulnerabilities"][adv])
                break

    return advisories


def _load_lockfile(lockfile_path: str) -> dict:
    """
    Load the package-lock.json file into memory
    """
    lockfile = {}
    try:
        with open(lockfile_path) as fp:
            lockfile = json.load(fp)
    except FileNotFoundError:
        # Unable to load lockfile because it doesn't exist. Maybe it failed to generate for some reason.
        pass
    return lockfile


def main():
    """
    Main plugin execution
    """
    args = utils.parse_args()

    include_dev = args.engine_vars.get("include_dev", False)

    details, errors, alerts = check_package_files(args.path, include_dev)

    # Print the results to stdout
    print(json.dumps({"success": not (details or errors), "details": details, "errors": errors, "alerts": alerts}))


if __name__ == "__main__":
    main()
