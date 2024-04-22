###############################################################################
# Event Stream Queues
###############################################################################

resource "aws_sqs_queue" "event-queue" {
  name = "${var.app}-event-queue"

  tags = merge(
    var.tags,
    {
      Name = "Artemis Event Queue"
    }
  )
}

resource "aws_sqs_queue" "secrets-queue" {
  name = "${var.app}-secrets-queue"

  tags = merge(
    var.tags,
    {
      Name = "Artemis Secrets Management Process Queue"
    }
  )
}

resource "aws_sqs_queue" "audit-event-queue" {
  name = "${var.app}-audit-event-queue"

  tags = merge(
    var.tags,
    {
      Name = "Artemis Audit Log Event Queue"
    }
  )
}

resource "aws_sqs_queue" "metadata-events-queue" {
  name = "${var.app}-metadata-events-queue"

  tags = merge(
    var.tags,
    {
      Name = "Artemis Metadata Events Queue"
    }
  )
}

output "event_queue" {
  value = aws_sqs_queue.event-queue
}

output "secrets_queue" {
  value = aws_sqs_queue.secrets-queue
}

output "audit_event_queue" {
  value = aws_sqs_queue.audit-event-queue
}

output "metadata_events_queue" {
  value = aws_sqs_queue.metadata-events-queue
}
