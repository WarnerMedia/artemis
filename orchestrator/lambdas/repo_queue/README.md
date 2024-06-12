# Repo Queue Lambda

## Overview

This Lambda processes messages in the [ORG SQS Queue](https://github.com/WarnerMedia/artemis/blob/a3ecda5f7bf07bc8ff726b55452a82d493c6c1aa/orchestrator/terraform/modules/heimdall/messaging.tf#L5-L19). The messages processed by this lambda are sent to the the [Repo SQS Queue](https://github.com/WarnerMedia/artemis/blob/a3ecda5f7bf07bc8ff726b55452a82d493c6c1aa/orchestrator/terraform/modules/heimdall/messaging.tf#L34-L47).

## Supported Version Control Systems

- [Azure DevOps](https://azure.microsoft.com/en-us/products/devops)
- [Bitbucket Cloud v2](https://bitbucket.org/product)
- [Bitbucket Enterprise Server v1](https://www.atlassian.com/software/bitbucket/enterprise)
- [GitHub](https://github.com/)
- [GitLab](https://about.gitlab.com/)

## Configuration

### Environment Variables

These variables are set in the terraform configuration for the repo-queue in [`terraform/modules/heimdall`]()

| Variable                            | Description |
| ----------------------------------- | ----------- |
| `APPLICATION`                       |             |
| `ARTEMIS_API`                       |             |
| `ARTEMIS_REVPROXY_DOMAIN_SUBSTRING` |             |
| `ARTEMIS_REVPROXY_SECRET`           |             |
| `ARTEMIS_REVPROXY_SECRET_REGION`    |             |
| `ARTEMIS_S3_BUCKET`                 |             |
| `HEIMDALL_GITHUB_PRIVATE_KEY`       |             |
| `HEIMDALL_GITHUB_APP_ID`            |             |
| `HEIMDALL_LOG_LEVEL`                |             |
| `ORG_QUEUE`                         |             |
| `REGION`                            |             |
| `REPO_QUEUE`                        |             |

### `ORG_QUEUE` Message Format

Polls messages in the `ORG SQS Queue` in this format:

```json
{
    ""
}
```

### `REPO_QUEUE` Message Format

```json
{
  "": ""
}
```

## Deployment

### Lambda Layers

- [`heimdall_repos`]()
- [`heimdall_utils`]()
