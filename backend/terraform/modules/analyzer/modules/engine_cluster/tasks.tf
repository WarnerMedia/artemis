resource "aws_sqs_queue" "task-queue" {
  name = "${var.app}-task-queue-${var.name}"

  tags = merge(
    var.tags,
    {
      Name = "Artemis Task Queue ${var.name}"
    }
  )
}

resource "aws_sqs_queue" "priority-task-queue" {
  name = "${var.app}-priority-task-queue-${var.name}"

  tags = merge(
    var.tags,
    {
      Name = "Artemis Priority Task Queue ${var.name}"
    }
  )
}
