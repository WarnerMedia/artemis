"""
AWS CloudFormation Linter plugin
"""

import json
import subprocess
from glob import glob

from engine.plugins.lib import utils

logger = utils.setup_logging("cfn_python_lint")

# Info and Warning severities relate to size limits and config advice.
# Error severity are issues unrelated to security.
# The project owner should be fully aware of error severities prior to an Analyzer scan.
SEVERITY_CONVERT = {"Info": "negligible", "Warning": "low", "Error": "medium"}


def glob_for_yaml_files(path: str) -> list:
    return glob(f"{path}/**/*.yaml", recursive=True)


def run_cfnlint(files: list, path: str):
    args = ["cfn-lint", "-f", "json"] + files
    proc = subprocess.run(args, cwd=path, capture_output=True, check=False)
    if proc.stdout:
        return json.loads(proc.stdout.decode("utf-8"))
    else:
        logger.error(proc.stderr.decode("utf-8"))
        return []


def parse_output(output: list, path) -> list:
    result = []
    for item in output:
        # E0000 has no filename and notes that no template file could be found.
        if not item or not item.get("Filename"):
            continue
        result.append(
            {
                "filename": item["Filename"].replace(path, "", 1),
                "line": item["Location"]["Start"]["LineNumber"],
                "severity": SEVERITY_CONVERT[item["Level"]],
                "message": parse_message(item.get("Message", "")),
                "type": item["Rule"]["Id"],
            }
        )
    return result


def parse_message(message):
    if isinstance(message, str):
        return message.split("\n")[0]
    if "__ComposerError__" in message:
        return f"ERROR: {message['__ComposerError__'].get('context')}"
    if isinstance(message, dict):
        return json.dumps(message)
    return "ERROR: message could not be parsed"


def main(path=None):
    logger.info("Executing Cloud Formation Linter")
    if not path:
        args = utils.parse_args()
        path = args.path
    if not path.endswith("/"):
        path += "/"
    files = glob_for_yaml_files(path)
    response = run_cfnlint(files, path)
    result = parse_output(response, path)
    output = {"success": not bool(result), "details": result}
    print(json.dumps(output))
    return output


if __name__ == "__main__":
    main()
