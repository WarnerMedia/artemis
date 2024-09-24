from artemislib.github.api import GitHubAPI
from artemislib.logging import Logger

LOG = Logger("ghas_secrets")


valid_types = {
    "commit": True,
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


def format_secret(
    github: GitHubAPI, item_id: str, location: dict, alert: dict, author: str, author_timestamp: str
) -> dict:
    if location["type"] not in valid_types:
        LOG.debug("Unknown location type, ignoring")
        return {}
    else:
        url = ""
        filename = location["type"]
        line = 0
        commit = ""

        if location["type"] == "commit":
            filename = location["details"]["path"]
            line = location["details"]["start_line"]
            commit = location["details"]["commit_sha"]

        if location["type"] == "wiki_commit":
            filename = location["details"]["path"]
            line = location["details"]["start_line"]
            commit = location["details"]["commit_sha"]

        if location["type"] == "discussion_title":
            url = location["details"]["discussion_title_url"]

        if location["type"] == "discussion_body":
            url = location["details"]["discussion_body_url"]

        if location["type"] == "discussion_comment":
            url = location["details"]["discussion_comment_url"]

        if location["type"] == "issue_title":
            issue = github.get_url(location["details"]["issue_title_url"])
            author = issue["user"]["login"]
            author_timestamp = issue["created_at"]
            url = issue["html_url"]

        if location["type"] == "issue_body":
            issue = github.get_url(location["details"]["issue_body_url"])
            author = issue["user"]["login"]
            author_timestamp = issue["created_at"]
            url = issue["html_url"]

        if location["type"] == "issue_comment":
            comment = github.get_url(location["details"]["issue_comment_url"])
            author = comment["user"]["login"]
            author_timestamp = comment["created_at"]
            url = comment["html_url"]

        if location["type"] == "pull_request_comment":
            comment = github.get_url(location["details"]["pull_request_comment_url"])
            author = comment["user"]["login"]
            author_timestamp = comment["created_at"]
            url = comment["html_url"]

        if location["type"] == "pull_request_title":
            pull_request = github.get_url(location["details"]["pull_request_title_url"])
            author = pull_request["user"]["login"]
            author_timestamp = pull_request["created_at"]
            url = pull_request["html_url"]

        if location["type"] == "pull_request_review":
            pull_request = github.get_url(location["details"]["pull_request_review_url"])
            author = pull_request["user"]["login"]
            author_timestamp = pull_request["submitted_at"]
            url = pull_request["html_url"]

        if location["type"] == "pull_request_body":
            pull_request = github.get_url(location["details"]["pull_request_body_url"])
            author = pull_request["user"]["login"]
            author_timestamp = pull_request["created_at"]
            url = pull_request["html_url"]

        return {
            "id": item_id,
            "filename": filename,
            "line": line,
            "commit": commit,
            "type": _normalize_secret_type(alert["secret_type"]),
            "author": author,
            "author-timestamp": author_timestamp,
            "validity": alert["validity"],
            "state": alert["state"],
            "created_at": alert["created_at"],
            "location": location["type"],
            "url": url,
        }


def _normalize_secret_type(secret_type: str) -> str:
    """
    There are a large number of secret types supported by GHAS. Some of them need to be normalized
    to be aligned with the types returned by other Artemis plugins.

    https://docs.github.com/en/code-security/secret-scanning/secret-scanning-patterns
    """
    if secret_type.startswith("aws"):
        return "aws"
    elif secret_type.startswith("google"):
        return "google"
    elif "_ssh_" in secret_type:
        return "ssh"
    elif secret_type in ["slack_incoming_webhook_url", "slack_workflow_webhook_url"]:
        return "slack"
    return secret_type  # Keep the original type as a fallthrough
