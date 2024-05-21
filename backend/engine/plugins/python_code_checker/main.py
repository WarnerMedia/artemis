"""
python_code_checker plugin
"""

import json
import subprocess
from glob import glob

from engine.plugins.lib import utils


def pylint(filename, rcfile):
    """
    Run pylint on the file and capture the JSON results
    """
    res = subprocess.run(
        ["pylint", "-s", "no", "--exit-zero", "-f", "json", "--rcfile", rcfile, filename],
        capture_output=True,
        check=False,
    )
    if res.stdout:
        return json.loads(res.stdout.decode("utf-8"))
    return []


def check_python_files(path, rcfile):
    """
    Check all the Python files found in the specified path and return
    the results.
    """
    results = []
    count = 0

    # Find and loop through all the .py files in the path
    files = glob("%s/**/*.py" % path, recursive=True)
    for filename in files:
        # Run pylint against the file
        res = pylint(filename, rcfile)

        # Go through the results
        for item in res:

            finding = {
                "filename": item["path"].replace(path, "", 1),
                "line": item["line"],
                "column": item["column"],
                "message-id": item["message-id"],
                "message": item["message"],
                "type": item["symbol"],
            }
            results.append(finding)
        count += 1

    # Return the results
    return {
        "file_count_total": len(files),
        "file_count_examined": count,
        "details": results,
        "success": not bool(results),
    }


def main():
    """
    Main plugin execution
    """
    # Allow the path to be overridded on the command line. This lets the
    # plugin be tested against any path, not just the engine work path.
    args = utils.parse_args(
        extra_args=[
            [
                ["--rcfile"],
                {
                    "dest": "rcfile",
                    "type": str,
                    "nargs": "?",
                    "default": "/srv/engine/plugins/python_code_checker/pylintrc",
                },
            ]
        ]
    )

    results = check_python_files(args.path, args.rcfile)

    # Print the results to stdout
    print(json.dumps(results))


if __name__ == "__main__":
    main()
