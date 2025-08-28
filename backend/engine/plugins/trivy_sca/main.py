"""
trivy SCA plugin
"""

from os.path import abspath

import json
import subprocess
from engine.plugins.lib.trivy_common.generate_locks import check_package_files
from engine.plugins.lib.trivy_common.generate_composer_locks import check_composer_package_files
from engine.plugins.lib.utils import convert_string_to_json
from engine.plugins.lib.trivy_common.parsing_util import parse_output
from engine.plugins.lib.utils import setup_logging
from engine.plugins.lib.utils import parse_args

logger = setup_logging("trivy_sca")

NO_RESULTS_TEXT = "no supported file was detected"


def execute_trivy_lock_scan(path: str, include_dev: bool):
    logger.info(f"Scanning lock-files. Dev-dependencies: {include_dev}")
    args = ["trivy", "fs", path, "--format", "json"]
    if include_dev:
        args.append("--include-dev-deps")
    proc = subprocess.run(args, capture_output=True, check=False)
    if proc.returncode != 0:
        logger.warning(proc.stderr.decode("utf-8"))
        return None
    if proc.stdout.decode("utf-8") == "null":
        logger.warning("No response returned. No files to parse.")
        return None
    if proc.stdout and NO_RESULTS_TEXT not in proc.stdout.decode("utf-8"):
        return proc.stdout.decode("utf-8")
    logger.error(proc.stderr.decode("utf-8"))
    return None


def main():
    logger.info("Executing Trivy SCA")
    args = parse_args()
    include_dev = args.engine_vars.get("include_dev", False)
    results = []
    alerts = []
    errors = []

    # Generate Lock files (and install npm packages for license info)
    lock_file_errors, lock_file_alerts = check_package_files(args.path, include_dev, True)
    alerts.extend(lock_file_alerts)
    errors.extend(lock_file_errors)

    # Run Composer Install for exact version numbers
    (working_src, working_mount) = str(args.engine_vars.get("working_mount", "")).split(":")
    if not working_src or not working_mount:
        errors.append("Working volume not provided")

    compose_lock_errors, compose_lock_alerts = check_composer_package_files(working_src, include_dev)
    alerts.extend(compose_lock_alerts)
    errors.extend(compose_lock_errors)

    # Scan local lock files
    output = execute_trivy_lock_scan(args.path, include_dev)
    logger.debug(output)
    output = convert_string_to_json(output, logger)
    if not output:
        logger.warning("Lock file output is None. Continuing.")
    else:
        result = parse_output(output.get("Results"))
        logger.info("Lock file output parsed. Success: %s", bool(result))
        results.extend(result)

    # Return results
    print(json.dumps({"success": not bool(results), "details": results, "errors": errors, "alerts": alerts}))


if __name__ == "__main__":
    main()
