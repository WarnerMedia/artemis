"""
node_dependencies plugin
"""

import json
import os

from engine.plugins.lib import utils
from engine.plugins.lib.line_numbers.resolver import LineNumberResolver
from engine.plugins.lib.node_common import DirLockfileMap, build_npm_context
from engine.plugins.node_dependencies.audit import npm_audit
from engine.plugins.node_dependencies.parse import parse_advisory
from engine.plugins.lib.write_npmrc import handle_npmrc_creation

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

    ctx = build_npm_context(path)
    alerts.extend(ctx.alerts)

    # Collect directories to audit: workspace roots & standalone directories
    audit_dirs: DirLockfileMap = {
        **ctx.workspace_roots,
        **ctx.standalone_dirs,
    }

    if not audit_dirs:
        log.info("No package.json directories to audit")
        return results, errors, alerts

    handle_npmrc_creation(log, set(audit_dirs) | ctx.workspace_members)

    for sub_path, lockfile_type in audit_dirs.items():
        absolute_package_file = os.path.join(sub_path, "package.json")
        relative_package_file = absolute_package_file.replace(path, "")

        # Skip non-npm ecosystems: npm audit requires package-lock.json
        has_package_lock = os.path.isfile(os.path.join(sub_path, "package-lock.json"))
        if lockfile_type in ("yarn", "pnpm", "bun") and not has_package_lock:
            msg = f"Skipping {relative_package_file}: project uses {lockfile_type}"
            log.info(msg)
            alerts.append(msg)
            continue

        # Skip lockfile generation when the registry is unreachable
        if not has_package_lock and not ctx.registry_reachable:
            log.info("Skipping %s: registry unreachable, cannot generate lockfile", relative_package_file)
            continue

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
    except json.decoder.JSONDecodeError:
        log.error("Unable to parse lockfile: %s", lockfile_path)
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
