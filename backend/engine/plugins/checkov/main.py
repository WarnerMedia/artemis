"""
Checkov Plugin
"""
import json
import subprocess
import tempfile

from engine.plugins.lib import utils
from os.path import abspath
from pathlib import Path

LOG = utils.setup_logging("checkov")
CKV_SEVERITIES_FILE = Path(__file__).with_name("ckv_severities.json")


def main():
    """
    Run Checkov and print JSON Results
    """
    LOG.info("Executing Checkov")
    args = utils.parse_args()
    output = run_checkov(args.path)

    print(json.dumps(output))


def run_checkov(path: str) -> dict:
    """
    Run Checkov and return results in dictionary
    """
    path = abspath(path)
    temp_dir = tempfile.TemporaryDirectory()
    process = subprocess.run(
        [
            "checkov",
            "-d",
            path,
            "--download-external-modules",
            "False",
            "-o",
            "json",
            "--output-file-path",
            temp_dir.name,
        ],
        capture_output=True,
        check=False,
    )

    checkov_file = f"{temp_dir.name}/results_json.json"
    stderr = process.stderr.decode("utf-8")

    # Output defaults
    output = {}
    output["success"] = True
    output["truncated"] = False
    output["details"] = []
    output["errors"] = []

    error = False

    try:
        with open(checkov_file) as f:
            checkov_output = json.load(f)
    except json.decoder.JSONDecodeError:
        error = True
        error_description = "Checkov did not return a JSON response"
    except BaseException as e:
        error = True
        error_description = f"Unexpected error - {e}"

    temp_dir.cleanup()

    if error:
        output["success"] = False
        output["errors"] = ["An error has occurred. Contact CSO AppSec team for assistance."]
        LOG.error(f"error: {error_description}")
        LOG.error(f"stderr: {stderr}")

    if isinstance(checkov_output, dict):
        # Make output a list of dicts, as this is what is expected by the parsing function
        checkov_output = [checkov_output]

    # Checks were performed. Need to parse to figure out if any failed.
    LOG.info("Checks will be performed.")
    output["details"] = parse_checkov(checkov_output)

    return output


def parse_checkov(checkov_output) -> list:
    """
    Parse the output of Checkov
    """
    findings = []

    # Load severities map
    with open(CKV_SEVERITIES_FILE) as f:
        ckv_severities = json.load(f)

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
            # and provide the API key to checkov. For now, we can look up the severity in the CKV_SEVERITIES_FILE file.
            # Possible values are LOW, MEDIUM, HIGH, and CRITICAL.
            # If a CKV is known to exist, but was not assigned a severity, it may have a null value
            finding["severity"] = (ckv_severities.get(failed_check["check_id"], "low") or "low").lower()

            findings.append(finding)

    return findings


if __name__ == "__main__":
    main()
