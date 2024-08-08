"""
Brakeman plugin
return code 0 - successful scan. no vulns
return code 3 - successful scan. vulns found.
return code 4 - no rails app found.
return code 255 - failed scan
"""

import json
import subprocess

from engine.plugins.lib import utils

FAILED_VULNS = 3
ERROR = 255

LOG = utils.setup_logging("brakeman")


def run_brakeman(path: str) -> list:
    """
    This builds the brakeman scanner
    outputs to a json dictionary
    :return: list
    """
    process = subprocess.run(
        ["brakeman", path, "-f", "json"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, cwd=path, check=False
    )

    if process.returncode is FAILED_VULNS:
        return build_output(json.loads(process.stdout.decode("utf-8")))

    if process.returncode is ERROR:
        LOG.error(process.stderr.decode("utf-8"))

    return []


def build_output(data: dict) -> list:
    """
    builds output for json file
    :return: list
    """
    warnings = []
    if data:
        for warning in data["warnings"]:
            item = {
                "type": warning.get("warning_type"),
                "message": warning.get("message"),
                "filename": warning.get("file"),
                "line": warning.get("line"),
                "code": warning.get("code"),
                "confidence": warning.get("confidence"),
            }
            warnings.append(item)

    return warnings


def main():
    """
    main code function
    :todo should we pass or fail on return code 255?
    :return: print json request
    """
    args = utils.parse_args()

    output = run_brakeman(args.path)
    print(json.dumps({"success": not output, "details": output}))


if __name__ == "__main__":
    main()
