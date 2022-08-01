output "app" {
  value = var.app
}

output "org-queue-arn" {
  description = "ARN of the org-queue"
  value = aws_lambda_function.org-queue.arn
}

output "org-queue-function-name" {
  value = aws_lambda_function.org-queue.function_name
}