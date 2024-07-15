"""
Utility functions for running git commands
"""

import os
import shutil
import subprocess
from datetime import timezone
from pathlib import Path

from dateutil.parser import parse

from artemislib.logging import Logger
from env import (
    MANDATORY_INCLUDE_PATHS,
    REV_PROXY_DOMAIN_SUBSTRING,
    REV_PROXY_SECRET,
    REV_PROXY_SECRET_HEADER,
    REV_PROXY_SECRET_REGION,
)
from utils.engine import get_key

log = Logger(__name__)

EXCLUDE_EXEMPTIONS = [".git", ".gitignore"]


def git_pull(
    api_key: str,
    repo: str,
    working_dir: str,
    public: bool = True,
    branch: str = None,
    diff_base: str = None,
    http_basic_auth: bool = False,
    include: list = None,
    exclude: list = None,
) -> bool:
    """
    Downloads repository using 'git init' and 'git pull', using the https url of the repository
    This is for services which do not require ssh
    :param api_key: account api key which allows pulling of the repository from the service
    :param repo: url of the repository to pull
    :param working_dir: file path to where we want to pull the repository
    :param public: whether this repository is public or not. If it is public, we do not need an api key
    :param branch: branch of the repository. If user did not specify one, this will be None.
    :param diff_base:
    :return: True/False regarding whether the repository could be pulled.
    """
    url = repo
    if not public and not http_basic_auth:
        url = repo.replace("https://", "https://%s@" % api_key)
        if not url.endswith(".git"):
            url += ".git"
    # !!! IMPORTANT !!!
    # Doing 'git init' then 'git pull' rather than 'git clone' so that the
    # API key isn't written to disk.
    base = os.path.join(working_dir, "base")
    os.makedirs(base)
    r = subprocess.run(["git", "init"], cwd=base, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False)
    if r.returncode != 0:
        log.error(r.stderr.decode("utf-8"))
        return False

    if not set_reverse_proxy_key(url, repo, base):
        return False

    if http_basic_auth:
        _set_http_basic_auth(repo, api_key, base)

    # Pull the repo
    args = ["git", "pull", url]
    if branch:
        args.append(branch)
    r = subprocess.run(args, cwd=base, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False)
    if r.returncode != 0:
        log.error(r.stderr.decode("utf-8").replace(api_key, "xxxxxxxx"))
        return False

    if diff_base:
        # Fetch the diff_base for future use (using FETCH_HEAD)
        r = subprocess.run(
            ["git", "fetch", url, diff_base], cwd=base, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False
        )
        if r.returncode != 0:
            log.error(r.stderr.decode("utf-8").replace(api_key, "xxxxxxxx"))
            return False

    # Update the working tree to apply the path inclusions and exclusions
    _apply_path_exclusions(base, include, exclude)

    return True


def git_rev_parse(git_dir: str, ref: str) -> str or None:
    """
    Retrieve the specific commit hash for a ref. If the ref is itself a hash it returns itself.
    """
    log.info("Running rev-parse for %s", ref)

    # Run 'git rev-parse' on the ret to get the commit hash
    r = subprocess.run(
        ["git", "rev-parse", ref], cwd=git_dir, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False
    )
    if r.returncode != 0:
        log.error(r.stderr.decode("utf-8"))
        return None
    return r.stdout.decode("utf-8").strip()


def set_reverse_proxy_key(url: str, repo: str, base: str) -> bool:
    """
    Determines if a reverse proxy key needs to be set.
    If so, sets the header and key.
    :param url: full url that will be used to pull the repository
    :param repo: unalterd url that points to the repository
    :param base: location in which the git init and git pull will be used to pull the repo.
    :return: True if the additional header is set or does not need to be set, False if there is an error
    """
    # If the repository needs to be pulled via the reverse proxy,
    # we need to also provide the key necessary to pass through the reverse proxy.
    if not REV_PROXY_DOMAIN_SUBSTRING or REV_PROXY_DOMAIN_SUBSTRING not in url:
        return True
    rev_proxy_key = get_key(REV_PROXY_SECRET, REV_PROXY_SECRET_REGION)["SecretString"]
    return _set_extra_header(repo, REV_PROXY_SECRET_HEADER, rev_proxy_key, base)


def _set_http_basic_auth(repo: str, key: str, base: str) -> bool:
    """Sets the HTTP Basic Auth header"""
    return _set_extra_header(repo, "Authorization", f"Basic {key}", base)


def _set_extra_header(repo: str, header: str, value: str, base: str) -> bool:
    """Sets an extra header in the git config"""
    if not repo.endswith(".git"):
        repo = f"{repo}.git"

    r = subprocess.run(
        ["git", "config", f"http.{repo}/.extraheader", f"{header}: {value}"],
        cwd=base,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if r.returncode != 0:
        log.error(r.stderr.decode("utf-8"))
        return False
    return True


def get_last_commit_timestamp(working_dir: str, filepath: str = None) -> str:
    """
    runs git log within base dir and parses most recent commit date.
    :return: str
    """
    args = ["git", "log", '--pretty=format:"%cd"']
    if filepath is not None:
        args.append(filepath)
    base = os.path.join(working_dir, "base")
    process = subprocess.run(args, cwd=base, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False)
    if process.returncode == 0:
        return parse_git_log_output(process.stdout.decode("utf-8"))
    else:
        log.info("Error finding branch commits")
        return None


def parse_git_log_output(output: str) -> str:
    """
    takes git log output and parses most recent commit date and formats the date.
    :return: str
    """
    branch_last_commit_timestamp_str = output.split("\n")[0].replace('"', "")
    return (
        parse(branch_last_commit_timestamp_str).astimezone(timezone.utc).isoformat(timespec="microseconds")
        if branch_last_commit_timestamp_str
        else ""
    )


def git_summary(git_dir: str, diff_base: str, diff_compare: str) -> dict:
    # Verify that both halves of the diff are set before proceeding
    if not diff_base and diff_compare:
        return {}

    log.info("Generating diff summary for %s..%s", diff_base, diff_compare)

    # Run `git diff` to produce non-colorful, no-context output for the diff spec
    r = subprocess.run(
        [
            "git",
            "diff",
            "--no-color",  # We don't need color codes in the output
            "--unified=0",  # We don't need context in the output
            f"{diff_base}..{diff_compare}",  # The diff spec
        ],
        cwd=git_dir,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )

    # Something went wrong so log it and bail
    if r.returncode != 0:
        log.error(r.stderr.decode("utf-8"))
        return

    # Split the output into blocks for each separate file diff
    diffs = r.stdout.decode("utf-8").split("diff")

    summary = {}
    for diff in diffs:
        # Skip any blank lines from the split
        if not diff:
            continue

        # Process the diff block
        processed = _process_diff(diff)

        # Skip any that didn't return a filename
        if not processed["filename"]:
            continue

        # Add the processed diff to the summary
        if processed["filename"] not in summary:
            summary[processed["filename"]] = []
        summary[processed["filename"]] += processed["lines"]

    return summary


def _process_diff(diff_str) -> dict:
    ret = {"filename": None, "lines": []}

    # Iterate through the lines in the diff output. The only lines we care about start with:
    add_prefix = "+++ b/"  # This is the compare half of the filename listing
    summary_prefix = "@@ -"  # This is says which line the diff starts on and the line count
    # All other lines can be ignored
    for line in diff_str.split("\n"):
        if line.startswith(add_prefix):
            # Extract the filename from the compare side
            ret["filename"] = line.replace(add_prefix, "")
        elif line.startswith(summary_prefix):
            # The whole line looks like:
            #   @@ -A,B +X,Y @@
            # If only one line is changed in the diff it looks like:
            #   @@ -A +X @@
            # If only lines were added it looks like:
            #   @@ -A,0 +X,Y @@
            # If only lines were deleted it looks like:
            #   @@ -A,B +X,0 @@
            # If the file is new it looks like:
            #   @@ -0,0 +1,Y @@

            # Split the line up by the spaces and grab the third item (+X,Y or +X) and remove the leading +
            added = line.split()[2].replace("+", "")

            if "," in added:
                # Split X,Y up into start (X) and count (Y) and convert into ints
                split = added.split(",")
                start = int(split[0])
                count = int(split[1])
                if count > 0:
                    # The count is positive so add an inclusive range [start, end] to the list
                    end = start + count - 1  # Reduce by one for inclusive
                    ret["lines"].append([start, end])
            else:
                # The item does not have a count component so make the range the single line
                ret["lines"].append([int(added), int(added)])

    return ret


def git_clean(git_dir) -> dict:
    """
    Clean the git repo to remove all untracked files.
    """
    log.info("Removing untracked files")

    # Run `git clean` to recursively remove untracked files
    # Docs: https://git-scm.com/docs/git-clean
    r = subprocess.run(
        [
            "git",
            "clean",
            "-d",  # Recurse into directories
            "-x",  # Ignore .gitignore and remove all untracked files
            "-f",  # From docs: "git clean will refuse to delete files or directories unless given -f or -i"
        ],
        cwd=git_dir,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )

    # Something went wrong so log it and bail
    if r.returncode != 0:
        log.error(r.stderr.decode("utf-8"))
        return

    for line in r.stdout.decode("utf-8").strip().split("\n"):
        if line:
            log.info(line)


def git_reset(git_dir, include: list = None, exclude: list = None) -> None:
    """
    Reset the index and working tree to undo any file modifications.
    """
    log.info("Resetting the index and working tree back to HEAD")

    # Run `git reset` to return local repo to HEAD
    # Docs: https://git-scm.com/docs/git-reset
    r = subprocess.run(
        [
            "git",
            "reset",
            "--hard",  # Resets the index and working tree, discaring any changes to tracked files in the working tree.
        ],
        cwd=git_dir,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )

    # Something went wrong so log it and bail
    if r.returncode != 0:
        log.error(r.stderr.decode("utf-8"))
        return

    log.info(r.stdout.decode("utf-8").strip())

    # Update the working tree to apply the path inclusions and exclusions as these would
    # have also been reset
    _apply_path_exclusions(git_dir, include, exclude)


def _apply_path_exclusions(git_dir: str, include: list = None, exclude: list = None) -> None:
    # Store the file paths to restore later
    inclusions = _gather_inclusions(git_dir, include)

    log.info("Removing excluded paths from the working tree")
    for path in exclude or []:
        _exclude_path(git_dir, path)

    log.info("Restoring included paths back into the working tree")
    for path in inclusions:
        _git_restore(git_dir, path)

    log.info("Restoring mandatory included paths back into the working tree")
    for path in MANDATORY_INCLUDE_PATHS:
        _git_restore(git_dir, path)


def _exclude_path(git_dir: str, path: str) -> None:
    """
    Remove a path from the working tree
    """
    log.debug("Removing: %s", path)

    try:
        for f in Path(git_dir).glob(path):
            if f.name in EXCLUDE_EXEMPTIONS:
                # Don't accidentally delete these files
                continue
            if f.is_dir():
                shutil.rmtree(f)
            else:
                f.unlink()
    except FileNotFoundError:
        # Depending on how the glob in the path argument is defined the
        # iteration may throw this exception if the top directory was
        # deleted first, but that's ok.
        pass


def _git_restore(git_dir: str, path: str) -> None:
    """
    Restore the path back into the working tree
    """
    log.debug("Restoring: %s", path)

    # Run `git restore` to restore working tree files
    # Docs: https://git-scm.com/docs/git-restore
    r = subprocess.run(
        [
            "git",
            "restore",
            path,
        ],
        cwd=git_dir,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )

    # Something went wrong so log it and bail
    if r.returncode != 0:
        log.error(r.stderr.decode("utf-8"))
        return


def _gather_inclusions(git_dir: str, include: list[str]) -> list[str]:
    ret = []

    exemptions = _build_exclude_exemptions(git_dir)
    for path in include:
        for f in Path(git_dir).glob(path):
            exempted = False
            for e in exemptions:
                if f == e or e in f.parents:
                    # If the file path is directly equal to an exlude exemption or is
                    # within an exempted path it can be ignored because it won't be excluded
                    exempted = True
            if exempted:
                continue
            ret.append(str(f.relative_to(git_dir)))

    return ret


def _build_exclude_exemptions(git_dir: str) -> list:
    ret = []

    root_dir = Path(git_dir)
    for path in EXCLUDE_EXEMPTIONS:
        ret.append(root_dir / Path(path))

    return ret
