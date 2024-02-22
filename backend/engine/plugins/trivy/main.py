"""
trivy image scanning plugin
"""
import json
import subprocess
from engine.plugins.lib.utils import convert_string_to_json
from engine.plugins.lib.trivy_common.parsing_util import parse_output
from engine.plugins.lib.utils import setup_logging
from engine.plugins.lib.utils import parse_args

logger = setup_logging("trivy")


def execute_trivy_image_scan(image: str):
    proc = subprocess.run(["trivy", "image", image, "--format", "json"], capture_output=True, check=False)
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
        {
      "status": false,
      "tag-id": "test-docker-c215e6263cd447a763e30d5f26852516-t-1000",
      "dockerfile": "/Dockerfiles"
        }
    """
    outputs = []
    for image in images:
        if not image.get("status"):
            continue
        try:
            result = execute_trivy_image_scan(image["tag-id"])
            output = convert_string_to_json(result, logger)
            if not output:
                logger.warning(
                    "Image from Dockerfile %s could not be scanned or the results could not be converted to JSON",
                    image["dockerfile"],
                )
            else:
                """
                The tag-id is placed at the Target. The tag-id is auto-generated and is of no use to the end user.
                Placing the dockerfile location allows the user to better identify the location of the vulns
                """
                items = []
                for item in output["Results"]:
                    if image["tag-id"] in item["Target"]:
                        item["Target"] = image["dockerfile"]
                    else:
                        item["Target"] = f"{image['dockerfile']} > {item['Target']}"
                    items.append(item)
                outputs.append(items)
        except Exception as e:
            logger.warning("Issue scanning image: %s", e)

    logger.info("Successfully scanned %d images", len(outputs))
    return outputs


def build_scan_parse_images(images) -> list:
    results = []
    logger.info("Dockerfiles found: %d", images["dockerfile_count"])
    outputs = process_docker_images(images["results"])
    for image_output in outputs:
        output = parse_output(image_output)
        if output:
            results.extend(output)
    return results


def main():
    logger.info("Executing Trivy")
    args = parse_args()
    results = []

    # Scan Images
    image_outputs = build_scan_parse_images(args.images)
    results.extend(image_outputs)

    # Return results
    print(json.dumps({"success": not bool(results), "details": results}))


if __name__ == "__main__":
    main()
