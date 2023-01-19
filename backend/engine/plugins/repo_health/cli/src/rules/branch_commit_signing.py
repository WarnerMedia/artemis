from .helpers import add_metadata


class BranchCommitSigning:
    identifier = "branch_commit_signing"
    name = "Branch - Require Commit Signing"
    description = "Branch protection rule is enabled to enforce code signing"

    config_schema = {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "type": {"const": identifier},
            "enabled": {"type": "boolean"},
            "name": {"type": "string"},
            "description": {"type": "string"},
        },
    }

    @staticmethod
    def check(github, owner, repo, branch, config={}):
        protection_config = github.get_branch_protection(owner, repo, branch)

        message = protection_config.get("message")
        if message:
            return add_metadata(False, BranchCommitSigning, config, error_message=message)

        passing = protection_config.get("required_signatures", {}).get("enabled") == True
        return add_metadata(passing, BranchCommitSigning, config)
