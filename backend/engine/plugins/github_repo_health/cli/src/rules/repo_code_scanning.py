from .helpers import add_metadata, severity_schema


class RepoCodeScanning:
    identifier = "repo_code_scanning"
    name = "Repository - Code Scanning Enabled"
    description = "Repository is configured to enable code scanning"

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
        repository = github.get_repository(owner, repo)

        message = repository.get("message")
        if message:
            return add_metadata(False, RepoCodeScanning, config, error_message=message)

        security_and_analysis = repository.get("security_and_analysis")
        if security_and_analysis == None:
            return add_metadata(
                False, RepoCodeScanning, config, error_message="GitHub Advanced Security is not enabled"
            )

        passing = security_and_analysis.get("advanced_security", {}).get("status") == "enabled"
        return add_metadata(passing, RepoCodeScanning, config)
