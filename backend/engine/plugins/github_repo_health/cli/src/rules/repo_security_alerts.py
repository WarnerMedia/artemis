from .helpers import add_metadata, severity_schema


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
            "severity": severity_schema,
        },
    }

    @staticmethod
    def check(github, owner, repo, branch=None, config={}):
        vulnerability_alerts = github.check_vulnerability_alerts(owner, repo)

        # Github API uses status codes, but the Octokit Python library doesn't seem to expose them...
        # So we just check if there is an error message
        # https://docs.github.com/en/rest/repos/repos#check-if-vulnerability-alerts-are-enabled-for-a-repository
        passing = "message" not in vulnerability_alerts

        return add_metadata(passing, RepoSecurityAlerts, config)
