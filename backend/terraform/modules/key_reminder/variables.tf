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
  default     = "python3.12"
}

variable "s3_analyzer_files_id" {
  description = "ID of S3 Bucket where files are located"
  type        = string
}

variable "key_reminder_enabled" {
  description = "Whether to enable the Key Reminder"
  default     = false
  type        = bool
}

variable "key_reminder_email" {
  description = "Email Address to send Key Reminder emails from"
  type        = string
}

variable "key_reminder_ses_region" {
  description = "AWS Region where SES is configured to send from"
  type        = string
}

variable "domain" {
  description = "The Fully Qualified Domain Name for Artemis"
  type        = string
}

variable "maintenance_mode" {
  description = "Whether to enable the Key Reminder"
}

variable "datadog_environment_variables" {
  description = "Environment variables to configure datadog lambda_layers"
  type        = map(any)
  default     = {}
}

variable "lambda_layers" {
  description = "List of Lambda layers for the key_reminder Lambda"
  default     = []
}

variable "datadog_enabled" {
  description = "Whether Datadog monitoring should be enabled"
  type        = bool
  default     = false
}
