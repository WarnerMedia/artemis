"""
technology_discovery plugin
"""
import json
import subprocess

from engine.plugins.lib import utils


def iterate_output(string):
    """
    The results from enry are not in a serialized format.
    This takes the human readable output and creates a dict
    :param string:
    :return: dict
    """
    results = {}
    for row in string.splitlines():
        split = row.split()
        results[split[1]] = float(split[0].strip("%"))

    return results


def run_enry(path):
    """
    Execute the enry process in the work directory
    :param path:
    :return: dict
    """
    r = subprocess.run(["enry", "-prog", path], stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False)
    return {"output": iterate_output(r.stdout.decode("utf-8").rstrip()), "status": r.returncode == 0, "path": path}


def main():
    """
    Main plugin execution
    """
    args = utils.parse_args()

    enry_results = run_enry(args.path)
    print(json.dumps({"success": enry_results["status"], "details": {"technology_discovery": enry_results["output"]}}))


if __name__ == "__main__":
    main()
