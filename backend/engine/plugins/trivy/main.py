"""
trivy plugin
"""
import json
import subprocess
from typing import NamedTuple
import os
from glob import glob
from engine.plugins.lib import utils
from engine.plugins.node_dependencies.write_npmrc import handle_npmrc_creation

logger = utils.setup_logging("trivy")

DESC_REMEDIATION_SPLIT = "## Recommendation"
NO_RESULTS_TEXT = "no supported file was detected"
JSON_FILE = "trivy.json"

def install_package_files(include_dev, path, root_path):
    # Create a package-lock.json file if it doesn't already exist
    logger.info(f'Generating package-lock.json for {path.replace(root_path, "")} (including dev dependencies: {include_dev})')
    cmd = [
        "npm",
        "install",
        "--package-lock-only",  # Generate the needed lockfile
        "--legacy-bundling",  # Don't dedup dependencies so that we can correctly trace their root in package.json
        "--legacy-peer-deps",  # Ignore peer dependencies, which is the NPM 6.x behavior
        "--no-audit",  # Don't run an audit
    ]
    if not include_dev:
        cmd.append("--only=prod")
    return subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, cwd=path, check=False)

def check_package_files(path: str, include_dev: bool) -> tuple:
    """
    Main Function
    Find all of the package.json files in the repo and run 'npm audit' against them.
    Parses the results and returns them with the errors.
    """

    # Find and loop through all the package.json files in the path
    files = glob("%s/**/package.json" % path, recursive=True)

    logger.info("Found %d package.json files", len(files))

    # Build a set of all directories containing package files
    paths = set()
    for filename in files:
        paths.add(os.path.dirname(filename))

    # Write a .npmrc file based on the set of package.json files found
    handle_npmrc_creation(paths)

    for sub_path in paths:
        results_dct = {}
        lockfile = os.path.join(sub_path, "package-lock.json")
        lockfile_missing = not os.path.exists(lockfile)
        if lockfile_missing:
            msg = (
                f"No package-lock.json file was found in path {sub_path.replace(path, '')}. "
                "Please consider creating a package-lock file for this project."
            )
            results_dct["warning"] = msg
            r = install_package_files(include_dev, sub_path, path)
            if r.returncode != 0:
                logger.error(r.stderr.decode("utf-8"))
                return {"results": results_dct, "lockfile": lockfile, "lockfile_missing": lockfile_missing}
    # Return the results
    return results_dct

def parse_output(output: list) -> list:
    results = []
    for item in output:
        source = item["Target"]
        component_type = convert_type(item.get('Type', 'N/A'))
        if item.get("Vulnerabilities") is None:
            continue
        cve_set = set()
        for vuln in item["Vulnerabilities"]:
            vuln_id = vuln.get("VulnerabilityID")
            if vuln_id in cve_set:
                continue
            cve_set.add(vuln_id)
            description_result = get_description_and_remediation(vuln.get("Description"), vuln.get("FixedVersion"))

            component = vuln.get("PkgName")
            if vuln.get("InstalledVersion"):
                component = f'{component}-{vuln.get("InstalledVersion")}'
            results.append(
                {
                    "component": component,
                    "source": source,
                    "id": vuln_id,
                    "description": description_result.description,
                    "severity": vuln.get("Severity", "").lower(),
                    "remediation": description_result.remediation,
                    "inventory": {
                        "component": {
                            "name": vuln.get("PkgName"),
                            "version": vuln.get("InstalledVersion"),
                            "type": component_type,
                        },
                        "advisory_ids": sorted(
                            list(set(filter(None, [vuln_id, vuln.get("PrimaryURL")] + vuln.get("References", []))))
                        ),
                    },
                }
            )
    return results


def convert_type(component_type: str) -> str:
    if component_type == "bundler":
        return "gem"
    return component_type.lower()


def get_description_and_remediation(description, fixed_version) -> NamedTuple:
    """
    gets the description and remediation fields after pulling them from the vuln and appending/removing additional info
    :param fixed_version:
    :param description:
    :return: NamedTuple containing the description and remediation
    """
    result = NamedTuple("DescriptionResult", [("description", str), ("remediation", str)])
    if not description:
        description = ""
    remediation = ""
    if DESC_REMEDIATION_SPLIT in description:
        des_split = description.split(DESC_REMEDIATION_SPLIT)
        remediation = des_split[1].strip()
        description = des_split[0].strip()
    if fixed_version:
        remediation = f"Fixed Version: {fixed_version}. {remediation}".strip()
    result.description = description
    result.remediation = remediation
    return result


def convert_output(output_str: str):
    if not output_str:
        return None
    try:
        return json.loads(output_str)
    except json.JSONDecodeError as e:
        logger.error(e)
        return None


def execute_trivy_lock_scan(path: str, include_dev: bool):
    # passing in "include dev" tag if include_dev arg is True
    logger.info(f'Scanning lock-files. Dev-dependencies: {include_dev}')
    if include_dev:
        proc = subprocess.run(["trivy", "fs", "--offline-scan",  "--include-dev-deps", path, "--format", "json"], capture_output=True, check=False)
    else:
        proc = subprocess.run(["trivy", "fs", "--offline-scan", path, "--format", "json"], capture_output=True, check=False)
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


def execute_trivy_image_scan(image: str):
    proc = subprocess.run(["trivy", "image", "--offline-scan", image, "--format", "json"], capture_output=True, check=False)
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
            output = convert_output(result)
            if not output:
                logger.warning(
                    "Image from Dockerfile %s could not be scanned or the results converted to JSON",
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
    args = utils.parse_args()
    include_dev = args.engine_vars.get("include_dev", False)
    results = []

    # Generate Lock files
    check_package_files(args.path, include_dev)

    # Scan local lock files
    output = execute_trivy_lock_scan(args.path, include_dev)
    logger.debug(output)
    output = convert_output(output)
    if not output:
        logger.warning("Lock file output is None. Continuing.")
    else:
        result = parse_output(output["Results"])
        logger.info("Lock file output parsed. Success: %s", bool(result))
        results.extend(result)

    # Scan Images
    image_outputs = build_scan_parse_images(args.images)
    results.extend(image_outputs)

    # Return results
    print(json.dumps({"success": not bool(results), "details": results}))


if __name__ == "__main__":
    main()