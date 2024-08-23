from requests import HTTPError
from ..helpers import add_metadata, severity_schema


class BranchProtectionEnforceAdmins:
    identifier = "branch_protection_enforce_admins"
    name = "Branch Protection - Enforce Protection for Admins"
    description = 'Requires that branch protection rule, "Do not allow bypassing the above settings" is enabled. This enforces branch protection for admins'

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
    def check(gitlab, owner, repo, branch, config={}):
        try:
            protection_config = gitlab.get_branch_protection(owner, repo, branch)
        except HTTPError as e:
            return add_metadata(
                False,
                BranchProtectionEnforceAdmins,
                config,
                error_message=str(e),
            )

        passing = protection_config.get("allow_force_push", True) is False
        return add_metadata(passing, BranchProtectionEnforceAdmins, config)
