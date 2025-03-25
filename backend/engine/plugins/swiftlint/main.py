"""
SwiftLint Plugin
"""

import json
import subprocess

from engine.plugins.lib import utils
from os.path import abspath

LOG = utils.setup_logging("swiftlint")


def main():
    """
    Run SwiftLint and print JSON Results
    """
    LOG.info("Executing SwiftLint")
    args = utils.parse_args()
    output = run_swiftlint(args.path)

    print(json.dumps(output))


def run_swiftlint(path: str) -> dict:
    """
    Run SwiftLint and return results in dictionary
    """
    path = abspath(path)
    process = subprocess.run(
        ["swiftlint", "--config", "/etc/swiftlint.yml"], capture_output=True, check=False, cwd=path
    )

    stdout = process.stdout.decode("utf-8")
    stderr = process.stderr.decode("utf-8")
    last_line = stderr.splitlines()[-1:][0]

    # Output defaults
    output = {}
    output["success"] = True
    output["truncated"] = False
    output["details"] = []
    output["errors"] = []

    # If there are swift files to scan
    if last_line.startswith("Error: No lintable files found at paths:"):
        LOG.info("No swift files found.")
    # If there are no findings
    elif last_line.startswith("Done linting! Found 0 violations"):
        LOG.info("No issues found.")
    # If there are findings
    elif last_line.startswith("Done linting! Found"):
        LOG.info("Issues found.")
        output["details"] = parse_swiftlint(stdout, path)
    # If swiftlent encounters an unprecidented error
    else:
        output["success"] = False
        output["errors"] = ["An error has occurred. Contact CSO AppSec team for assistance.."]
        LOG.error(f"stdout: {stdout}")
        LOG.error(f"stderr: {stderr}")

    return output


def parse_swiftlint(swiftlint_output, path) -> list:
    """
    Parse the output of SwiftLint
    """
    findings = []
    for line in swiftlint_output.splitlines():
        finding = {}
        columns = line.split(":")
        finding["filename"] = columns[0].strip().replace(f"{path}/", "", 1)
        finding["line"] = columns[1].strip()
        try:
            finding["line"] = int(finding["line"])
        except ValueError:
            finding["line"] = 0

        finding["message"] = columns[5].strip()
        # SwiftLint has two severities: warning and error
        # Errors include some relatively minor things such as "Line Length Violation", so a "low" severity should be
        # sufficient for either "warning" or "error"
        finding["severity"] = columns[3].strip().replace("warning", "low").replace("error", "low")
        finding["type"] = columns[4].strip()
        findings.append(finding)

    return findings


if __name__ == "__main__":
    main()
