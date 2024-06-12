# Heimdall Repos Library

## Overview

Utility Library for processing messages in the Artemis `REPO_QUEUE` Lambda

## Supported Version Control Systems

This library supports processing messages for the following Version Control Systems:

| Version Control System | Repo Library                                                                                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Azure DevOps           | [ADORepoProcessor](https://github.com/WarnerMedia/artemis/blob/main/orchestrator/lambdas/layers/heimdall_repos/heimdall_repos/ado.py)                  |
| Bitbucket              | [ProcessBitbucketRepos](https://github.com/WarnerMedia/artemis/blob/main/orchestrator/lambdas/layers/heimdall_repos/heimdall_repos/bitbucket_utils.py) |
| Github                 | [ProcessGithubRepos](https://github.com/WarnerMedia/artemis/blob/main/orchestrator/lambdas/layers/heimdall_repos/heimdall_repos/github_utils.py)       |
| Gitlab                 | [ProcessGitlabRepos](https://github.com/WarnerMedia/artemis/blob/main/orchestrator/lambdas/layers/heimdall_repos/heimdall_repos/gitlab_utils.py)       |

## Development

### Important Functions

```
SERVICE_PROCESSOR.query()
```

### Local Testing

To run tests locally run:

```sh
make ...
```
