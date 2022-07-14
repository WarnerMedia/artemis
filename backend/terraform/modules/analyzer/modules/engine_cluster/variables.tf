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

###############################################################################
# Cluster configuration
###############################################################################

variable "engine_ami" {
  description = "The AMI that the engine instances use"
  default = {
    # AMI IDs are region-specific
    # These are the IDs for amzn2-ami-kernel-5.10-hvm-2.0.20220426.0-x86_64-gp2
    "us-east-1" = "ami-0022f774911c1d690",
    "us-east-2" = "ami-0fa49cc9dc8d62c84",
    "us-west-1" = "ami-02541b8af977f6cdd",
    "us-west-2" = "ami-0ca285d4c2cda3300"
  }
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
  default     = 45
}

variable "engine_block_device" {
  description = "Engine instance volume block device"
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

variable "private_docker_repos_key" {
  description = "Secrets Manger key for Private Docker Repo information"
  default     = "private_docker_repos_key"
}

variable "plugin_java_heap_size" {
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
