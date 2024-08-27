from requests import HTTPError
from ..helpers import add_metadata, severity_schema


class BranchProtectionCodeOwnerApproval:
    identifier = "branch_protection_codeowner_approval"
    name = "Branch Protection - Enforce Codeowner Approval"
    description = 'Requires that branch protection rule, "Code owner approval" is disabled. This enforces Codeowners to approve Merge Requests.'

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
                BranchProtectionCodeOwnerApproval,
                config,
                error_message=str(e),
            )

        passing = protection_config.get("code_owner_approval_required", False) is True
        return add_metadata(passing, BranchProtectionCodeOwnerApproval, config)
