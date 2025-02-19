"""
module running eslint on javascript/typescript files
"""

from dataclasses import dataclass
from pathlib import Path
import json
import subprocess

from engine.plugins.lib import utils
from engine.plugins.lib.lint_severity import convert_severity_from_num

log = utils.setup_logging("eslint")


@dataclass
class Result:
    data: list[str]
    info: list[str]


def run_eslint(path: str, config: str) -> Result:
    """
    function args: path to directory where code is
    and path to where eslint rcfile
    returns the results of running eslint in 'unix'
    output 'mode'
    Per eslint documentation:
    0 = successful run. no linting errors.
    1 = successful run. linting errors.
    2 = internal error.
    """
    # The ESLint wrapper in the container may switch the working directory
    # to resolve plugin dependencies, so specify all paths as absolute.
    config_path = Path(config).absolute()
    target_path = Path(path).absolute() / "**" / "*.{js,jsx,ts,tsx}"
    cmd = ["eslint", "-f", "json", "--config", str(config_path), str(target_path)]
    completed = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, cwd=path, check=False)
    info = []
    if completed.returncode == 2:
        internal_error_message = " ".join(completed.stderr.decode("utf-8").split("\n")[5:])
        log.error(internal_error_message)
        info.append("Eslint encountered an internal error: {}".format(internal_error_message))

    data = list(filter(None, completed.stdout.decode("utf-8").split("\n")))

    return Result(data=data, info=info)


def parse_details(scan_data: list[str], path: str) -> list[dict]:
    """
    takes the argument of scan results and returns a list of results. severity does not align with finding
    severity, but tied to exit code. eslint-plugin-security does not have
    confidence ratings.
    sev 0 = off. 1 = warn. (list finding. exit code 0)
    2 = error. (list finding. exit code 1)
    """
    if not scan_data:
        return []

    eslint_data = json.loads(scan_data[0])

    findings = []
    for file in eslint_data:
        finding_count = file.get("errorCount") + file.get("warningCount")
        if not finding_count:
            continue
        for message in file.get("messages"):
            finding = {
                "filename": file.get("filePath", "").replace(path, "", 1),
                "line": message.get("line", ""),
                "message": message.get("message", ""),
                "severity": convert_severity_from_num(message.get("severity")),
                "type": message.get("nodeType", ""),
            }
            findings.append(finding)
    return findings


def main():
    """
    entry point for the module
    """
    args = utils.parse_args(
        extra_args=[
            [["eslint_config"], {"type": str, "nargs": "?", "default": "/srv/engine/plugins/eslint/eslintrc.js"}],
        ]
    )
    if not args.config:
        args.config = args.eslint_config

    scan_results = run_eslint(args.path, args.config)
    details = parse_details(scan_results.data, args.path)

    print(json.dumps({"success": not details, "details": details, "info": scan_results.info}))


if __name__ == "__main__":
    main()
