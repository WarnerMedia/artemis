"""
trivy SCA plugin
"""

import json
import subprocess
from engine.plugins.lib.trivy_common.generate_locks import check_package_files
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

    # Generate Lock files (without installing npm packages)
    lock_file_errors, lock_file_alerts = check_package_files(args.path, include_dev, False)

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
    print(
        json.dumps(
            {"success": not bool(results), "details": results, "errors": lock_file_errors, "alerts": lock_file_alerts}
        )
    )


if __name__ == "__main__":
    main()
