PLUGIN_NAME = "gitlab_repo_health"

DEFAULT_CONFIG = {
    "name": "artemis_default",
    "version": "1.0.0",
    "rules": [
        {
            "type": "composite_rule",
            "id": "branch_commit_signing",
            "name": "Branch - Commit Signing",
            "description": "Branch rule or branch protection rule is enabled to enforce commit signing",
            "subrules": {
                "any_of": [
                    {"type": "branch_protection_commit_signing"},
                    {"type": "branch_rule_commit_signing"},
                ]
            },
        },
        {
            "type": "composite_rule",
            "id": "branch_enforce_admins",
            "name": "Branch - Enforce Rules for Admins",
            "description": "Branch rule or branch protection rule is enabled to enforce branch rules for admins",
            "subrules": {
                "all_of": [
                    {"type": "branch_protection_enforce_admins"},
                    {
                        "type": "branch_ruleset_bypass_actors",
                        "description": "There are no bypass actors allowed in branch rules",
                        "allowed_bypass_actor_ids": [],
                    },
                ]
            },
        },
        {
            "type": "composite_rule",
            "id": "branch_pull_requests",
            "name": "Branch - Pull Request",
            "description": "Branch rule or branch protection rule is enabled to require pull requests",
            "subrules": {
                "any_of": [
                    {
                        "type": "branch_protection_pull_requests",
                        "expect": {
                            "dismiss_stale_reviews": True,
                            "require_code_owner_reviews": True,
                        },
                        "min_approvals": 1,
                    },
                    {
                        "type": "branch_rule_pull_requests",
                        "expect": {
                            "dismiss_stale_reviews_on_push": True,
                            "require_code_owner_review": True,
                        },
                        "min_approvals": 1,
                    },
                ]
            },
        },
        {
            "type": "composite_rule",
            "id": "branch_status_checks",
            "name": "Branch - Status Checks",
            "description": "Branch or branch protection rule is enabled to require strict status checks",
            "subrules": {
                "any_of": [
                    {
                        "type": "branch_protection_status_checks",
                        "expect": {"strict": True},
                    },
                    {
                        "type": "branch_rule_status_checks",
                        "expect": {"strict_required_status_checks_policy": True},
                    },
                ]
            },
        },
        {
            "type": "repo_security_alerts",
            "id": "gitlab_repo_security_alerts",
        },
        # Refer to engine/plugins/gitlab_repo_health/rules for other rules
    ],
}
