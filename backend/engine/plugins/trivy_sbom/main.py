"""
trivy SBOM plugin
"""
import json
import subprocess
from engine.plugins.lib import utils
from engine.plugins.lib.trivy_common.generate_locks import check_package_files
from engine.plugins.trivy_sbom.parser import parse_output

logger = utils.setup_logging("trivy_sbom")

NO_RESULTS_TEXT = "no supported file was detected"


def execute_trivy_application_sbom(path: str, include_dev: bool):
    logger.info(f"Creating SBOM at an application level. Dev-dependencies: {include_dev}")
    args = ["trivy", "fs", path, "--format", "cyclonedx"]
    if include_dev:
        args.append("--include-dev-deps")
    proc = subprocess.run(args, capture_output=True, check=False)
    print(proc)
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

def execute_trivy_image_sbom(image: str):
    proc = subprocess.run(["trivy", "image", image, "--format", "cyclonedx"], capture_output=True, check=False)
    print(proc)
    if proc.returncode != 0:
        logger.warning(proc.stderr.decode("utf-8"))
        return None
    if proc.stdout:
        return proc.stdout.decode("utf-8")
    logger.error(proc.stderr.decode("utf-8"))
    return None

def process_docker_images(images: list):
    """
    Pulls a list of image information, scans the successful ones, and returns the outputs.
    example list item:
    """
    outputs = []
    for image in images:
        if not image.get("status"):
            continue
        try:
            output = execute_trivy_image_sbom(image["tag-id"])
            output = parse_output(output)
            if not output:
                logger.warning(
                    "Image from Dockerfile %s could not be scanned or the results converted to JSON",
                    image["dockerfile"],
                )
            else:
                outputs.append(output)
        except Exception as e:
            logger.warning("Issue scanning image: %s", e)

    logger.info("Successfully scanned %d images", len(outputs))
    return outputs


def build_scan_parse_images(images) -> list:
    results = []
    logger.info("Dockerfiles found: %d", images["dockerfile_count"])
    outputs = process_docker_images(images["results"])
    results.extend(outputs)
    return results


def main():
    logger.info("Executing Trivy SBOM")
    args = utils.parse_args()
    include_dev = args.engine_vars.get("include_dev", False)
    results = []

    # Generate Lock files
    lock_file_errors, lock_file_alerts = check_package_files(args.path, include_dev, True)
    # Todo: add function to run npm install to get license info
    # Scan local lock files
    application_sbom_output = execute_trivy_application_sbom(args.path, include_dev)
    application_sbom_output = parse_output(application_sbom_output)
    logger.debug(application_sbom_output)
    if not application_sbom_output:
        logger.warning("Application SBOM output is None. Continuing.")
    else:
        logger.info("Application Level SBOM generated. Success: %s", bool(application_sbom_output))
        results.extend(application_sbom_output)

    # Scan Images
    image_outputs = build_scan_parse_images(args.images)
    if not image_outputs:
        logger.warning("Images SBOM output is None. Continuing.")
    else:
        logger.info("Images SBOM generated. Success: %s", bool(image_outputs))
        results.extend(image_outputs)
    # Return results
    print(
        json.dumps(
            {"success": not bool(results), "details": results, "errors": lock_file_errors, "alerts": lock_file_alerts}
        )
    )


if __name__ == "__main__":
    main()
