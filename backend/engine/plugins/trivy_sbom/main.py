"""
trivy SBOM plugin
"""

import json
import subprocess
from typing import Optional
from engine.plugins.lib.trivy_common.generate_npm_locks import check_package_files
from engine.plugins.lib.sbom_common.go_installer import go_mod_download
from engine.plugins.trivy_sbom.parser import clean_output_application_sbom
from engine.plugins.trivy_sbom.parser import edit_application_sbom_path
from engine.plugins.lib.utils import convert_string_to_json
from engine.plugins.lib.utils import setup_logging
from engine.plugins.lib.utils import parse_args

logger = setup_logging("trivy_sbom")

NO_RESULTS_TEXT = "no supported file was detected"


# Scan the repo at an application level
def execute_trivy_application_sbom(path: str, include_dev: bool) -> Optional[str]:
    logger.info(f"Creating SBOM at an application level. Dev-dependencies: {include_dev}")
    args = ["trivy", "fs", path, "--format", "cyclonedx"]
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


# Scan the images
def execute_trivy_image_sbom(image: str) -> Optional[str]:
    proc = subprocess.run(["trivy", "image", image, "--format", "cyclonedx"], capture_output=True, check=False)
    if proc.returncode != 0:
        logger.warning(proc.stderr.decode("utf-8"))
        return None
    if proc.stdout:
        return proc.stdout.decode("utf-8")
    logger.error(proc.stderr.decode("utf-8"))
    return None


def process_docker_images(images: list) -> tuple[list, list]:
    """
    Pulls a list of image information, scans the successful ones, and returns the outputs.
    """
    outputs = []
    parsed = []
    for image in images:
        if not image.get("status"):
            continue
        try:
            output = convert_string_to_json(execute_trivy_image_sbom(image["tag-id"]), logger)
            if not output:
                logger.warning(
                    "Image from Dockerfile %s could not be scanned or the results could not be converted to JSON",
                    image["dockerfile"],
                )
            else:
                outputs.append(output)
                parsed.extend(clean_output_application_sbom(output))
        except Exception as e:
            logger.warning("Issue scanning image: %s", e)

    logger.info("Successfully scanned %d images", len(outputs))
    return outputs, parsed


def build_scan_parse_images(images: dict) -> tuple[list, list]:
    results = []
    parsed = []
    logger.info("Dockerfiles found: %d", images["dockerfile_count"])
    outputs, parsed_image = process_docker_images(images["results"])
    results.extend(outputs)
    parsed.extend(parsed_image)
    return results, parsed


def main():
    logger.info("Executing Trivy SBOM")
    args = parse_args()
    include_dev = args.engine_vars.get("include_dev", False)
    repo = args.engine_vars.get("repo")
    results = []
    parsed = []
    alerts = []
    errors = []

    # Generate Lock files (and install npm packages for license info)
    lock_file_errors, lock_file_alerts = check_package_files(args.path, include_dev, True)
    alerts.extend(lock_file_alerts)
    errors.extend(lock_file_errors)

    # Run Go Mod Download for license info
    go_mod_errors, go_mod_alerts = go_mod_download(args.path)
    alerts.extend(go_mod_alerts)
    errors.extend(go_mod_errors)

    # Scan local lock files
    sbom_result_raw = execute_trivy_application_sbom(args.path, include_dev)
    sbom_result = convert_string_to_json(sbom_result_raw, logger)

    if not sbom_result:
        logger.warning("Application SBOM output is None. Continuing.")
    else:
        application_sbom_output = edit_application_sbom_path(repo, sbom_result)
        application_sbom_output_parsed = clean_output_application_sbom(application_sbom_output)
        logger.debug(application_sbom_output)

        logger.info("Application Level SBOM generated. Success: %s", bool(application_sbom_output))
        results.append(application_sbom_output)
        parsed.extend(application_sbom_output_parsed)

    # Scan Images
    image_outputs, parsed_images = build_scan_parse_images(args.images)
    if not image_outputs:
        logger.warning("Images SBOM output is None. Continuing.")
    else:
        logger.info("Images SBOM generated. Success: %s", bool(image_outputs))
        results.extend(image_outputs)
        parsed.extend(parsed_images)

    # Return results
    result_parser = [results, parsed]
    print(json.dumps({"success": not bool(results), "details": result_parser, "errors": errors, "alerts": alerts}))


if __name__ == "__main__":
    main()
