from .helpers import add_metadata


class BranchEnforceAdmins:
    identifier = "branch_enforce_admins"
    name = "Branch - Enforce Protection for Admins"
    description = 'Branch protection rule, "Do not allow bypassing the above settings" is enabled. This enforces branch protection for admins'

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
            return add_metadata(False, BranchEnforceAdmins, config, error_message=message)

        passing = protection_config.get("enforce_admins", {}).get("enabled") == True
        return add_metadata(passing, BranchEnforceAdmins, config)
