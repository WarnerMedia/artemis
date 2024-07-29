"""
tflint plugin
"""

import json
import os
import subprocess
from glob import glob

from engine.plugins.lib import utils

logger = utils.setup_logging("tflint")

# Info and Warning severities relate to style issues and deprecated code.
# Error severity are issues that will prevent terraform from running successfully.
# The project owner should be fully aware of error severities prior to an Analyzer scan.
SEVERITY_CONVERT = {"info": "low", "warning": "low", "error": "medium"}


def glob_for_tf_files(path: str) -> list:
    return glob(f"{path}/**/*.tf", recursive=True)


def get_folders_for_files(files: list, path: str) -> set:
    folders = set()
    for file in files:
        folders.add(os.path.dirname(file).replace(path + "/", ""))
    return folders


def run_tflint(folder: str, path: str):
    args = ["tflint", "-f", "json", folder]
    proc = subprocess.run(args, cwd=path, capture_output=True, check=False)
    if proc.stdout:
        return json.loads(proc.stdout.decode("utf-8")).get("issues", [])
    else:
        logger.error(proc.stderr.decode("utf-8"))
        return []


def parse_output(output: list, path: str) -> list:
    result = []
    for item in output:
        if not item:
            continue
        result.append(
            {
                "filename": item["range"]["filename"].replace(path, "", 1),
                "line": item["range"]["start"]["line"],
                "severity": SEVERITY_CONVERT[item["rule"]["severity"]],
                "message": item["message"],
                "type": item["rule"]["name"],
            }
        )
    return result


def main():
    logger.info("Executing TFLint")
    args = utils.parse_args()
    files = glob_for_tf_files(args.path)
    folders = get_folders_for_files(files, args.path)
    output = []
    for folder in folders:
        output.extend(run_tflint(folder, args.path))
    result = parse_output(output, args.path)
    print(json.dumps({"success": not bool(result), "details": result}))


if __name__ == "__main__":
    main()
