variable "app" {}

variable "ver" {
  description = "Application version"
}

variable "environment" {
  description = "Environment name"
}

variable "aws_region" {
  description = "The region in which to deploy"
}

variable "tags" {
  type = map(any)
}

variable "lambda_architecture" {
  description = "Architecture of lambda functions"
}

variable "lambda_runtime" {
  description = "Runtime of the lambda functions"
  default     = "python3.9"
}

variable "s3_analyzer_files_id" {}

variable "metadata_events_queue" {}

variable "metadata_events_enabled" {
  description = "Whether to enable the Metadata Events"
}

variable "datadog_lambda_variables" {
  description = "Environment variables to configure datadog lambda_layers"
}

variable "datadog_lambda_layers" {
  description = "Datadog Lambda layers"
}
variable "datadog_enabled" {
  description = "Whether Datadog monitoring should be enabled"
  type        = bool
}

