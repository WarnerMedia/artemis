output "app" {
  value = var.app
}

output "org-queue-arn" {
  description = "ARN of the org-queue"
  value       = aws_lambda_function.org-queue.arn
}

output "org-queue-function-name" {
  value = aws_lambda_function.org-queue.function_name
}

output "datadog_secret_arn" {
  value = aws_secretsmanager_secret.datadog-api-key.arn
}

output "heimdall_core_lambda_layer" {
  value       = data.aws_lambda
  description = "The ARN for the Latest version of the Heimdall Core Lambda Layer"
}
