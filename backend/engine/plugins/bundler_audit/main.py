"""
Bundler-audit plugin
"""

import glob
import json
import os
import subprocess

from engine.plugins.lib import utils

LOG = utils.setup_logging("bundler_audit")


def run_bundler_audit(path: str) -> dict:
    """
    Runs bundler_audit
    :return: str
    """
    process = subprocess.run(
        ["bundler-audit", "check", "--update"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, cwd=path, check=False
    )

    return {
        "output": parse_output((process.stdout.decode("utf-8"))),
        "errors": parse_stderr((process.stderr.decode("utf-8"))),
    }


def parse_stderr(data: str) -> list:
    """
    builds a list from stderr and parses through to get
    useable data for output
    :param data:
    :return: list
    """
    if not data:
        return []
    start = data.find("`read':") + 8
    end = data.find("(Errno") - 1
    output = data[start:end]
    return output


def parse_output(data: str) -> dict:
    """
    builds the dict from the
    :return: dict
    """
    if not data:
        return {}
    return data_splitter(data)


def data_splitter(data: str) -> dict:
    """
    splits data on the double newline character in data output
    :return: list
    """
    size = 0
    max_size = 399000
    truncated = False
    arr = data.split("\n\n")
    warning_list = []
    for line in arr[:-1]:
        size += len(json.dumps(line).encode("utf-8"))
        if size < max_size:
            warning_list.append(convert_dict(line.split("\n")))
        else:
            truncated = True
            break
    return {"details": warning_list, "truncated": truncated}


def normalize_severity(severity):
    if severity.lower() == "unknown":
        return ""
    return severity.lower()


def convert_dict(my_list: list) -> dict:
    """
    formats dictionary correctly
    :return: dict
    """
    new_dict = {}
    # If item coming from stdout contains the first part of output with no data, skip to the 5th line
    if my_list[0].startswith("Download"):
        my_list = my_list[4:]

    for item in my_list:
        split = item.split(":", 1)
        new_dict[split[0].lower()] = split[1].strip()

    # Find the next unique identifier if the previous is not present
    vuln_id = new_dict.get("cve", new_dict.get("ghsa", new_dict.get("url")))
    if vuln_id:
        return {
            "component": f"{new_dict['name']}-{new_dict['version']}",
            "source": "Gemfile.lock",  # Needs to be more explicit which one
            "id": vuln_id,
            "description": new_dict["title"],
            "severity": normalize_severity(new_dict["criticality"]),
            "remediation": new_dict["solution"],
            "inventory": {
                "component": {"name": new_dict["name"], "version": new_dict["version"], "type": "gem"},
                "advisory_ids": sorted(
                    list(set(filter(None, [vuln_id, new_dict.get("cve"), new_dict.get("ghsa"), new_dict.get("url")])))
                ),
            },
        }
    else:
        LOG.error("No unique identifier found")
        return {}


def find_gemfiles(project_dir: str) -> list:
    return glob.glob(f"{project_dir}/**/Gemfile.lock", recursive=True)


def main():
    """
    main function
    :return: json dump
    """
    args = utils.parse_args()
    gemfile_loc = args.path

    gemfiles = find_gemfiles(gemfile_loc)

    if len(gemfiles) == 0:
        LOG.error("No gemfile.lock files found. Returning")
        output = {"output": {"info": ["No gemfile.lock file found."], "details": []}, "errors": ""}
    else:
        if len(gemfiles) > 1:
            LOG.warning("More than 1 gemfile.lock was found. This is currently unsupported. Auditing first found file.")
        gemfile_loc = os.path.dirname(gemfiles[0])
        output = run_bundler_audit(gemfile_loc)

    print(
        json.dumps(
            {
                "success": not output["output"].get("details"),
                "details": output["output"].get("details", []),
                "truncated": output["output"].get("truncated", False),
                "errors": output["errors"],
            }
        )
    )


if __name__ == "__main__":
    main()
