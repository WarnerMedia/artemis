"""
shell_check plugin
"""

import json
import subprocess

from engine.plugins.lib import utils

logger = utils.setup_logging("shell_check")


def get_files(path):
    """Gets all files matching what Shell Check can scan.
    NOTE: This subprocess uses shell. DO NOT add arguments to this subprocess to avoid shell injection vulnerabilities.
    Reason: the find command is incredibly fast but I was not able to perform globbing outside of a shell.
    Please periodically check the wiki for any recursion feature improvements in shellcheck:
    https://github.com/koalaman/shellcheck/wiki/Recursiveness
    """
    proc = subprocess.run(
        [
            "find . -type f \\( -name '*.sh' -o -name '*.bash' -o -name '*.ksh' -o -name '*.bashrc' -o -name "
            "'*.bash_profile' -o -name '*.bash_login' -o -name '*.bash_logout' \\)"
        ],
        cwd=path,
        capture_output=True,
        check=False,
        shell=True,
    )
    if proc.stdout:
        files = proc.stdout.decode("utf-8").split("\n")
        if "" in files:
            files.remove("")
        return files
    return []


def run_shellcheck(files, path):
    """Runs Shellcheck across the whole project space.
    NOTE: During Testing, the Linux shellcheck 0.71 binary did not have the severity argument (-S)
    If upgrading remedies this, add ["-S", "error"] to the args and remove the level check in parse_output()
    """

    args = ["shellcheck", "-f", "json"] + files
    proc = subprocess.run(args, cwd=path, capture_output=True, check=False)

    if proc.stdout:
        return json.loads(proc.stdout.decode("utf-8"))
    else:
        logger.error(proc.stderr.decode("utf-8"))


def parse_output(output):
    result = []
    for item in output:
        if item["level"] != "error":
            continue
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


def main(path=None):
    logger.info("Executing Shell Check")
    if not path:
        args = utils.parse_args()
        path = args.path
    files = get_files(path)
    if files:
        response = run_shellcheck(files, path)
        result = parse_output(response)
    else:
        result = []

    output = {"success": not bool(result), "details": result}

    # Print the results to stdout
    print(json.dumps(output))
    return output


if __name__ == "__main__":
    main()
