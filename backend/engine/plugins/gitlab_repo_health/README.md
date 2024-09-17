# gitlab_repo_health

Artemis Plugin for checking that GitLab repositories are configured to meet a security baseline

## Testing

Tests are included in `artemis/engine/tests`

## Configuration

Configurations are of the following format:

```jsonc
{
    "name": "example",
    "description": "An example config. It is not strictly valid as it has comments and placeholders",
    "version": "1.0.0",
    "rules": [
        {
            // Type is required. Every object in the config must have a type
            "type": "<rule id>"
        },
        {
            "type": "<rule id>",

            // You can manually set the output `id` that will bubble up to
            // Artemis. If omitted, the output `id` will just be `type`, so this
            // is required if multiple rules of the same `type` are run
            "id": "branch_ci_required",

            // You can explicitly set a severity by specifying it here. This will
            // bubble up to Artemis
            "severity": "critical"

            // You can temporarily stop running a rule by setting 'enabled' to false.
            // You can also omit the rule altogether to achieve the same effect
            "enabled": false,
        },
        {
            "type": "branch_status_checks",
            "id": "branch_ci_required",

            // 'name' and 'description' are optional and will override the defaults.
            // They can be useful for adding additional context to rules
            //
            // In some cases, it might make sense to run multiple checks with the same type. In those cases,
            // overriding the id, name, and description is strongly encouraged
            "name": "Branch - Continuous Integration Required",
            "description": "Require that the CI jobs pass before pull requests can be merged",

            // 'required_checks' is a rule-specific configuration. Many rules have these.
            // You can examine the config schema for rules with `repo-health --list-available-rules`
            "checks": {
                "all_of": [
                    "ci/build",
                    "ci/test"
                ]
            }
        },
        {
            "type": "branch_pull_requests",

            // 'expect' is a common rule-specific configuration. It allows the config to specify more in-depth
            // configuration requirements by comparing the included keys and values directly against
            // the API response from GitLab.
            //
            // To figure out what values can be expected, go to `src/rules/<rule id>.py`.
            // The comments in that file will specify what GitLab API response it compares to
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

```json
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

```json
{
    "type": "branch_protection_pull_requests",
    "expect": {
        ...
    }
}
```

## Rules

Rules are checks that are run on the repositories.

### Errors

If an error occurs while running a rule, it will automatically fail. In addition, its result will have an `error_message` field that contains information on what went wrong.

### Composite Rules

Composite rules are rules that are made up of other rules, rather
than performing a check against GitLab itself.

They are useful for combining other rules into a new rule. For example, it can be used to have a
single "Branch - Commit Signing" rule that checks for either a branch protection rule or a branch
rule that requires commit signing on a repository.

Because composite rules do not perform any checks themselves, their default `id`, `name`, and
`description` are placeholders and should always be set in configs.

#### Fields

##### `subrules`

`subrules` defines the logic around the other rules that are being run. It has three fields, `all_of`, `any_of` or
`none_of`. Each is an array of rules.

`all_of` - Passes if all of the rules in this array pass.

`any_of` - Passes if any of the rules in this array pass.

`none_of` - Passes if none of the rules in this array pass.

#### Example <!-- omit from toc -->

```json
{
    "type": "composite_rule",
    "id": "branch_commit_signing",
    "name": "Branch - Commit Signing",
    "description": "Branch rule or branch protection rule is enabled to enforce commit signing",
    "subrules": {
        "any_of": [
            {
                "type": "branch_protection_commit_signing"
            },
            {
                "type": "branch_rule_commit_signing"
            }
        ]
    }
}
```

### Branch Protection Commit Signing

For checking that a branch protection rule is enabled that enforces commit signing.

#### Example <!-- omit from toc -->

```json
{
    "type": "branch_protection_commit_signing"
}
```

### Branch Protection Prevent Secret Files

For checking that a branch protection rule is enabled to prevent pushing secret files.

#### Example <!-- omit from toc -->

```json
{
    "type": "branch_protection_prevent_secret_files"
}
```

### Branch Protection Enforce Admins

Checks that a branch protection rule is enabled that enforces branch protection
for admins. Mapped to "Allowed to force push" in protected branches in GitLab's UI

#### Example <!-- omit from toc -->

```json
{
    "type": "branch_protection_enforce_admins"
}
```

### Branch Protection Pull Requests

For checking that a branch protection rule is enabled that requires pull requests.

#### Fields

##### `min_approvals`

Minimum number of approvals that must be configured. This should be a number

##### `expect`

Fields to expect in the response. Refer to fields within the
response object in [GitLab's Project-level MR approvals API
Endpoint](https://docs.gitlab.com/ee/api/merge_request_approvals.html#project-level-mr-approvals).

#### Example <!-- omit from toc -->

```json
{
    "type": "branch_protection_pull_requests",
    "min_approvals": 1,
    "expect": {
        "merge_requests_author_approval": true,
        "reset_approvals_on_push": true,
    }
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

```json
{
    "type": "repo_files",
    "any_of": [
        "package.json",
        "Pipfile"
    ],
    "all_of": [
        ".gitlab/CODEOWNERS"
    ],
    "none_of": [
        ".env"
    ]
}
```
