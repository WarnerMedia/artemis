"""
GoSec Plugin
"""

import json
import subprocess

from cwe2.database import Database, InvalidCWEError

from engine.plugins.lib import utils

from report import Issue, ReportInfo

LOG = utils.setup_logging("gosec")
db = Database()


def run_gosec(path: str) -> list[dict]:
    """
    runs gosec
    :return: json
    """
    # appending '...' tells gosec to recursively scan the directory.
    recursive_path = path + "..."
    process = subprocess.run(
        ["gosec", "-fmt=json", recursive_path], stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False
    )
    # check for b'' in stdout, if gosec does not detect any files to scan,
    # the process will still returncode 1, but stdout will be b''
    if process.returncode == 0 or process.stdout == b"":
        LOG.info("No issues found.")
        return []
    if process.returncode == 1:
        return parse_scan(ReportInfo.model_validate_json(process.stdout.decode("utf-8")), path)
    LOG.error(process.stdout.decode("utf-8"))
    LOG.error(process.stderr.decode("utf-8"))
    return []


def parse_scan(data: ReportInfo, path: str) -> list[dict]:
    """
    builds the list from the json output
    :return: list
    """
    results_list = []
    if data:
        # log stats of a successful scan
        LOG.info(data.stats)
        for warnings in data.issues:
            if warnings.rule_id == "G404" or warnings.rule_id == "G307":
                items = amend_rule(warnings, path)
            else:
                items = {
                    "filename": warnings.file.replace(path, "", 1),
                    "severity": warnings.severity.lower(),
                    "message": warnings.details,
                    "line": convert_line(warnings.line),  # Convert line number string to an int
                    "type": "{}: {}".format(warnings.cwe.id, get_cwe_reason(warnings.cwe.id)),
                }
            results_list.append(items)
    return results_list


def amend_rule(warnings: Issue, path: str) -> dict:
    """
    G404 (Insecure random number source (rand)) is a situationally dependent vulnerability.
    Edit the "severity" to low, amend the "message" to explain when cryptorand is needed over rand.
    G307 (Deferring a method which returns an error)
    Edit the "severity" to low
    :return: object
    """
    context = (
        ". The need for crypto rand is context based and should be used when generating api keys, tokens, etc. "
        "If the number being generated does not need to be secure, rand can be used."
    )
    items = {
        "filename": warnings.file.replace(path, ""),
        "severity": "low",
        "message": warnings.details + context if warnings.rule_id == "G404" else warnings.details,
        "line": convert_line(warnings.line),  # Convert line number string to an int
        "type": "{}: {}".format(warnings.cwe.id, get_cwe_reason(warnings.cwe.id)),
    }
    return items


def get_cwe_reason(id: str) -> str:
    """
    gets the name of the vulnerability from the cwe ID
    :return: str
    """
    try:
        return db.get(id).name if db.get(id) and db.get(id).name else "No Vulnerability Name Available"
    except InvalidCWEError:
        return "No Vulnerability Name Available"


def convert_line(line: str) -> int:
    ret = 0  # Default value
    try:
        if "-" in line:
            # Line is a range so just convert the first part to an int
            ret = int(line.split("-")[0])
        else:
            # Convert the line to an int
            ret = int(line)
    except ValueError:
        # Value was not an int so keep the default
        pass
    return ret


def main():
    """
    main functionality
    :return: json dump
    """
    args = utils.parse_args()
    output = run_gosec(args.path)
    print(json.dumps({"success": not bool(output), "details": output}))


if __name__ == "__main__":
    main()
