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
