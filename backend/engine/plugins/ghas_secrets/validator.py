import subprocess
from artemislib.logging import Logger

LOG = Logger("ghas_secrets")

valid_types = {
    "wiki_commit": True,
    "issue_title": True,
    "issue_body": True,
    "issue_comment": True,
    "discussion_title": True,
    "discussion_body": True,
    "discussion_comment": True,
    "pull_request_title": True,
    "pull_request_body": True,
    "pull_request_comment": True,
    "pull_request_review": True,
    "pull_request_review_comment": True,
}


def validate(location: dict, path: str) -> tuple[bool, str, str]:
    valid = False
    author = ""
    author_timestamp = ""

    if location["type"] in "commit":
        valid, author, author_timestamp = _validate_commit(location, path)
    elif location["type"] in valid_types:
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
