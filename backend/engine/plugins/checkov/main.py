"""
Checkov Plugin
"""

import boto3
import docker
import docker.errors
import json
import os
import shutil
import signal
import sys
from typing import Optional, TypedDict, Union
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

    errors: list[str] = []

    (temp_vol_name, temp_vol_mount) = str(args.engine_vars.get("temp_vol_name", "")).split(":")
    if not temp_vol_name or not temp_vol_mount:
        errors.append("Temporary volume not provided")

    (working_src, working_mount) = str(args.engine_vars.get("working_mount", "")).split(":")
    if not working_src or not working_mount:
        errors.append("Working volume not provided")

    if errors:
        output: Results = {
            "success": False,
            "truncated": False,
            "errors": errors,
            "details": [],
        }
    else:
        # Generate a unique container name so we can reference it in the signal
        # handler.  We assume the temporary volume name is unique, so we can
        # use that as a base.
        # This allows us to install the signal handler early so there's no
        # potential gap between when the container is started and the signal
        # handler is installed.
        container_name = f"plugin-{temp_vol_name}"
        install_shutdown_handler(container_name)

        output = run_checkov(
            path,
            container_name,
            temp_vol_name,
            temp_vol_mount,
            working_src,
            working_mount,
            args.config,
        )

    print(json.dumps(output))


def install_shutdown_handler(container_name: str):
    """
    Installs the signal handlers to gracefully exit.
    """

    def handle_shutdown(*_):
        try:
            LOG.info(f"Stopping container: {container_name}")
            docker_client.containers.get(container_name).stop()
        except docker.errors.NotFound:
            pass
        except Exception as ex:
            LOG.warning("Container cleanup failed", exc_info=ex)
        sys.exit(1)

    for sig in [signal.SIGTERM, signal.SIGINT, signal.SIGHUP, signal.SIGQUIT]:
        signal.signal(sig, handle_shutdown)


def run_checkov(
    path: str,
    container_name: str,
    temp_vol_name: str,
    temp_vol_mount: str,
    working_src: str,
    working_mount: str,
    config: dict = {},
) -> Results:
    """
    Run Checkov and return results.
    """
    # Output defaults
    output: Results = {
        "success": True,
        "truncated": False,
        "details": [],
        "errors": [],
    }

    # Don't return nonzero exit code if findings are detected.
    checkov_command = ["--soft-fail"]

    config_dir = Path(temp_vol_mount) / "config"
    try:
        (checks_dir, sev_dir) = init_config_dir(config, config_dir)
        checkov_command += ["--run-all-external-checks", "--external-checks-dir", f"/tmp/base/config/{checks_dir}"]
        sev_path = config_dir / sev_dir
    except Exception as e:
        output["success"] = False
        output["errors"] = [f"Failed to load configuration: {str(e)}"]
        LOG.error(output["errors"], exc_info=e)
        return output

    # Do not scan third-party Terraform modules, as the findings are likely
    # not actionable by the user.
    checkov_command += ["--download-external-modules", "False"]

    # Write the output to the temporary volume so we don't need to disambiguate
    # it from other output, since the container will return stdout and stderr
    # mixed together.
    os.mkdir(f"{temp_vol_mount}/output")
    checkov_command += ["-o", "json", "--output-file-path", "/tmp/base/output"]

    # We mount the source tree directly to avoid copying.
    checkov_command += ["-d", path]

    LOG.info(f"Starting {CHECKOV_IMG_REF} in container, path: {path}")

    stderr = docker_client.containers.run(
        CHECKOV_IMG_REF,
        name=container_name,
        command=checkov_command,
        auto_remove=True,
        stdout=True,
        stderr=True,
        volumes={
            temp_vol_name: {"bind": "/tmp/base", "mode": "rw"},
            working_src: {"bind": working_mount, "mode": "ro"},
        },
    ).decode("utf-8")

    checkov_file = f"{temp_vol_mount}/output/results_json.json"

    error = ""
    checkov_output: Union[list[dict], dict] = []
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
    output["details"], parse_error = parse_checkov(checkov_output, sev_path)

    # If error occurred parsing Checkov output, return error
    if parse_error:
        output["success"] = False
        output["errors"] = [parse_error]
        return output

    return output


def parse_checkov(checkov_output: list[dict], sev_path: Path) -> tuple[list[dict], Optional[str]]:
    """
    Parse the output of Checkov
    """
    findings: list[dict] = []
    error = None

    # Load severities map
    ckv_severities, severities_error = get_ckv_severities(sev_path)

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


def init_config_dir(config: dict, dest: Path) -> tuple[Path, Path]:
    """
    Populates the config directory.

    If a custom config is specified, then it will be downloaded from S3.

    Returns:
    - The relative path to the external checks dir.
    - The relative path to the severities file.
    """
    # Note: This aims to preserve the original intent of the
    #       s3_config_path (and related) plugin config options.

    # The config directory will look like:
    # - ckv_severities.json  <-- Will always be present.
    # - checks/              <-- Will always be present.
    #   - files...           <-- Optional, downloaded from S3 bucket.

    dest.mkdir(exist_ok=True)

    # Install the bundled severities file as the default.
    rel_sev_dir = Path("ckv_severities.json")
    sev_path = dest / rel_sev_dir
    shutil.copyfile(PLUGIN_DIR / "ckv_severities.json", sev_path)

    rel_checks_dir = Path("checks")
    checks_dir = dest / rel_checks_dir
    checks_dir.mkdir(exist_ok=True)
    if s3_config_path := str(config.get("s3_config_path", "")):
        # Download the config from S3.
        # Config path is expected to be "bucket" or "bucket/prefix"
        (bucket_name, *base) = s3_config_path.split("/", 2)
        prefix = base[0] if base else ""

        checks_prefix = prefix
        if external_checks_dir := config.get("external_checks_dir"):
            checks_prefix = f"{prefix}/{external_checks_dir}"

        # This is not recursive, since Checkov will not look for files in
        # subdirectories.
        LOG.info(f"Downloading config from S3: s3://{bucket_name}/{checks_prefix}")
        s3_client = boto3.resource("s3")
        bucket = s3_client.Bucket(bucket_name)
        for obj in bucket.objects.filter(Prefix=checks_prefix):
            rel_key = obj.key[len(checks_prefix) + 1 :]
            if "/" not in rel_key:
                dest_file = str(checks_dir / rel_key)
                LOG.info(f"Downloading: {obj.key} -> {dest_file}")
                bucket.download_file(obj.key, dest_file)

        # Install the custom severities file from S3, if specified.
        # This path is relative to the base s3_config_path.
        if s3_sev_file := str(config.get("severities_file", "")):
            key = f"{prefix}/{s3_sev_file}"
            LOG.info(f"Downloading severities file: {key} -> {sev_path}")
            bucket.download_file(key, str(sev_path))

    return (rel_checks_dir, rel_sev_dir)


def get_ckv_severities(sev_path: Path) -> tuple[dict, Optional[str]]:
    """
    Read Checkov severities from JSON file, and return them as dict
    """
    error = None
    ckv_severities = {}

    try:
        with open(sev_path) as f:
            ckv_severities = json.load(f)
    except json.decoder.JSONDecodeError:
        error = "Severities file is not valid JSON. Aborting Checkov scan."
    except Exception as e:
        error = f"Could not read the severities file: {e}"

    if error:
        LOG.error(f"error: {error}")

    return (ckv_severities, error)


if __name__ == "__main__":
    main()
