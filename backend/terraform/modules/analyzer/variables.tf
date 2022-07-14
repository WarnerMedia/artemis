###############################################################################
# Environment-specific variables
#
# These must be set to the specific environment and so do not have defaults.
###############################################################################

variable "ver" {
  description = "Application version"
}

variable "environment" {
  description = "Environment name"
}

variable "aws_region" {
  description = "The region in which to deploy"
}

variable "availability_zone" {
  description = "The AZ in which to deploy NAT engine EC2s"
}

variable "lambda_availability_zone" {
  description = "The AZ in which to deploy VPC Lambdas"
}

variable "database_availability_zones" {
  description = "The AZs to deploy the database"
}

variable "tags" {
  type = map(any)
}

variable "domain_name" {
  description = "Domain to associate with the ACM certificate."
}

variable "alternative_names" {
  description = "Alternative domains to put in the ACM certificate"
  default     = []
}

variable "zone_map" {
  description = "Mapping of DNS names to zone IDs"
  type        = map(any)
}

variable "api_stage" {
  description = "API stage name"
}

variable "db_kms_key" {
  description = "KMS key ID for database encryption"
}

variable "db_instance_type" {
  description = "RDS instance type"
}

variable "ui_origin_url" {
  description = "Origin URL for the UI"
}

variable "cognito_domain" {
  description = "Cognito user pool domain name"
}

variable "cognito_app_id" {
  description = "Cognito client app ID"
}

variable "cognito_pool_id" {
  description = "Cognito user pool ID"
}

variable "cognito_region" {
  description = "Region Cognito resides in"
  default     = "us-east-1"
}

variable "identity_provider" {
  description = "Name of the WarnerMedia Cognito identity provider"
}

variable "provision_form_url" {
  description = "The URL to the form which users use to request access"
}

variable "log_level" {
  description = "Logging level"
  default     = "INFO"
}

variable "maintenance_mode" {
  description = "Whether Artemis is in maintenance mode"
}

variable "maintenance_mode_message" {
  description = "Message to accompany maintenance mode"
}

variable "maintenance_mode_retry_after" {
  description = "ISO 8601 timestamp of when maintenance mode is estimated to end"
}

###############################################################################
# Environment-agnostic variables
#
# The default value should be correct for any environment and not need to be
# overridden.
###############################################################################

variable "app" {}

variable "engine_size" {
  default = "m5.large"
}

variable "pub_engine_size" {
  default = "m5.large"
}

variable "database_cidrs" {
  description = "CIDRs for the Artemis Database"
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "nat_gw_cidr" {
  description = "CIDR for the API Lambdas"
  default     = "10.0.15.0/24"
}

variable "lambda_cidr" {
  description = "CIDR for the API Lambdas"
  default     = "10.0.16.0/20"
}

variable "lambda_architecture" {
  description = "Architecture of lambda functions"
}

variable "lambda_runtime" {
  description = "Runtime of the lambda functions"
  default     = "python3.9"
}

variable "vpc_id" {}

variable "vpc_route_table_id" {}

variable "s3_analyzer_files_id" {}

variable "s3_analyzer_files_arn" {}

variable "s3_analyzer_files_bucket" {}

###############################################
# SQS Variables
################################################
variable "callback_queue_arn" {}

variable "secrets_queue" {}

variable "event_queue" {}

variable "report_queue" {}

variable "audit_event_queue" {}

variable "scheduled_scan_queue" {}

################################################
# Feature Control
################################################
variable "aqua_enabled" {}

variable "veracode_enabled" {}

variable "snyk_enabled" {}

variable "secrets_enabled" {
  description = "Whether to enable the Secrets Management process integration"
}

variable "private_docker_repos_key" {
  description = "Secrets Manger key for Private Docker Repo information"
}

variable "plugin_java_heap_size" {
  default = "2g"
}

variable "pub_plugin_java_heap_size" {
  default = "2g"
}

################################################
# GitHub App
################################################
variable "github_app_id" {}

################################################
# Heimdall Scan Schedules
################################################
variable "heimdall_scans_cron" {
  description = "List of cron schedules for Heimdall scans to enable pre-scaling of engine clusters"
  type        = list(string)
  default     = []
}

################################################
# Secrets
################################################

variable "service-integrations" {
  description = "List of service integrations"
  type        = list(any)
}
