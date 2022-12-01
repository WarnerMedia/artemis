output "task_queue" {
  value = aws_sqs_queue.task-queue
}

output "priority_task_queue" {
  value = aws_sqs_queue.priority-task-queue
}

output "engine-role" {
  value = aws_iam_role.engine-role
}

output "engine-sec-group" {
  value = aws_security_group.engine-sec-group
}

output "engine-asg" {
  value = aws_autoscaling_group.engine-asg
}

output "engine-log-group" {
  value = aws_cloudwatch_log_group.engine-log-group
}

output "scale-down-assume-role" {
  value = aws_iam_role.scale-down-assume-role
}

output "subnet" {
  value = aws_subnet.subnet
}
