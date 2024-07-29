# Redrive Lambda

Kicks off a DLQ redrive from the `org-deadletter-queues` or `repo-deadletter-queues` to move messages back to their original queues.

## Layers

-   heimdall_utils

## Event payload

```jsonc
{
    "source": "<Deadletter queue url>"
    "destination": "<repo-queue/org-queue url>",
}
```
