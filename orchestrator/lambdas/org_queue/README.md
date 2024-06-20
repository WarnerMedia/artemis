# Heimdall Orgs Library

## Overview

This lambda processes the organizations in all the version control systems and sends them to the `ORG SQS Queue` for further processing. The messages sent to the `ORG SQS Queue` are in [this format](../../README.md#org-sqs-queue-message-format)

The list of version control systems are defined in the [`services.json`](../../../backend/services.json) file. this list can be overwritten by specifying the `"scan_orgs"` field in the Lambda invocation message.

To trigger this lambda, invoke this function with a message in this format:

```jsonc
{
  // "scan_orgs": is a List that identifies which organizations should be scanned.
  // When this field is defined, it will overwrite the default list.
  // The default list is all organizations in the services.json file
  "scan_orgs": [],

  // "exclude_orgs": is a List of organizations that should not be scanned.
  // When used, it will exclude any organizations in the services.json file
  // The scan_orgs list is not used when this field is defined
  "exclude_orgs": [],

  // "redundant_scan_query": This is a query dictionary that's sent to the Artemis search/scans Endpoint
  // This query determines if a repo or branch should be skipped if the query returns a positive result
  // The parameters that can be used in this dictionary are defined in the parameters section for the search/scans endpoint
  // https://github.com/WarnerMedia/artemis/blob/c529b00c667da5d3c83678f3e279f7a8c41c1b45/backend/lambdas/api/spec.yaml#L1570-L1598
  "redundant_scan_query": {
    "plugin__icontains": "trufflehog",
    "<parameter>": "<value>"
  },

  // "default_branch_only": When true, only scans for the default branch will be Queued.
  // When set to false, All branches in each repo will be queued for scanning
  "default_branch_only": false
}
```

## Configuration

### Environment Variables

| Variable    | Description                                                                                   |
| ----------- | --------------------------------------------------------------------------------------------- |
| `ORG_QUEUE` | URL of the `ORG SQS Queue`. Messages processed by this lambda are sent to the `ORG SQS Queue` |

### Lambda Layers

The org queue lambda depends on these libraries:

- [`heimdall_orgs`](../layers/heimdall_orgs/)
- [`heimdall_utils`](../layers/heimdall_utils/)

### Cloudwatch Event

This lambda is triggered by a cloudwatch event. [Here's an example of a cloudwatch event for this lambda](https://github.com/WarnerMedia/artemis/blob/c529b00c667da5d3c83678f3e279f7a8c41c1b45/orchestrator/terraform/environments/example/main.tf#L64-L81)
