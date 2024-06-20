# Repo Scan Loop Lambda

This Lambda triggers the [`REPO_SCAN Lambda`](../repo_scan/) to read from the `REPO SQS Queue`. This helps to reduce the risk of rate limits from external APIs when queuing multiple scans.

## Configuration

### Environment Variables

| Variable                    | Description                                                                                                                                              |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `HEIMDALL_INVOKE_COUNT`     | This defines how many times times the `REPO SCAN LOOP Lambda` should invoke the [`REPO_SCAN Lambda`](../repo_scan/). The Default value is 10 invocations |
| `HEIMDALL_REPO_SCAN_LAMBDA` | The URL of the [`REPO_SCAN Lambda`](../repo_scan/)                                                                                                       |

### Cloudwatch Event Rule

The Repo Scna Loop Lambda is triggered by a Cloudwatch Event. The configurations for the event can be updated by modifying the [repo-scan-loop-rate](https://github.com/WarnerMedia/artemis/blob/c529b00c667da5d3c83678f3e279f7a8c41c1b45/orchestrator/terraform/modules/heimdall/lambdas.tf#L433-L444)

### Lambda Layers

This lambda depends on these libraries:

- [`heimdall_utils`](../layers/heimdall_utils/)
