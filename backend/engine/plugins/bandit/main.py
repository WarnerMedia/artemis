"""
Bandit Plugin
"""

import json
import subprocess

from engine.plugins.lib import utils

LOG = utils.setup_logging("bandit")


def run_bandit(path: str) -> list:
    """
    runs bandit
    :return: json
    """
    process = subprocess.run(
        ["bandit", "-r", path, "-f", "json"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, cwd=path, check=False
    )
    if process.returncode == 1:
        return build_dict(json.loads(process.stdout.decode("utf-8")), path)
    if process.returncode == 0:
        LOG.info("No issues found.")
        return []
    LOG.error(process.stdout.decode("utf-8"))
    LOG.error(process.stderr.decode("utf-8"))
    return []


def build_dict(data: dict, path: str) -> list:
    """
    builds the list from the json output
    :return: list
    """

    results_list = []
    if data:
        for warnings in data["results"]:
            items = {
                "filename": warnings.get("filename").replace(path, "", 1),
                "severity": warnings.get("issue_severity").lower(),
                "message": warnings.get("issue_text"),
                "line": warnings.get("line_range")[0],
                "type": "{}: {}".format(warnings.get("test_id"), warnings.get("test_name")),
            }

            if warnings.get("test_id") == "B105":
                items["message"] = "Possible hardcoded password"

            results_list.append(items)
    return results_list


def main():
    """
    main functionality
    :return: json dump
    """
    LOG.info("Executing Bandit")
    args = utils.parse_args()

    output = run_bandit(args.path)
    print(json.dumps({"success": not bool(output), "details": output}))


if __name__ == "__main__":
    main()
