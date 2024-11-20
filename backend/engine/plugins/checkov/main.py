"""
Checkov Plugin
"""

import docker
import json
import shutil
import subprocess
from typing import TypedDict
from os.path import abspath
from pathlib import Path

from engine.plugins.lib import utils

LOG = utils.setup_logging("checkov")
PLUGIN_DIR = Path(__file__).parent.absolute()

CHECKOV_IMG_REF = "bridgecrew/checkov:3.2.301"

docker_client = docker.from_env()


class Results(TypedDict):
    success: bool
    truncated: bool
    details: list[dict]
    errors: list[str]


def main():
    """
    Run Checkov and print JSON Results
    """
    LOG.info("Executing Checkov")
    args = utils.parse_args()
    path = abspath(args.path)

    (temp_vol_name, temp_vol_mount) = str(args.engine_vars.get("temp_vol_name", "")).split(":")
    if not temp_vol_name or not temp_vol_mount:
        output: Results = {
            "success": False,
            "truncated": False,
            "errors": ["Temporary volume not provided"],
            "details": [],
        }
    else:
        output = run_checkov(path, temp_vol_name, temp_vol_mount, args.config)

    print(json.dumps(output))


def run_checkov(path: str, temp_vol_name: str, temp_vol_mount: str, config: dict = {}) -> Results:
    """
    Run Checkov and return results
    """
    # Output defaults
    output: Results = {
        "success": True,
        "truncated": False,
        "details": [],
        "errors": [],
    }

    checkov_command = ["-d", "/tmp/base/work"]

    # Don't return nonzero exit code if findings are detected.
    checkov_command += ["--soft-fail"]

    config_dir, config_error = get_config_dir(path, config)

    # Return unsuccessful if error is encountered getting config directory
    if config_error:
        output["success"] = False
        output["errors"] = [config_error]
        return output

    external_checks_dir = config.get("external_checks_dir")
    if external_checks_dir:
        external_checks_dir = (Path(config_dir) / Path(external_checks_dir)).absolute()
        checkov_command += ["--run-all-external-checks", "--external-checks-dir", external_checks_dir]

    checkov_command += ["--download-external-modules", "False", "-o", "json", "--output-file-path", "/tmp/base/output"]

    # Copy the source tree into the named volume to provide to the container.
    srcdir = f"{temp_vol_mount}/work"
    LOG.info(f"Cloning working tree: {path} -> {srcdir}")
    shutil.copytree(path, srcdir)

    LOG.info(f"Starting Checkov in container, path: {path}")

    stderr = docker_client.containers.run(
        CHECKOV_IMG_REF,
        command=checkov_command,
        remove=True,
        stdout=True,
        stderr=True,
        volumes={
            # path: {"bind": path, "mode": "ro"},
            temp_vol_name: {"bind": "/tmp/base", "mode": "rw"},
        },
    ).decode("utf-8")

    checkov_file = f"{temp_vol_mount}/output/results_json.json"

    error = ""
    try:
        with open(checkov_file) as f:
            checkov_output = json.load(f)
    except json.decoder.JSONDecodeError:
        error = "Checkov did not return a JSON response"
    except BaseException as e:
        error = f"Unexpected error - {e}"

    if error:
        output["success"] = False
        output["errors"].append("An unknown error has occurred. Contact Artemis support for assistance.")
        LOG.error(f"error: {error}")
        LOG.error(f"stderr: {stderr}")
        return output

    if isinstance(checkov_output, dict):
        # Make output a list of dicts, as this is what is expected by the parsing function
        checkov_output = [checkov_output]

    # Checks were performed. Need to parse to figure out if any failed.
    LOG.info("Checks will be performed.")
    output["details"], parse_error = parse_checkov(checkov_output, path, config_dir, config)

    # If error occurred parsing Checkov output, return error
    if parse_error:
        output["success"] = False
        output["errors"] = [parse_error]
        return output

    return output


def parse_checkov(checkov_output: list[dict], repo_path: str, config_dir: str, config: dict) -> tuple[list, str]:
    """
    Parse the output of Checkov
    """
    findings = []
    error = None

    # Load severities map
    ckv_severities, severities_error = get_ckv_severities(config_dir, config)

    if severities_error:
        return ([], severities_error)

    for check in checkov_output:
        if not check.get("results"):
            continue

        if not check["results"].get("failed_checks"):
            continue

        for failed_check in check["results"]["failed_checks"]:
            finding = {}
            finding["type"] = check["check_type"]
            finding["filename"] = failed_check["file_path"].strip("/")
            finding["line"] = failed_check["file_line_range"][0]
            finding["message"] = f'{failed_check["check_id"]} - {failed_check["check_name"]}'

            # Not all findings have a vulnerability guideline URL
            if failed_check.get("guideline"):
                finding["message"] += f' - {failed_check["guideline"]}'

            # If we want up-to-date severities, we need to subscribe to a bridgecrew.io plan
            # and provide the API key to checkov. For now, we can look up the severity in the "ckv_severities_file" file.
            # Possible values are LOW, MEDIUM, HIGH, and CRITICAL.
            # If a CKV is known to exist, but was not assigned a severity, it may have a null value
            finding["severity"] = (ckv_severities.get(failed_check["check_id"], "low") or "low").lower()

            findings.append(finding)

    return (findings, error)


def get_config_dir(repo_path: str, config: dict) -> tuple[str, str]:
    """
    Determine if config directory should be from S3 or default (local)
    """
    # If an s3_config_path exists, download config from S3
    s3_config_path = config.get("s3_config_path")
    config_dir = PLUGIN_DIR
    error = None

    if s3_config_path:
        config_dir = PLUGIN_DIR / "custom_config"

        # boto3 has no recursive download option, but awscli does
        output = subprocess.run(
            ["aws", "s3", "cp", f"s3://{s3_config_path}", config_dir, "--recursive"], capture_output=True
        )

        stdout = output.stdout.decode("utf-8")
        stderr = output.stderr.decode("utf-8")

        # If we cannot get config from S3, log and return error
        if output.returncode != 0:
            error = "Could not download config from S3, aborting Checkov scan."
            LOG.error(f"error: {error}")
            LOG.error(f"stdout: {stdout}")
            LOG.error(f"stderr: {stderr}")

    return (config_dir, error)


def get_ckv_severities(config_dir: str, config: dict) -> tuple[dict, str]:
    """
    Read Checkov severities from JSON file, and return them as dict
    """
    error = None
    ckv_severities = {}
    severities_file = config.get("severities_file")

    if severities_file:
        severities_file_path = Path(config_dir) / Path(severities_file)
    else:
        severities_file_path = PLUGIN_DIR / "ckv_severities.json"

    try:
        with open(severities_file_path) as f:
            ckv_severities = json.load(f)
    except json.decoder.JSONDecodeError:
        error = "Severities file is not valid JSON. Aborting Checkov scan."
    except BaseException as e:
        error = "Could not read the severities file. Aborting Checkov scan."

    if error:
        LOG.error(f"error: {error}")

    return (ckv_severities, error)


if __name__ == "__main__":
    main()
