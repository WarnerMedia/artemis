"""
Bandit Plugin
"""

import json
import subprocess
import tempfile

from engine.plugins.lib import utils

LOG = utils.setup_logging("bandit")


def run_bandit(path: str) -> tuple[list, list]:
    """
    runs bandit
    :return: list of warnings, list of errors
    """
    errors = []
    with tempfile.TemporaryDirectory() as temp_dir:
        output_json_path = f"{temp_dir}/output.json"
        process = subprocess.run(
            ["bandit", "-r", path, "-f", "json", "-o", output_json_path],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            cwd=path,
            check=False,
        )
        if process.returncode == 1:
            try:
                with open(output_json_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                return build_dict(data, path)
            except json.JSONDecodeError as e:
                error_msg = f"JSON decode error: {e}"
                LOG.error(error_msg)
                errors.append(error_msg)
                return [], errors
        if process.returncode == 0:
            LOG.info("No issues found.")
            return [], errors
        # Other errors
        stdout_err = process.stdout.decode("utf-8")
        stderr_err = process.stderr.decode("utf-8")
        LOG.info(stdout_err)
        LOG.error(stderr_err)
        if stderr_err:
            errors.append(stderr_err)
        return [], errors


def build_dict(data: dict, path: str) -> tuple[list, list]:
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
    return results_list, data["errors"]


def main():
    """
    main functionality
    :return: json dump
    """
    LOG.info("Executing Bandit")
    args = utils.parse_args()

    output, errors = run_bandit(args.path)
    print(json.dumps({"success": not output, "details": output, "errors": errors}))


if __name__ == "__main__":
    main()
