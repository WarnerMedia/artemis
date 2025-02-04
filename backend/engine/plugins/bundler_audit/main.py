"""
Bundler-audit plugin
"""

from dataclasses import dataclass, field
import glob
import json
import os
import subprocess
from typing import Optional

from engine.plugins.lib import utils

LOG = utils.setup_logging("bundler_audit")


@dataclass
class Results:
    details: list[dict] = field(default_factory=list)
    truncated: bool = False

    def empty(self) -> bool:
        return not self.details


def run_bundler_audit(path: str) -> tuple[Results, list[str]]:
    """
    Runs bundler_audit on the target path.
    Returns the findings and list of errors.
    """
    process = subprocess.run(
        ["bundler-audit", "check", "--update"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        cwd=path,
        check=False,
        # Explicitly disable colorization of messages since we parse
        # the output.
        env=dict(os.environ, NO_COLOR="1"),
    )
    return parse_results(
        process.returncode,
        process.stdout.decode("utf-8"),
        process.stderr.decode("utf-8"),
    )


def parse_results(returncode: int, out: str, err: str) -> tuple[Results, list[str]]:
    """
    Process the output of bundler-audit.
    Returns the findings and list of errors.
    """

    # Determining the success/fail of bundler-audit using the CLI is tricky:
    #   - bundler-audit runs git to update the DB, which writes all
    #     messages to stderr.
    #   - bundler-audit exits with code 1 if an error occurred *or* there are
    #     any findings.
    #
    # To avoid trying to recognize all potential error messages, we rely on the
    # exit code as well as whether there are any findings.

    if returncode == 0:
        # No findings, no errors.
        return (Results(), [])
    elif (lastline := out.splitlines()[-1].strip()).startswith("failed to download "):
        # Special case: The "failed to download" error is written to
        # stdout instead of stderr.
        # This may or may not be accompanied by a git error, which *is*
        # written to stderr, so we try to capture that as well.
        return (Results(), parse_stderr(err) + [lastline])
    else:
        output = parse_output(out)
        if not output.empty():
            # Findings present, assume "errors" are normal info messages.
            return (output, [])
        else:
            # No findings, return all info messages as errors.
            return (Results(), parse_stderr(err))


def parse_stderr(data: str) -> list[str]:
    """
    Reformats the stderr output from the command and generate a more concise
    error message.
    :param data: The full stderr output.
    :return: list
    """
    if not data:
        return []

    # Note: Previous versions of this plugin only attempted to detect
    # "No such file or directory" errors amongst a stack trace.
    # This meant that other error messages are potentially skipped.
    #
    # Newer versions of bundler-audit more clearly format most error messages
    # without a stack trace, but we can still handle basic trimming of a
    # stack trace if bundler-audit crashes with one.
    # To keep things simple, we no longer attempt to trim the first line
    # of the stack trace.

    errs = [
        s.strip()
        for s in data.splitlines()
        # Remove Ruby backtrace lines.
        # This assumes that the backtrace is in pre-Ruby 2.5 format, which
        # should always be the case since the output is not attached to
        # a TTY.
        if not s.startswith("\tfrom")
    ]
    if len(errs) > 0:
        # bundler-audit runs git which outputs status messages to stderr, which
        # adds a lot of noise when reporting to the user.
        # We assume that the last line of stderr (after filtering above) is the
        # actual error, if any.
        errs = errs[-1:]
        # Log the full unfiltered output so we can debug.
        LOG.warning(f"bundler-audit error log: {data}")
    return errs


def parse_output(data: str) -> Results:
    """Parse stdout and generate the plugin results."""
    if not data:
        return Results()
    return data_splitter(data)


def data_splitter(data: str) -> Results:
    """
    Parse each finding from the raw text output.

    Each finding is assumed to be separated by a double-newline.
    """
    size = 0
    max_size = 399000
    truncated = False
    arr = data.split("\n\n")
    warning_list: list[dict] = []
    for line in arr[:-1]:
        size += len(json.dumps(line).encode("utf-8"))
        if size < max_size:
            if finding := convert_dict(line.split("\n")):
                warning_list.append(finding)
        else:
            truncated = True
            break
    return Results(details=warning_list, truncated=truncated)


def normalize_severity(severity: str) -> str:
    if severity.lower() == "unknown":
        return ""
    return severity.lower()


def convert_dict(my_list: list[str]) -> Optional[dict]:
    """
    Parse each finding from a block of lines.
    Returns the finding or None if the block does not contain a finding.
    """

    # Example:
    #   Name: actionmailer
    #   Version: 4.2.7
    #   CVE: CVE-2024-47889
    #   GHSA: GHSA-h47h-mwp9-c6q6
    #   Criticality: Unknown
    #   URL: https://github.com/rails/rails/security/advisories/GHSA-h47h-mwp9-c6q6
    #   Title: Possible ReDoS vulnerability in block_format in Action Mailer
    #   Solution: upgrade to ~> 6.1.7.9, ~> 7.0.8.5, ~> 7.1.4.1, >= 7.2.1.1

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
        return None


def find_gemfiles(project_dir: str) -> list[str]:
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
        LOG.warning("No gemfile.lock files found")
        output = Results()
        errors = []
    else:
        if len(gemfiles) > 1:
            LOG.warning("More than 1 gemfile.lock was found. This is currently unsupported. Auditing first found file.")
        gemfile_loc = os.path.dirname(gemfiles[0])
        (output, errors) = run_bundler_audit(gemfile_loc)

    print(
        json.dumps(
            {
                "success": output.empty(),
                "details": output.details,
                "truncated": output.truncated,
                "errors": errors,
            }
        )
    )


if __name__ == "__main__":
    main()
