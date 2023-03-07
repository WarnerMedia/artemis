# repo-health-cli

Tool for checking that github repositories are configured to meet a security baseline

- [repo-health-cli](#repo-health-cli)
  - [Getting set up](#getting-set-up)
    - [Environment Variables](#environment-variables)
      - [Authentication](#authentication)
      - [Configuration](#configuration)
    - [Installation](#installation)
    - [Test](#test)
    - [Building](#building)
  - [Usage](#usage)
    - [Set up environment variables](#set-up-environment-variables)
    - [Running](#running)
    - [Command-line arguments](#command-line-arguments)
  - [Configuration](#configuration-1)
    - [Omitted Fields](#omitted-fields)
    - [Loading configs](#loading-configs)
  - [Rules](#rules)
      - [Errors](#errors)
    - [Branch Commit Signing](#branch-commit-signing)
    - [Branch Enforce Admins](#branch-enforce-admins)
    - [Branch Pull Requests](#branch-pull-requests)
      - [Fields](#fields)
        - [`min_approvals`](#min_approvals)
        - [`expect`](#expect)
    - [Branch Status Checks](#branch-status-checks)
      - [Fields](#fields-1)
        - [`checks`](#checks)
        - [`expect`](#expect-1)
    - [Repo Actions](#repo-actions)
      - [Fields](#fields-2)
        - [`expect_any_of`](#expect_any_of)
          - [`enabled`](#enabled)
          - [`allowed_actions`](#allowed_actions)
          - [`selected_actions`](#selected_actions)
    - [Repo Code Scanning](#repo-code-scanning)
    - [Repo Files](#repo-files)
      - [Fields](#fields-3)
        - [`any_of`](#any_of)
        - [`all_of`](#all_of)
        - [`none_of`](#none_of)
    - [Repo Secret Scanning](#repo-secret-scanning)
      - [Fields](#fields-4)
        - [`require_push_protection`](#require_push_protection)
    - [Repo Security Alerts](#repo-security-alerts)

## Getting set up

### Environment Variables

`repo-health` uses environment variables for authentication and configuration.
They can either be directly in the environment or loaded from a `.env` file if
run through `pipenv` during development.

#### Authentication

`repo-health` can authenticate with either a github token or as a Github App.

**Either `GITHUB_TOKEN` or both `GITHUB_INSTALLATION_ID` and
*`GITHUB_INSTALLATION_PRIVATE_KEY` are required.**

To authenticate with a personal access token, put it in the `GITHUB_TOKEN`
environment variable:
```
GITHUB_TOKEN="<token>
```

To authenticate with a Github App, you must set the `GITHUB_INSTALLATION_ID` and
`GITHUB_INSTALLATION_PRIVATE_KEY` environment variables:
```
GITHUB_INSTALLATION_ID="<installation id>"
GITHUB_INSTALLATION_PRIVATE_KEY="<installation private key>"
```

#### Configuration

We go into more detail on configuration in the [Configuration
section](#configuration-1) later in this readme. For a quick summary, you can
also load configs through environment variables if you do not want to explicitly
set them each time `repo-health` is invoked. To do that, you can use either the
`RH_CONFIG_FILE` or `RH_GITHUB_CONFIG` environment variables for loading from a
local file or a file in a Github repository, respectively.

### Installation
```
make install-dev
```

### Test
```
make test
```

### Building
```
make build
```

## Usage

### Set up environment variables
Ensure that environment variables exist such that `repo-health` can authenticate
to Github. Use the same variables from the [Environment
Variables](#environment-variables) section above.

### Running
If installed through `make install` or `make install-dev`, pip will allow you
invoke repo-health directly via `repo-health`. Otherwise, you can run it with
`python src/cli.py`

```
repo-health <owner>/<repo>
```
For example,
```
repo-health warnermedia/artemis
```

### Command-line arguments

#### `-b`, `--branch` <!-- omit from toc -->
Specify the branch to run on. If this is omitted, `repo-health` will query
Github and use the default branch.

Example:
```
repo-health warnermedia/artemis --branch=dev
```

#### `-c`, `--config`, `--ghconfig` <!-- omit from toc -->
Specify the config to use. More info on the configuration format can be found in
the "Configuration" section of this README.

For `-c` and `--config`, the value should be the path to the JSON config file.
Alternatively, the path can be stored in the `RH_CONFIG_FILE` environment
variable instead. `--config` or `--ghconfig` will take precedence over
environment variables.

For `--ghconfig`, the value should be of the format
`<owner>/<repo>:path/to/rules.json`. Alternatively, the value can be stored in the
`RH_GITHUB_CONFIG` environment variable. `--config` or `--ghconfig` will take
precedence over environment variables.

If `--ghconfig` is used, the github credentials used by `repo-health` must have
sufficient permissions on the repo to read the provided file. The repo we check
against and the repo we get the config from can be different.

If none of `--config`, `--ghconfig`, or environment variables are set,
`repo-health` will use the default config stored in `default_config` in
`src/utilities/config.py`.

`--config` example:
```
repo-health --config=~/configs/open-source-rules.json warnermedia/artemis
```

`--ghconfig` example:
```
repo-health --ghconfig=owner/repo-health-configs:open-source-rules.json warnermedia/artemis
```

Environment variable example:
```
export RH_CONFIG_FILE="~/config/open-source-rules.json"

# Or, alternatively
# export RH_GITHUB_CONFIG="owner/repo-health-configs:open-source-rules.json"

repo-health warnermedia/artemis
```

#### `--json` <!-- omit from toc -->
Output in JSON. If using with `--verbose`, this might make the result sent to
stdout invalid JSON, so only mix the two when a human is consuming the result

Example:
```
repo-health warnermedia/artemis --json
```

#### `-v`, `--verbose` <!-- omit from toc -->
Output with more detail.

Example:
```
repo-health warnermedia/artemis -v
```

#### `--list-available-rules` <!-- omit from toc -->
List all rules that are available to be configured to run. This includes
everything you need to know to configure the check, including the expected
JSON schema of the config entry.

Example:
```
repo-health --list-available-rules
```

## Configuration
Configurations are of the following format:
```
{
    "name": "example",
    "description": "An example config. It is not strictly valid as it has comments and placeholders",
    "version": "1.0.0",
    "rules": [
        {
            # Type is required. Every object in the config must have a type
            "type": "<rule id>"
        },
        {
            "type": "<rule id>",

            # You can manually set the output `id` that will bubble up to
            # Artemis. If omitted, the output `id` will just be `type`, so this
            # is required if multiple rules of the same `type` are run
            "id": "branch_ci_required",

            # You can explicitly set a severity by specifying it here. This will
            # bubble up to Artemis
            "severity": "critical"

            # You can temporarily stop running a rule by setting 'enabled' to false.
            # You can also omit the rule altogether to achieve the same effect
            "enabled": false,
        },
        {
            "type": "branch_status_checks",
            "id": "branch_ci_required",

            # 'name' and 'description' are optional and will override the defaults.
            # They can be useful for adding additional context to rules
            #
            # In some cases, it might make sense to run multiple checks with the same type. In those cases,
            # overriding the id, name, and description is strongly encouraged
            "name": "Branch - Continuous Integration Required",
            "description": "Require that the CI jobs pass before pull requests can be merged",

            # 'required_checks' is a rule-specific configuration. Many rules have these.
            # You can examine the config schema for rules with `repo-health --list-available-rules`
            "checks": {
                "all_of": [
                    "ci/build",
                    "ci/test"
                ]
            }
        },
        {
            "type": "branch_pull_requests",

            # 'expect' is a common rule-specific configuration. It allows the config to specify more in-depth
            # configuration requirements by comparing the included keys and values directly against
            # the API response from Github.
            #
            # To figure out what values can be expected, go to `src/rules/<rule id>.py`.
            # The comments in that file will specify what Github API response it compares to
            "expect": {
                "dismiss_stale_reviews": true,
                "require_code_owner_reviews": true,
            }
        }
    ]
}
```
### Omitted Fields
Any field can be omitted. If a field is omitted, it will not factor into the
computation for the rule. By contrast, if a field is set to `false` in a config,
it may be explicitly required to be `false`, even if it's unintuitive for a
configuration to require the field to be false.

For example, the follow config would require that `dismiss_stale_reviews` is false.
```
{
    "type": "branch_pull_requests",
    "expect": {
        "dismiss_stale_reviews": false,
        ...
    }
}
```

It does not make much sense to do this from a security configuration
perspective. It would, however, make sense to allow any value there so that
teams can decide what is best for them. If the intent is to have the pull
requests rule ignore `dismiss_stale_reviews`, it should be omitted:
```
{
    "type": "branch_pull_requests",
    "expect": {
        ...
    }
}
```

### Loading configs
Refer to the `-c`, `--config`, and `--ghconfig` section above to learn more
about how configs are loaded

## Rules
Rules are checks that are run on the repositories.

#### Errors
If an error occurs while running a rule, it will automatically fail. In addition, its result will have an `error_message` field that contains information on what went wrong.

### Branch Commit Signing
For checking that a branch protection rule is enabled that enforces commit signing.

#### Example <!-- omit from toc -->
```
{
    "type": "branch_commit_signing"
}
```

### Branch Enforce Admins
Checks that a branch protection rule is enabled that enforces branch protection
for admins. Mapped to "Do not allow bypassing the above settings" in branch
protection rules in Github's UI

#### Example <!-- omit from toc -->
```
{
    "type": "branch_enforce_admins"
}
```

### Branch Pull Requests
For checking that a branch protection rule is enabled that requires pull requests.

#### Fields

##### `min_approvals`
Minimum number of approvals that must be configured. This should be a number

##### `expect`
Fields to expect in the response. Refer to fields within the
"required_pull_request_reviews" object in [Github's Get Branch Protection API
Endpoint](https://docs.github.com/en/rest/branches/branch-protection#get-branch-protection).

#### Example <!-- omit from toc -->
```
{
    "type": "branch_pull_requests",
    "min_approvals": 1,
    "expect": {
        "dismiss_stale_reviews": true,
        "require_code_owner_reviews": true,
    }
}
```

### Branch Status Checks
For checking that a branch protection rule is enabled that requires status
checks to pass on pull requests.

#### Fields

##### `checks`
An object containing `all_of`, `any_of`, and/or `none_of` fields that are each
arrays of strings. The check passes if all conditions of the subfields are met.

`all_of` - All of the fields in this array are names of status checks required
on pull requests into the branch

`any_of` - Any of the fields in this array are names of status checks required
on pull requests into the branch

`none_of` - None of the fields in this array are names of status checks required
on pull requests into the branch

##### `expect`
Fields to expect in the response. Refer to fields within the
"required_status_checks" object in [Github's Get Branch Protection API
Endpoint](https://docs.github.com/en/rest/branches/branch-protection#get-branch-protection).

#### Example <!-- omit from toc -->
```
{
    "type": "branch_status_checks",
    "checks": {
        "all_of": [
            "build",
            "test"
        ]
    },
    "expect": {
        "strict": true
    }
}
```

### Repo Actions
Checks that Github Actions are configured properly.

#### Fields

##### `expect_any_of`
Checks that the repository meets any of the included configs. `enabled` and
`allowed_actions` are grabbed from the [Get Github Actions
Permissions](https://docs.github.com/en/rest/actions/permissions?apiVersion=2022-11-28#get-github-actions-permissions-for-a-repository)
endpoint.

###### `enabled`
Github Actions are enabled on the repository

###### `allowed_actions`
The scope of allowed actions on the repository. Can be `all`, `local_only`, or `selected`

###### `selected_actions`
If `enabled=true` and `allowed_actions=selected` in the response from Github, we
also check for [selected
actions](https://docs.github.com/en/rest/actions/permissions?apiVersion=2022-11-28#get-allowed-actions-and-reusable-workflows-for-a-repository).

Selected actions have the following fields:
- `github_owned_allowed` - Actions owned by Github are allowed
- `verified_allowed` - Third party, but Github verified actions are allowed
- `patterns_allowed` - `all_of`, `any_of`, and `none_of` fields for the associated `patterns_allowed` field from the Github response. Of note, this does not evaluate any wildcards. It must be an exact string match, wildcard and all.

#### Example <!-- omit from toc -->
This example will be true if actions are disabled, actions are `local_only`, or
if only select actions are allowed, including github owned and verified actions.
```
{
    "type": "repo_actions",
    "expect_any_of": [
        {
            "enabled": false,
        },
        {
            "allowed_actions": "local_only"
        },
        {
            "enabled": true,
            "allowed_actions": "selected",
            "selected_actions": {
                "github_owned_allowed": true,
                "verified_allowed": true
            }
        }
    ]
}
```

### Repo Code Scanning
Checks that Github Advanced Security code scanning is enabled properly

#### Example <!-- omit from toc -->
```
{
    "type": "repo_code_scanning"
}
```

### Repo Files
Checks files on the default branch of the repository

#### Fields

##### `any_of`
Array of paths. Passes if any of the files exist on the default branch

##### `all_of`
Array of paths. Passes if all of the files exist on the default branch

##### `none_of`
Array of paths. Passes if none of the files exist on the default branch

#### Example <!-- omit from toc -->
```
{
    "type": "repo_files",
    "any_of": [
        "package.json",
        "Pipfile"
    ],
    "all_of": [
        ".github/CODEOWNERS"
    ],
    "none_of": [
        ".env"
    ]
}
```

### Repo Secret Scanning
Checks that Github Advanced Security secret scanning is enabled properly

#### Fields

##### `require_push_protection`
Requires that secret scanning push protection is enabled

#### Example <!-- omit from toc -->
```
{
    "type": "repo_secret_scanning",
    "require_push_protection": true
}
```

### Repo Security Alerts
Checks that Dependabot vulnerability alerts are enabled

#### Example <!-- omit from toc -->
```
{
    "type": "repo_security_alerts"
}
```
