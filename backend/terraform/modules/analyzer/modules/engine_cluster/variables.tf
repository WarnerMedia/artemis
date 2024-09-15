###############################################################################
# General configuration
###############################################################################

variable "app" {
  description = "Appliction name"
}

variable "name" {
  description = "Cluster name"
}

variable "ver" {
  description = "Application version"
  default     = "2.0.0"
}

variable "aws_region" {
  description = "The region in which to deploy"
}

variable "availability_zone" {
  description = "The AZ in which to deploy engine EC2s"
}

variable "tags" {
  type = map(any)
}

variable "public" {
  description = "Whether the cluster runs in a public subnet"
  default     = true
}

variable "domain_name" {
  description = "FQDN of the Artemis deployment"
}

variable "revproxy_domain_substring" {
  description = "Base domain for the reverse proxy to access VCS, if used"
  default     = ""
}

variable "revproxy_secret" {
  description = "Secrets Manager item that contains the revproxy key"
  default     = "artemis/revproxy-api-key"
}

variable "revproxy_secret_region" {
  description = "AWS region containing the Secrets Manager item that contains the revproxy key"
  default     = "us-east-2"
}

variable "log_level" {
  description = "Logging level"
  default     = "INFO"
}

###############################################################################
# Cluster configuration
###############################################################################

variable "engine_ami" {
  description = "The AMI that the engine instances use"
}

variable "engine_scale_min" {
  description = "Minimum number of engines to run in the group"
  default     = 1
}

variable "engine_scale_max" {
  description = "Maximum number of engines to run in the group"
  default     = 2
}

variable "engine_scale_eval_periods" {
  description = "The number of evaluation periods for scaling alarms"
  default     = 1
}

variable "engine_scale_period" {
  description = "The period for scaling alarms in seconds"
  default     = 60
}

variable "engine_scale_up_threshold" {
  description = "The threshold of pending tasks per engine to scale up"
  default     = 10
}

variable "engine_scale_down_threshold" {
  description = "The threshold of pending tasks per engine to scale down"
  default     = 5
}

variable "engine_volume_size" {
  description = "Engine instance volume size"
  default     = 35
}

variable "repos_volume_size" {
  description = "Cloned repos volume size"
  default     = 35
}

variable "engine_block_device" {
  description = "Engine instance volume block device"
  default     = "/dev/sdf"
}

variable "repos_block_device" {
  description = "Engine instance volume block device for cloned repos"
  default     = "/dev/sdf"
}

variable "engine_log_retention" {
  description = "Engine log retention time (in days)"
  default     = 30
}

variable "docker_compose_ver" {
  description = "The version of docker-compose for the engine to use"
}

variable "maintenance_mode" {
  description = "Whether Artemis is in maintenance mode"
}

variable "engine_cidr" {
  description = "CIDR for the Artemis Engine"
}

variable "engine_size" {
  default = "m5.large"
}

variable "lambda_architecture" {
  description = "Architecture of lambda functions"
  default     = "arm64"
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

variable "system_status_lambda" {}

################################################
# Feature Control
################################################
variable "aqua_enabled" {}

variable "veracode_enabled" {}

variable "snyk_enabled" {}

variable "ghas_enabled" {}

variable "private_docker_repos_key" {
  description = "Secrets Manger key for Private Docker Repo information"
  default     = "private_docker_repos_key"
}

variable "plugin_java_heap_size" {
  default = "2g"
}

variable "metadata_scheme_modules" {
  description = "CSV list of metadata processing modules"
  default     = ""
}

variable "mandatory_include_paths" {
  description = "Repository paths that cannot be excluded from scans"
  type        = list(string)
  default     = []
}

variable "secrets_events_enabled" {
  description = "Whether to send secrets events to the event queue"
  default     = false
}

variable "inventory_events_enabled" {
  description = "Whether to send inventory events to the event queue"
  default     = false
}

variable "configuration_events_enabled" {
  description = "Whether to send configuration events to the event queue"
  default     = false
}

variable "vulnerability_events_enabled" {
  description = "Whether to send vulnerability events to the event queue"
  default     = false
}

variable "metadata_events_enabled" {
  description = "Whether to send metadata events to the event queue"
  default     = false
}

################################################
# GitHub App
################################################
variable "github_app_id" {}

################################################
# Heimdall Scan Schedules
################################################
variable "heimdall_scans_cron" {
  description = "List of cron schedules for Heimdall scans to enable pre-scaling of engine cluster"
  type        = list(string)
  default     = []
}

################################################
# Lambdas
################################################

variable "lambda_layers" {
  type = list(any)
}

variable "lambda_subnet" {}

variable "lambda_sg" {}

variable "datadog_environment_variables" {
  description = "Datadog Environment variables to configure the Datadog-Extension and Datadog-Library"
  type        = map(any)
  default     = {}
}

variable "datadog_enabled" {
  description = "Whether Datadog monitoring should be enabled"
  type        = bool
  default     = false
}
