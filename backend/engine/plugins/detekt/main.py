"""
detekt plugin
"""

import json
import os
import subprocess
import xml.etree.ElementTree as ET

from engine.plugins.lib import utils
from tempfile import mkstemp

logger = utils.setup_logging("detekt")

SELF_DIR = os.path.dirname(os.path.abspath(__file__))
DETEKT_CONFIG = f"{SELF_DIR}/detekt.yaml"


def main():
    """
    Run detekt and print the json formatted results
    """
    args = utils.parse_args()
    output = run_detekt(args.path)
    print(json.dumps(output))


def run_detekt(path=None):
    """
    Run detekt, parse the results, and return them
    """
    logger.info("Executing detekt")

    if not path:
        args = utils.parse_args()
        path = args.path

    # Ensure the path is absoulute
    path = os.path.abspath(path)

    # Generate a tempfile for the report
    fd, detekt_report = mkstemp()
    os.close(fd)

    # Run detekt, and save results to XML report
    result = _run_detekt_command(DETEKT_CONFIG, path, detekt_report)

    # Capture detekt command output
    stderr = result.stderr.decode("utf-8")
    stdout = result.stdout.decode("utf-8")
    last_line = stdout.splitlines()[-1:]

    # Output defaults
    output = {}
    output["success"] = True
    output["truncated"] = False
    output["details"] = []
    output["errors"] = []

    # If there are no findings
    if result.returncode == 0:
        pass
    # If there are findings
    elif last_line and last_line[0].startswith("Build failed"):
        output["details"] = _parse_report(path, detekt_report)
    # If there was an error
    else:
        output["success"] = False
        output["errors"] = ["The detekt plugin encountered a fatal error"]

    # Cleanup tempfile
    os.remove(detekt_report)

    return output


def _run_detekt_command(config_file: str, path: str, report_file: str):
    """
    Run detekt and save report in XML format
    """
    return subprocess.run(
        [
            "detekt",
            "--config",
            config_file,
            "--input",
            path,
            "--base-path",
            path,
            "--report",
            f"xml:{report_file}",
        ],
        capture_output=True,
        check=False,
    )


def _parse_report(path: str, xml_report: str) -> list[dict]:
    """
    Parse the XML report producted by detekt into a Python dictionary
    """
    tree = ET.parse(xml_report)
    root = tree.getroot()

    # Findings are grouped by file
    files = root.findall("file")

    findings = []
    for file in files:
        filename = file.attrib["name"]

        # In detekt, all findings are called "errors"
        errors = file.findall("error")

        for error in errors:
            finding = {}
            finding["filename"] = filename
            finding["line"] = error.attrib["line"]
            # Remove the absolute path of the scan directory from message
            finding["message"] = error.attrib["message"].replace(f"{path}/", "", 1)
            finding["severity"] = _parse_severity(error.attrib["severity"])
            finding["type"] = error.attrib["source"].split(".")[1]
            findings.append(finding)

    return findings


def _parse_severity(detekt_severity: str) -> str:
    """
    Map detekt severities to Artemis severities
    """
    if detekt_severity == "error":
        severity = "high"
    elif detekt_severity == "warning":
        severity = "medium"
    elif detekt_severity == "info":
        severity = "low"

    return severity


if __name__ == "__main__":
    main()
