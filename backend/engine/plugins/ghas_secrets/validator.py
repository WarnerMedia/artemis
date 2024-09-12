import subprocess
from typing import Tuple
from artemislib.logging import Logger

LOG = Logger("ghas_secrets")


def validate(location: dict, path: str) -> Tuple[bool, str, str]:
    valid = False
    author = ""
    author_timestamp = ""

    # Commits
    if location["type"] == "commit":
        valid, author, author_timestamp = _validate_commit(location, path)
    elif location["type"] == "wiki_commit":
        valid, author, author_timestamp = _validate_commit(location, path)
    # Issues
    elif location["type"] == "issue_title":
        valid = True
    elif location["type"] == "issue_body":
        valid = True
    elif location["type"] == "issue_comment":
        valid = True
    # Discussions
    elif location["type"] == "discussion_title":
        valid = True
    elif location["type"] == "discussion_body":
        valid = True
    elif location["type"] == "discussion_comment":
        valid = True
    # Pull Requests
    elif location["type"] == "pull_request_title":
        valid = True
    elif location["type"] == "pull_request_body":
        valid = True
    elif location["type"] == "pull_request_comment":
        valid = True
    elif location["type"] == "pull_request_review":
        valid = True
    elif location["type"] == "pull_request_review_comment":
        valid = True

    else:
        LOG.debug("Unknown location type, ignoring")
    return valid, author, author_timestamp


def _validate_commit(location: dict, path: str):
    valid = False
    author = ""
    author_timestamp = ""
    r = subprocess.run(
        ["git", "merge-base", "--is-ancestor", location["details"]["commit_sha"], "HEAD"],
        cwd=path,
        capture_output=True,
    )
    if r.returncode == 0:
        # The commit with the secret is in the current branch
        valid = True
        r = subprocess.run(
            [
                "git",
                "show",
                "--format=%an <%ae>%n%aI",  # Author Name <Author Email>\nISO 8601 Author Date
                "--no-patch",  # Don't care about the diff
                location["details"]["commit_sha"],
            ],
            cwd=path,
            capture_output=True,
        )
        if r.returncode == 0:
            author, author_timestamp = r.stdout.decode("utf-8").strip().split("\n")
    return valid, author, author_timestamp
