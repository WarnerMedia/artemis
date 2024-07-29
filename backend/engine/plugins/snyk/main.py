"""
snyk plugin
"""

import json
import subprocess
from typing import Union

from engine.plugins.lib import utils
from engine.plugins.lib.cve import GITHUB_ADVISORY_URL_PREFIX, NPM_ADVISORY_URL_PREFIX, find_cves

logger = utils.setup_logging("snyk")

NO_RESULTS_TEXT = "Plugin found no supported files to scan"
SOURCE_KEY = "displayTargetFile"
CREDS_ERROR_MSG = "Unable to locate AWS credentials"
BOTO_ERROR_MSG = "Boto Client Error"
SECRET_ERROR_MSG = "Plugin was unable to retrieve authentication key"
REFERENCE_PRIORITY = ["Snyk Research Blog", "NPM Security Advisory", "GitHub Issue", "NVD", "Exploit"]
REFERENCE_LOW_PRIORITY = ["GitHub Commit"]

SNYK_ADVISORY_URL_PREFIX = "https://security.snyk.io/vuln/"


def set_snyk_auth(secret) -> dict:
    """
    The Snyk binary needs an API Key in order to run any commands.
    This function sets that auth key within the config.
    Snyk will then validate the key with Snyk servers during its command runs.
    returns: bool
    """
    proc = subprocess.run(["snyk", "config", "set", f"api={secret}"], capture_output=True, check=False)
    if proc.returncode != 0:
        logger.error(proc.stderr.decode("utf-8"))
        return {"status": False, "response": {proc.stderr.decode("utf-8").replace(secret, "xxxxxxxx")}}
    return {"status": True}


def execute_snyk_project_scan(path: str) -> dict:
    """
    Snyk exit codes:
    0: success, no vulns found
    1: action_needed, vulns found
    2: failure, try to re-run command
    3: failure, no supported projects detected
    :param path:
    :return:
    """
    proc = subprocess.run(["snyk", "test", "--all-projects", "-q", "--json", path], capture_output=True, check=False)
    if proc.returncode >= 2:
        logger.warning(proc.stderr.decode("utf-8"))
        return {"status": False, "response": proc.stderr.decode("utf-8")}
    if proc.stdout.decode("utf-8") == "null":
        no_response_message = "No response returned. No supported files to parse."
        logger.warning(no_response_message)
        return {"status": False, "response": no_response_message}
    if proc.stdout and NO_RESULTS_TEXT not in proc.stdout.decode("utf-8"):
        return {"status": True, "response": proc.stdout.decode("utf-8")}
    logger.error(proc.stderr.decode("utf-8"))
    return {"status": False, "response": proc.stderr.decode("utf-8")}


def execute_snyk_image_scan(image: str):
    """

    Snyk exit codes:
    0: success, no vulns found
    1: action_needed, vulns found
    2: failure, try to re-run command
    3: failure, no supported projects detected

    :param image:
    :return:
    """
    proc = subprocess.run(["snyk", "container", "test", "-q", "--json", image], capture_output=True, check=False)
    if proc.returncode >= 2:
        logger.warning(proc.stderr.decode("utf-8"))
        return None
    if proc.stdout:
        return proc.stdout.decode("utf-8")
    logger.error(proc.stderr.decode("utf-8"))
    return None


def process_docker_images(images: list) -> dict:
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
    errors = []
    for image in images:
        if not image.get("status"):
            continue
        try:
            result = execute_snyk_image_scan(image["tag-id"])
            if not result:
                error_msg = f'Image from Dockerfile {image["dockerfile"]} could not be scanned'
                logger.warning(error_msg)
                errors.append(error_msg)
                continue
            output = utils.convert_string_to_json(result, logger)
            if not output:
                error_msg = f'Image results from Dockerfile {image["dockerfile"]} could not be converted to JSON'
                logger.warning(error_msg)
                errors.append(error_msg)
            else:
                output[SOURCE_KEY] = image["dockerfile"]
                outputs.append(output)
        except Exception as e:
            error_msg = f'Issue scanning image {image["dockerfile"]}: {e}'
            logger.warning(error_msg)
            errors.append(error_msg)

    logger.info("Successfully scanned %d images", len(outputs))
    return {"results": outputs, "errors": errors}


def scan_and_parse_images(images) -> dict:
    result = []
    errors = []
    if "dockerfile_count" in images:
        logger.info("Dockerfiles found: %d", images.get("dockerfile_count", 0))
        outputs = process_docker_images(images.get("results", []))
        result = parse_output(outputs.get("results", []))
        errors = outputs.get("errors", [])

    return {"results": result, "errors": errors}


def parse_output(output: Union[list, dict]) -> list:
    """
    processes the snyk output based on the vulnerability specs
    Additional details that are available but not recorded:
    - other ids, such as CWE, if available
    - Functions noted with the vulnerability
    - Language
    :param output:
    :return:
    """
    vulns = []

    # Sometimes Snyk returns a dict and sometimes a list of dicts. I guess
    # it depends on the repo and if there are multiple target files scanned.
    # This handles both cases by converting the single dict into a list.
    responses = [output] if isinstance(output, dict) else output

    for response in responses:
        if "vulnerabilities" in response:
            vulns.extend(_process_vulnerabilities(response.get("vulnerabilities"), response.get(SOURCE_KEY)))

    return vulns


def _process_vulnerabilities(vulns: list, source: str) -> list:
    """Process the vulnerabilities.
    If a vuln pertains to a license, it is skipped.

    :param vulns:
    :param source:
    :return:
    """
    results = []
    vuln_set = set()

    for vuln in vulns:
        if vuln.get("type") == "license":
            continue
        vuln_ids = _get_vulnerability_ids(vuln.get("identifiers"))
        if not vuln_ids and vuln.get("id") is not None:
            logger.warning("Vulnerability ID could not be found in identifiers. Using Snyk ID instead")
            vuln_ids = [f"{SNYK_ADVISORY_URL_PREFIX}{vuln.get('id')}"]  # Use the Snyk advisory URL as the ID
        if not vuln_ids:
            # This should not be hit, as snyk ID should be available for all vulns.
            logger.warning("Vulnerability Snyk ID is not found. Using Reference Url instead")
            vuln_ids = [_get_reference_url(vuln.get("references"))]
        component = f'{vuln["name"]}-{vuln["version"]}'

        for vuln_id in vuln_ids:
            if f"{component}-{vuln_id}" in vuln_set:
                continue
            vuln_set.add(f"{component}-{vuln_id}")
            results.append(
                {
                    "source": source,
                    "description": _get_description(vuln["description"]),
                    "id": vuln_id,
                    "remediation": _get_remediation(vuln.get("fixedIn")),
                    "severity": vuln["severity"],
                    "component": component,
                    "inventory": {
                        "component": {"name": vuln["name"], "version": vuln["version"]},
                        "advisory_ids": vuln_ids,
                    },
                }
            )
    return results


def _get_remediation(remediation) -> str:
    """
    Creates string version of remediation.
    Typically, remediation is a list of versions numbers.
    This reformats them into a comma separated string.
    """
    if remediation is None:
        return ""
    if isinstance(remediation, list):
        return ",".join(remediation)
    return remediation


def _get_vulnerability_ids(vuln_ids: dict) -> list:
    """
    Checks vulnerability identifier list for the appropriate id.
    If none are found, None is returned.
    """
    ids = []
    if not vuln_ids:
        return ids
    if "CVE" in vuln_ids and vuln_ids["CVE"]:
        return vuln_ids["CVE"]
    elif "GHSA" in vuln_ids and vuln_ids["GHSA"]:
        for ghsa in vuln_ids["GHSA"]:
            ids += find_cves(f"{GITHUB_ADVISORY_URL_PREFIX}{ghsa}")
        return ids
    elif "NSP" in vuln_ids and vuln_ids["NSP"]:
        for nsp in vuln_ids["NSP"]:
            ids += find_cves(f"{NPM_ADVISORY_URL_PREFIX}{nsp}")
        return ids
    for vuln_id in vuln_ids:
        # ALTERNATIVE is just the snyk ID, which we do not want.
        # CWE is not a unique ID so don't use that, either.
        # OSVDB is defunct and so not meaningful
        if vuln_id in ("ALTERNATIVE", "CWE", "OSVDB"):
            continue
        if vuln_ids[vuln_id]:
            return sorted(vuln_ids[vuln_id])
    return ids


def _get_reference_url(vuln_references: list) -> str or None:
    """
    Checks list of references and returns priority url or cycles through all
    non-low priority references, returning the resulting url.
    """
    if not vuln_references:
        return None
    result = None
    for reference in vuln_references:
        if reference["title"] in REFERENCE_PRIORITY:
            return reference["url"]
        elif reference["title"] not in REFERENCE_LOW_PRIORITY:
            result = reference["url"]
        elif not result:
            result = reference["url"]

    return result


def _get_description(description: str) -> str:
    """
    The provided description can sometimes be extremely long.
    We need to parse out the important information.
    A ## in the description signifies a new section of the description.
    We currently only pull the Overview as some descriptions can be very long.
    :param description: string of the vuln's description
    :return: altered version of description string
    """
    if "##" not in description:
        logger.info("no ## in description")
        return description
    overview = description.split("##")[1]
    return overview.replace("Overview\n", "").strip()


def main():
    logger.info("Executing Snyk")
    args = utils.parse_args()
    auth_key = utils.get_secret("snyk-key", logger)
    if not auth_key:
        print(json.dumps({"success": False, "errors": ["Plugin was unable to retrieve Snyk Authentication Token"]}))
        return
    if not set_snyk_auth(auth_key["key"]):
        print(json.dumps({"success": False, "errors": ["There was an issue authenticating Snyk"]}))
        return

    results = []
    errors = []
    # Scan local project files
    response = execute_snyk_project_scan(args.path)
    if not response["status"]:
        logger.warning("Project scan output is None. Continuing.")
        errors.append(f'Project Scan Failed: {response["response"]}')
    else:
        output = utils.convert_string_to_json(response["response"], logger)
        result = parse_output(output)
        logger.info("Project scan output parsed. Success: %s", not bool(result))
        results.extend(result)

    # Scan Images
    image_outputs = scan_and_parse_images(args.images)
    results.extend(image_outputs["results"])
    errors.extend(image_outputs["errors"])

    # Return results
    print(json.dumps({"success": not bool(results), "details": results, "errors": errors}))


if __name__ == "__main__":
    main()
