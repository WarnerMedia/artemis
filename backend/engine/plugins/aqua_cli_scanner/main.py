"""
aqua_cli_scanner plugin
"""
import json
import logging
import subprocess

from engine.plugins.lib import utils

# Boto3 client sends output to stdout/err by default.
# This causes issues downstream in the engine.
# This logging option suppresses that output.
logging.getLogger("boto3").propagate = False

log = utils.setup_logging("aqua_cli_scanner")


def build_output_json(setup_results, scan_results):
    """
    Create JSON string to be returned from the process.
    :todo: Parameterize pass/fail results based on findings
    :param setup_results: dictionary
    :param scan_results: dictionary
    :return: dictionary
    """
    if setup_results.get("build_dockerfiles", "").get("dockerfile_count", 0) < 1:
        return {"success": True, "details": []}

    return {
        "success": determine_scan_outcome(setup_results, scan_results["scans"]),
        "details": parse_scanner_results(setup_results, scan_results["scans"]),
        "errors": scan_results["errors"],
    }


def determine_scan_outcome(setup_results, scan_results):
    """
    Determine the output status boolean
    The build dockerfilelamba map function captures the 'status' boolean
    for each evaluates their collective value.
    :todo Parameterize to support pass a score threshold
    :param setup_results: dictionary of results from setup steps
    :param scan_results: dictionary of results from scan
    :return: boolean
    """

    return (
        setup_results["login_docker"]
        and all(list(map(lambda d: d["status"], setup_results["build_dockerfiles"]["results"])))
        and determine_vulnerability_threshold(scan_results, setup_results["score_threshold"])
    )


def determine_vulnerability_threshold(scan_results, max_score_threshold):
    """
    This function uses the vuln summary max_score to determine pass/fail
    max_score_threshold hard-coded to 7 for v1 of plugin
    The lamba map function creates a list of the max_score from each scan
    and then finds the max value.
    :todo parameterize to create thresholds
    :param scan_results: list of results
    :param max_score_threshold: integer value that represents ceiling value
    :return: boolean
    """
    if scan_results:
        # Aqua 4.6 does not include max_score in the output. Instead, use score_average. The plugin success is not
        # used in the overall scan success calculation so this may end up being deprecated altogether down the road.
        # Until then, using score_average fixes the plugin for the current version of Aqua.
        # NOTE: If aqua successfully finds no vulnerabilities, there will be no score_average.
        # The average_score of 0s is 0.
        if (
            max(list(map(lambda d: d["vulnerability_summary"].get("score_average", 0), scan_results)))
            < max_score_threshold
        ):
            return True

    return False


def exec_aqua_scanner(scanner_image, local_image, scanner_credentials):
    """
    Run the aqua scanner docker executable.
    :param scanner_image: string name of url of aqua scanner image
    :param local_image: string with identifier for image
    :param scanner_credentials: raw json string with credentials for aqua
    :return: dictionary : results of running scan
    """
    result = {"status": True, "response": {}, "error": None}
    log.info("Scanning %s", local_image)
    scan_output = subprocess.run(
        [
            "docker",
            "run",
            "--rm",
            "-v",
            "/var/run/docker.sock:/var/run/docker.sock",
            scanner_image,
            "scan",
            "--local",
            "--host",
            scanner_credentials["host"],
            "--user",
            scanner_credentials["user"],
            "--password",
            scanner_credentials["password"],
            local_image,
        ],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if scan_output.returncode != 0:
        error = scan_output.stderr.decode("utf-8")
        log.error(error)
        result["error"] = error
        result["status"] = False

    if scan_output.stdout:
        result["response"] = json.loads(scan_output.stdout.decode("utf-8").rstrip())
    return result


def parse_resources_list(dockerfile, resources):
    """
    Parse the resource array returned by Aqua
    Grab the package, CVE, severity, CVSS
    :param resources:
    :return: list
    """
    results = []
    for resource in resources:
        name = resource.get("resource", {}).get("name", "")
        version = resource.get("resource", {}).get("version", "")
        for vulnerability in resource.get("vulnerabilities", []):
            results.append(
                {
                    "component": f"{name}-{version}",
                    "source": dockerfile,
                    "id": vulnerability.get("name", ""),
                    "description": vulnerability.get("description", ""),
                    "severity": vulnerability.get("aqua_severity", ""),
                    "remediation": vulnerability.get("solution", ""),
                    "inventory": {
                        "component": {"name": name, "version": version},
                        "advisory_ids": list(
                            set(
                                filter(
                                    None,
                                    [
                                        vulnerability.get("name"),
                                        vulnerability.get("nvd_url"),
                                        vulnerability.get("vendor_url"),
                                    ],
                                )
                            )
                        ),
                    },
                }
            )
    return results


def parse_scanner_results(setup_results, scan_results):
    """
    Take the resulting array of scan results and grab the key details.
    package, CVE, severity, CVSS
    :param scan_results: array of image scans
    :return: dictionary
    """
    results = []
    for scan in scan_results:
        dockerfile = "Dockerfile"
        for setup in setup_results["build_dockerfiles"]["results"]:
            if f"{setup['tag-id']}:latest" == scan.get("image"):
                dockerfile = setup["dockerfile"]
        # It's possible for the scan to not have resources if the scan found no results.
        results += parse_resources_list(dockerfile, scan.get("resources", []))
    return results


def scan_local_images(scanner_image, image_list, scanner_credentials):
    """
    Iterate through the list of images and scan them.
    :param scanner_image: string that points to repo for aqua scanner
    :param image_list: dictionary with image build state and image ID
    :param scanner_credentials: dictionary with all of the credentials
    :return: dictionary
    """
    results = {"scans": [], "errors": []}
    for image in image_list:
        if image["status"]:
            result = exec_aqua_scanner(scanner_image, image["tag-id"], scanner_credentials)
            if result["response"]:
                results["scans"].append(result["response"])
            if not result["status"]:
                results["errors"].append(f'Aqua CLI Scanner failed to scan {image["dockerfile"]}: {result["error"]}')

    return results


def setup_requirements(args):
    """
    Execute all of the preliminary steps.
    :todo handle multiple docker logins for things not in quay
    :param args system arguments
    :return: dictionary: pass/fail of setup steps and arguments for scan
    """
    log.info("Setting up the scan")
    secrets_result = utils.get_secret_with_status(args.registry_url, log)
    secrets_dict = setup_secrets(args)
    aqua_image = f'{secrets_dict["aqua_credentials"]["registry"]}/{secrets_dict["aqua_credentials"]["image"]}'
    if not secrets_dict["status"]:
        return {
            "login_docker": False,
            "build_dockerfiles": {"results": []},
            "scanner_credentials": secrets_result,
            "score_threshold": args.score_threshold,
            "scanner_image": "",
        }

    ignore_prefixes = [aqua_image]  # Ignore the Aqua scanner image
    if args.engine_vars.get("ecr_url"):
        # Also ignore any images from ECR, if set
        ignore_prefixes.append(args.engine_vars.get("ecr_url"))
    login_results = utils.docker_login(
        log,
        secrets_dict["aqua_credentials"]["registry"],
        secrets_dict["registry_credentials"]["username"],
        secrets_dict["registry_credentials"]["password"],
        args.path,
    )

    return {
        "login_docker": login_results,
        "build_dockerfiles": args.images,
        "scanner_credentials": secrets_dict["aqua_credentials"],
        "score_threshold": args.score_threshold,
        "scanner_image": aqua_image,
    }


def setup_secrets(args):
    """
    Perform secrets retrieval and allow for local overrides
    :todo find a less shameless green way of managing overrides as collection
    :param args:
    :return:
    """
    registry_secrets_result = utils.get_secret_with_status("private_docker_repo_creds", log)
    aqua_secrets_result = utils.get_secret_with_status("aqua_cli_scanner", log)

    if registry_secrets_result["status"] and aqua_secrets_result["status"]:
        try:
            aqua_credentials = json.loads(aqua_secrets_result["response"])

            # aqua overrides
            if args.aqua_host:
                aqua_credentials["host"] = args.aqua_host
            if args.aqua_user:
                aqua_credentials["user"] = args.aqua_user
            if args.aqua_password:
                aqua_credentials["password"] = args.aqua_password
            if args.registry_url:
                aqua_credentials["registry"] = args.registry_url
            if args.aqua_img:
                aqua_credentials["image"] = args.aqua_image

            registry_credentials = {}
            docker_credentials = json.loads(registry_secrets_result["response"])
            for registry in docker_credentials:
                if registry["url"] == aqua_credentials["registry"]:
                    registry_credentials = registry

            # registry overrides
            if args.registry_username:
                registry_credentials["username"] = args.registry_username
            if args.registry_password:
                registry_credentials["password"] = args.registry_password

        except json.JSONDecodeError as e:
            print(e)
            return {"status": False, "response": {f"Invalid json: {e}"}}

        return {"status": True, "aqua_credentials": aqua_credentials, "registry_credentials": registry_credentials}

    # return False and empty dicts, since they won't be used anyways
    return {"status": False, "aqua_credentials": {}, "registry_credentials": {}}


def main():
    """
    Main plugin execution
    :todo Consider registering the base images that are found
    :todo to ensure continuous scanning
    """
    args = utils.parse_args(
        extra_args=[
            [["registry_url"], {"type": str, "nargs": "?", "default": ""}],
            [["aqua_img"], {"type": str, "nargs": "?", "default": ""}],
            [["score_threshold"], {"type": int, "nargs": "?", "default": 7}],
            [["--aqua-host"], {"type": str, "nargs": "?", "default": ""}],
            [["--aqua-user"], {"type": str, "nargs": "?", "default": ""}],
            [["--aqua-password"], {"type": str, "nargs": "?", "default": ""}],
            [["--registry-username"], {"type": str, "nargs": "?", "default": ""}],
            [["--registry-password"], {"type": str, "nargs": "?", "default": ""}],
        ]
    )

    setup_results = setup_requirements(args)
    scan_results = scan_local_images(
        setup_results["scanner_image"],
        setup_results["build_dockerfiles"]["results"],
        setup_results["scanner_credentials"],
    )

    print(json.dumps(build_output_json(setup_results, scan_results)))


if __name__ == "__main__":
    main()
