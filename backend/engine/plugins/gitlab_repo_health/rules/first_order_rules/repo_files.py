from requests import HTTPError
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
    def check(gitlab, owner, repo, branch, config):
        files_config = config.get("files", {})
        try:
            passing = evaluate_array_config(files_config, lambda path: _file_exists(gitlab, owner, repo, branch, path))

            return add_metadata(passing, RepoFiles, config)
        except HTTPError as e:
            return add_metadata(False, RepoFiles, config, error_message=str(e))


def _file_exists(gitlab, owner, repo, branch, path):
    try:
        contents = gitlab.get_repository_content(owner, repo, branch, path)
    except HTTPError as e:
        if e.response.status_code == 404:
            return False
        else:
            raise e

    return contents.get("type") == "file"
