"""
shell_check plugin
"""

import json
import pathlib
import subprocess
from typing import Any, Optional

from engine.plugins.lib import utils

logger = utils.setup_logging("shell_check")

# Filename extensions to include in scanning.
INCLUDE_EXTS = {".sh", ".bash", ".ksh", ".bashrc", ".bash_login", ".bash_logout", ".bash_profile", ".bash"}


def get_files(path: str) -> list[str]:
    """
    Recursively finds all files matching what can be scanned, starting from the
    base path.

    The returned filenames are relative to the base path, with "./" prepended
    (to match prior versions).
    """
    base = pathlib.Path(path)
    return [
        f"./{f.relative_to(base)}"
        for f in base.glob("**/*")
        if f.is_file() and (f.name in INCLUDE_EXTS or f.suffix in INCLUDE_EXTS)
    ]


def run_shellcheck(files: list[str], path: str) -> Optional[list[Any]]:
    """Runs Shellcheck across the whole project space."""

    args = ["shellcheck", "-f", "json", "-S", "error"] + files
    proc = subprocess.run(args, cwd=path, capture_output=True, check=False)

    if proc.stdout:
        return json.loads(proc.stdout.decode("utf-8"))
    else:
        logger.error(proc.stderr.decode("utf-8"))


def parse_output(output: list[Any]) -> list[dict[str, str]]:
    result = []
    for item in output:
        result.append(
            {
                "filename": item["file"],
                "line": item["line"],
                "severity": "medium",
                "message": item["message"],
                "type": str(item["code"]),  # Convert the integer code to a string to match the required output format
            }
        )
    return result


def main(path: Optional[str] = None):
    logger.info("Executing Shell Check")
    if not path:
        args = utils.parse_args()
        path = str(args.path)
    files = get_files(path)
    result = []
    if files:
        response = run_shellcheck(files, path)
        if response:
            result = parse_output(response)

    output = {"success": not bool(result), "details": result}

    # Print the results to stdout
    print(json.dumps(output))
    return output


if __name__ == "__main__":
    main()
