variable "app" {}

###############################################
# Alarm Config Variables
################################################

variable "repo_handler_error_threshold" {
  description = "The threshold of errors reported by the repo handler lambda to trigger a cloudwatch alarm"
}

variable "repo_handler_error_period" {
  description = "The period for tracking errors in the repo handler cloudwatch alarm"
}

variable "engine_error_period" {
  description = "The period for tracking errors in the engine error logs for cloudwatch alarm"
}

variable "engine_error_threshold" {
  description = "The threshold for tracking errors in the engine error logs for cloudwatch alarm"
}

variable "engine_error_pattern" {
  description = "The pattern for the error metric filter on the engine logs"
}

variable "engine_log_group_name" {
  description = "The name of the engine log group"
}

variable "repo_handler_function_name" {
  description = "The repo handler lambda function name"
}
