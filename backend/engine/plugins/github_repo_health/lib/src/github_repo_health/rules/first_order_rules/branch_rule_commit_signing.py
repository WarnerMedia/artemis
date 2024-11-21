from github import GithubException

from ..helpers import add_metadata, severity_schema

DESIRED_RULE_TYPE = "required_signatures"


class BranchRuleCommitSigning:
    identifier = "branch_rule_commit_signing"
    name = "Branch Rule - Require Commit Signing"
    description = "Requires that a branch rule is enabled to enforce code signing"

    config_schema = {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "type": {"const": identifier},
            "id": {"type": "string"},
            "enabled": {"type": "boolean"},
            "name": {"type": "string"},
            "description": {"type": "string"},
            "docs_url": {"type": "string"},
            "severity": severity_schema,
        },
    }

    @staticmethod
    def check(github, owner, repo, branch, config={}):
        try:
            rules = github.get_branch_rules(owner, repo, branch)
        except GithubException as e:
            return add_metadata(
                False,
                BranchRuleCommitSigning,
                config,
                error_message=e.data.get("message"),
            )

        is_rule_commit_signing_map = map(lambda rule: rule.get("type") == DESIRED_RULE_TYPE, rules)
        passing = any(is_rule_commit_signing_map)

        return add_metadata(passing, BranchRuleCommitSigning, config)
