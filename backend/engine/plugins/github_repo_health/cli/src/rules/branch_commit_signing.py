from .helpers import add_metadata, severity_schema

from github import GithubException


class BranchCommitSigning:
    identifier = "branch_commit_signing"
    name = "Branch - Require Commit Signing"
    description = "Branch protection rule is enabled to enforce code signing"

    config_schema = {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "type": {"const": identifier},
            "id": {"type": "string"},
            "enabled": {"type": "boolean"},
            "name": {"type": "string"},
            "description": {"type": "string"},
            "severity": severity_schema,
        },
    }

    @staticmethod
    def check(github, owner, repo, branch, config={}):
        try:
            protection_config = github.get_branch_protection(owner, repo, branch)
        except GithubException as e:
            return add_metadata(False, BranchCommitSigning, config, error_message=e.data.get("message"))

        passing = protection_config.get("required_signatures", {}).get("enabled") == True
        return add_metadata(passing, BranchCommitSigning, config)
