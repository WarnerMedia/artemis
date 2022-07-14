resource "aws_sqs_queue" "report-queue" {
  name = "${var.app}-report-queue"

  visibility_timeout_seconds = 900

  tags = merge(
    var.tags,
    {
      Name = "Artemis Report Queue"
    }
  )
}

output "report_queue" {
  value = aws_sqs_queue.report-queue
}
