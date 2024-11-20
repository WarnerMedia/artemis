from ..helpers import add_metadata, severity_schema


class RepoSecurityAlerts:
    identifier = "repo_security_alerts"
    name = "Repository - Dependabot Security Alerts Enabled"
    description = "Repository is configured to enable Dependabot Security Alerts"

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
    def check(github, owner, repo, branch=None, config={}):
        enabled = github.are_vulnerability_alerts_enabled(owner, repo)

        return add_metadata(enabled, RepoSecurityAlerts, config)
