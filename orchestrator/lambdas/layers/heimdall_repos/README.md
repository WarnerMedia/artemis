# Heimdall Repos Library

## Overview

This is a Lambda layer for the [`REPO_QUEUE_LAMBDA`](../../repo_queue/).

It's used for processing repositories in different version control systems.

## Supported Version Control Systems

| Version Control System | Repo Processor Library                                                                 |
| ---------------------- | -------------------------------------------------------------------------------------- |
| Azure DevOps           | [ADORepoProcessor](../../layers/heimdall_repos/heimdall_repos/ado.py)                  |
| Bitbucket              | [ProcessBitbucketRepos](../../layers/heimdall_repos/heimdall_repos/bitbucket_utils.py) |
| Github                 | [ProcessGithubRepos](../../layers/heimdall_repos/heimdall_repos/github_utils.py)       |
| Gitlab                 | [ProcessGitlabRepos](../../layers/heimdall_repos/heimdall_repos/gitlab_utils.py)       |

## Development

### Important Functions

```python
REPO_PROCESSOR_LIBRARY.query() # Returns a list of repos and branches to scan
```
