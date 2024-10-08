import json
import sys

from artemislib.github.app import GithubApp
from engine.plugins.lib import utils
from github_repo_health.utilities import Config, Checker, Github

PLUGIN_NAME = "github_repo_health"

# Will be used if service is "github", but no matching PluginConfig is found
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
                "any_of": [{"type": "branch_protection_commit_signing"}, {"type": "branch_rule_commit_signing"}]
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
                        "expect": {"dismiss_stale_reviews": True, "require_code_owner_reviews": True},
                        "min_approvals": 1,
                    },
                    {
                        "type": "branch_rule_pull_requests",
                        "expect": {"dismiss_stale_reviews_on_push": True, "require_code_owner_review": True},
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
                    {"type": "branch_protection_status_checks", "expect": {"strict": True}},
                    {"type": "branch_rule_status_checks", "expect": {"strict_required_status_checks_policy": True}},
                ]
            },
        },
        {
            "type": "repo_security_alerts",
            "id": "github_repo_security_alerts",
        },
        # Refer to engine/plugins/github_repo_health/lib/src/github_repo_health/rules for other rules
    ],
}

log = utils.setup_logging(PLUGIN_NAME)


def main():
    args = utils.parse_args()

    result = run_repo_health(args)

    print(json.dumps(result))


def run_repo_health(args):
    output = {
        "success": False,
        "truncated": False,
        "details": [],
        "errors": [],
        "alerts": [],
        "debug": [],
        "event_info": {},
    }

    service = args.engine_vars.get("service_name")

    if service != "github":
        # Repo health check only supports Github, but that's not our user's
        # fault, so let's return true
        output["success"] = True
        return output

    owner, repo = destructure_repo(args.engine_vars.get("repo"))
    config = get_config_from_args(args, output, service, owner, repo)

    try:
        Config.validate(config)
    except Exception as err:
        output["errors"].append(str(err))
        return output

    log.info(f"Using config '{config.get('name')}@{config.get('version')}'")

    github_app = GithubApp(log_stream=sys.stderr)
    github_token = github_app.get_installation_token(owner)

    if github_token is None:
        output["errors"].append("Failed to authenticate to Github")
        return output

    github = Github.get_client_from_token(github_token)
    checker = Checker(github, config)

    branch = args.engine_vars["ref"] or github.get_default_branch(owner, repo)
    hash = github.get_branch_hash(owner, repo, branch)  # Get latest hash of default branch for event info

    results = checker.run(owner, repo, branch)

    output["details"].extend(results)
    output["success"] = are_results_passing(results)

    # Set the event info so that the engine will process configuration events from this plugin
    for result in results:
        output["event_info"][result["id"]] = result
        output["event_info"][result["id"]]["hash"] = hash

    return output


def destructure_repo(full_repo):
    try:
        owner, repo = full_repo.split("/", 1)
        return (owner, repo)
    except ValueError as err:
        raise Exception(f'Invalid repo, "{full_repo}". Expected format is <owner>/<repo>') from err


def are_results_passing(results):
    return all(map(lambda check: check["pass"], results))


def get_config_from_args(args, output, service, owner, repo):
    if args.config:
        return args.config
    else:
        output["alerts"].append(f"No config found for '{service}/{owner}/{repo}'. Using default config")
        return DEFAULT_CONFIG


if __name__ == "__main__":
    main()
