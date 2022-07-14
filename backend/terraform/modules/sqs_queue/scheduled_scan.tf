###############################################################################
# Scheduled Scan Queue
###############################################################################

resource "aws_sqs_queue" "scheduled-scan-queue" {
  name = "${var.app}-scheduled-scan-queue"

  tags = merge(
    var.tags,
    {
      Name = "Artemis Scheduled Scan Queue"
    }
  )
}

output "scheduled_scan_queue" {
  value = aws_sqs_queue.scheduled-scan-queue
}