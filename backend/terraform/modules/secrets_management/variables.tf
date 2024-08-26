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

variable "log_level" {
  description = "Logging level"
  default     = "INFO"
}

variable "app" {}

variable "lambda_architecture" {
  description = "Architecture of lambda functions"
}

variable "lambda_runtime" {
  description = "Runtime of the lambda functions"
  default     = "python3.9"
}

variable "s3_analyzer_files_id" {}
variable "lambda_bundle_s3_key" {}

variable "secrets_queue" {}

variable "secrets_enabled" {
  description = "Whether to enable the Secrets Management process integration"
}

variable "scrub_details" {
  description = "Whether to scrub details from secret events"
  default     = "false"
}

variable "datadog_lambda_variables" {
  description = "Environment variables to configure datadog lambda_layers"
  type        = map(any)
  default     = {}
}

variable "datadog_lambda_layers" {
  description = "Datadog Lambda layers"
  type        = list(string)
  default     = []
}

variable "datadog_enabled" {
  description = "Whether Datadog monitoring should be enabled"
  type        = bool
  default     = false
}
