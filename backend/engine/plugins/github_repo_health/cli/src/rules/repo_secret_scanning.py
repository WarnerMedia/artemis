from .helpers import add_metadata, severity_schema

from github import GithubException


class RepoSecretScanning:
    identifier = "repo_secret_scanning"
    name = "Repository - Secret Scanning Enabled"
    description = "Repository is configured to enable secret scanning"

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
            "require_push_protection": {"type": "boolean"},
        },
    }

    @staticmethod
    def check(github, owner, repo, branch=None, config={}):
        try:
            repository = github.get_repository(owner, repo)
        except GithubException as e:
            return add_metadata(False, RepoSecretScanning, config, error_message=e.data.get("message"))

        security_and_analysis = repository.get("security_and_analysis")
        if security_and_analysis == None:
            return add_metadata(
                False, RepoSecretScanning, config, error_message="GitHub Advanced Security is not enabled"
            )

        secret_scanning_enabled = security_and_analysis.get("secret_scanning", {}).get("status") == "enabled"

        push_protection_not_configured = config.get("require_push_protection") != True
        push_protection_enabled = (
            security_and_analysis.get("secret_scanning_push_protection", {}).get("status") == "enabled"
        )

        passing = secret_scanning_enabled and (push_protection_not_configured or push_protection_enabled)
        return add_metadata(passing, RepoSecretScanning, config)
