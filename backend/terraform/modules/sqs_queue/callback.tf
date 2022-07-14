resource "aws_sqs_queue" "callback-queue" {
  name = "${var.app}-callback-queue"

  tags = merge(
    var.tags,
    {
      Name = "Artemis Callback Queue"
    }
  )
}

output "callback_queue" {
  value = aws_sqs_queue.callback-queue
}
