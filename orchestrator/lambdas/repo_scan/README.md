# Repo Scan Lambda

This lambda pulls messages from the `Repo SQS Queue` and submits each message to the [`Artemis Repo API`](../../../backend/lambdas/api/repo/) to queue a scan for the repo & branch.

## Configuration

### Environment Variables

| Variable                 | Description                                                                             |
| ------------------------ | --------------------------------------------------------------------------------------- |
| `ARTEMIS_API_KEY`        | API Key for accessing the Artemis rest API                                              |
| `SCAN_DEPTH`             | The depth into the commit history supported plugins should search, relative to the HEAD |
| `SCAN_TABLE`             | The ID of the DynamoDB table where batch scans are stored                               |
| `REPO_QUEUE`             | The URL of the `REPO SQS Queue`                                                         |
| `REPO_DEAD_LETTER_QUEUE` | The URL of the `REPO Deadletter Queue`                                                  |

### Lambda Layers

This lambda depends on these libraries:

-   [`heimdall_utils`](../layers/heimdall_utils/)
