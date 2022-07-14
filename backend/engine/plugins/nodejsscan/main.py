"""
Nodejs plugin
"""
import json
import subprocess

from engine.plugins.lib import utils

log = utils.setup_logging("nodejsscan")


def run_nodejsscan(path):
    """
    runs nodejsscan
    NodeJSScan returns 0 if the tool executes successfully. Non-zero if the
    tool does not complete the scan successfully. Not tied to findings.
    The CLI stdout and stderr data returns a text header and two empty new
    lines that needs to be stripped to expose valid JSON.
    :param path: path to directory
    :return: directory
    """
    cmd_exec = subprocess.run(["nodejsscan", "-d", path], stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False)
    error_string = []
    if cmd_exec.returncode:
        log.error(cmd_exec.stderr.decode("utf-8"))
        error_string.append("NodeJSScan encountered an error")

    data = parse_stdout(json.loads(cmd_exec.stdout.decode("utf-8").split("\n", 3)[3]))

    return {"stdout": data, "errors": error_string}


def parse_stdout(data):
    """
    takes the data from stdout and builds
    a dictionary from desired output
    :param data: data
    :return: dict
    """
    if not data:
        return {}
    output_list = []
    report = data["sec_issues"]
    for key in report:
        for item in report[key]:
            items = {
                "filename": item.get("filename"),
                "line": item.get("line"),
                "id": item.get("path"),
                "message": item.get("description"),
                "confidence": "",
                "severity": "",
                "type": item.get("title"),
            }
            output_list.append(items)

    return output_list


def main():
    """
    main function
    :return: json dump
    """
    args = utils.parse_args()

    output = run_nodejsscan(args.path)
    print(json.dumps({"success": not output, "details": output["stdout"], "errors": output["errors"]}))


if __name__ == "__main__":
    main()
