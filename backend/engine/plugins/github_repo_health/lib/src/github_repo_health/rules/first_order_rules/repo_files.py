from github import GithubException

from ..helpers import add_metadata, array_config_schema, evaluate_array_config, severity_schema


class RepoFiles:
    identifier = "repo_files"
    name = "Repository - Require Files in Repo"
    description = "Require specific files in the repo"

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
            "files": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    **array_config_schema,
                },
            },
        },
    }

    @staticmethod
    def check(github, owner, repo, branch, config):
        files_config = config.get("files", {})
        try:
            passing = evaluate_array_config(files_config, lambda path: _file_exists(github, owner, repo, path))

            return add_metadata(passing, RepoFiles, config)
        except GithubException as e:
            return add_metadata(False, RepoFiles, config, error_message=e.data.get("message"))


def _file_exists(github, owner, repo, path):
    try:
        contents = github.get_repository_content(owner, repo, path)
    except GithubException as e:
        if e.status == 404:
            return False
        else:
            raise e

    return contents.get("type") == "file"
