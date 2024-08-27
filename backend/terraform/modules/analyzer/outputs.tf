output "engine_log_group_name" {
  value = module.public_engine_cluster.engine-log-group.name
}

output "repo_handler_function_name" {
  value = aws_lambda_function.repo-handler.function_name
}

output "pub_engine_subnet" {
  value = module.public_engine_cluster.subnet
}

output "nat_engine_subnet" {
  value = module.nat_engine_cluster.subnet
}

output "lambda_subnet" {
  value = aws_subnet.lambdas
}

output "lambda_security_group" {
  value = aws_security_group.lambda-sg
}

output "datadog_secret_arn" {
  value = aws_secretsmanager_secret.datadog-api-key.arn
}

output "backend_core_lambda_layer" {
  value = aws_lambda_layer_version.backend_core.arn
}
