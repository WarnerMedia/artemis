# Repo Queue Lambda

## Overview

The `Repo Queue Lambda` is triggered when messages enter the [`ORG SQS Queue`](https://github.com/WarnerMedia/artemis/blob/a3ecda5f7bf07bc8ff726b55452a82d493c6c1aa/orchestrator/terraform/modules/heimdall/messaging.tf#L5-L19).

After a message has been pulled from the Queue, it's processed by the `Repo Queue Lambda` and a message is sent to the [`Repo SQS Queue`](https://github.com/WarnerMedia/artemis/blob/a3ecda5f7bf07bc8ff726b55452a82d493c6c1aa/orchestrator/terraform/modules/heimdall/messaging.tf#L34-L47) for final processing.

The messages sent to the `REPO SQS Queue` are in [this format](../../README.md#repo-sqs-queue-message-format)

## Configuration

### Environment Variables

| Variable     | Description                                                            |
| ------------ | ---------------------------------------------------------------------- |
| `ORG_QUEUE`  | URL of the `ORG SQS Queue`. This Lambda reads messages from this queue |
| `REPO_QUEUE` | URL of the `REPO SQS Queue`. This Lambda sends messages to this queue  |

### Lambda Layers

The repo queue lambda depends on these libraries:

- [`heimdall_repos`](../layers/heimdall_repos/)
- [`heimdall_utils`](../layers/heimdall_utils/)
