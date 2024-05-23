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

variable "profile" {
  description = "AWS profile"
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

variable "db_engine_version" {
  description = "RDS database engine version"
  type        = string
  default     = "11"
}

variable "db_parameter_group_family" {
  description = "RDS database parameter group family"
  type        = string
  default     = null
}

variable "db_ca_cert_identifier" {
  description = "Certificate authority ID"
  type        = string
  default     = "rds-ca-2019"
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

variable "email_domain_aliases" {
  description = "Map old email domain(s) to a new domain, with optional transformation that applies to local part of email"
  type = list(object({
    new_domain  = string
    old_domains = list(string)
    email_transformation = optional(
      object({
        new_email_regex = string
        old_email_expr  = string
      })
    )
  }))
  default = []
}

###############################################################################
# Environment-agnostic variables
#
# The default value should be correct for any environment and not need to be
# overridden.
###############################################################################

variable "app" {}

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

###############################################
# SQS Variables
################################################

variable "callback_queue_arn" {}

variable "secrets_queue" {}

variable "event_queue" {}

variable "report_queue" {}

variable "audit_event_queue" {}

variable "scheduled_scan_queue" {}

variable "metadata_events_queue" {}

################################################
# Feature Control
################################################

variable "aqua_enabled" {}

variable "veracode_enabled" {}

variable "snyk_enabled" {}

variable "ghas_enabled" {}

variable "secrets_enabled" {
  description = "Whether to enable the Secrets Management process integration"
}

variable "private_docker_repos_key" {
  description = "Secrets Manger key for Private Docker Repo information"
}

variable "plugin_java_heap_size" {
  default = "2g"
}

variable "mandatory_include_paths" {
  description = "Repository paths that cannot be excluded from scans"
  type        = list(string)
  default     = []
}

variable "metadata_scheme_modules" {
  description = "CSV list of metadata processing modules"
  default     = ""
}

variable "metadata_formatter_module" {
  description = "Metadata formatter module"
  default     = ""
}

variable "custom_filtering_module" {
  description = "Custom API filtering module"
  default     = ""
}

variable "additional_event_routing" {
  description = "JSON dict defining additional event routing"
  default     = "{}"
}

variable "default_scope" {
  description = "List of scopes to automatically set for new users"
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

variable "audit_log_scrub_details" {
  description = "Whether to scrub details from audit log messages"
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

################################################
# Lambda Customization
################################################

variable "extra_lambda_layers_json_report" {
  description = "Extra layers that should be applied to the JSON report lambda"
  type        = list(string)
  default     = []
}

variable "extra_lambda_layers_pdf_report" {
  description = "Extra layers that should be applied to the PDF report lambda"
  type        = list(string)
  default     = []
}

variable "extra_lambda_layers_report_cleanup" {
  description = "Extra layers that should be applied to the report cleanup lambda"
  type        = list(string)
  default     = []
}

variable "extra_lambda_layers_sbom_report" {
  description = "Extra layers that should be applied to the SBOM report lambda"
  type        = list(string)
  default     = []
}

variable "extra_lambda_layers_groups_handler" {
  description = "Extra layers that should be applied to the groups handler lambda"
  type        = list(string)
  default     = []
}

variable "extra_lambda_layers_groups_members_handler" {
  description = "Extra layers that should be applied to the groups members handler lambda"
  type        = list(string)
  default     = []
}

variable "extra_lambda_layers_groups_keys_handler" {
  description = "Extra layers that should be applied to the groups keys handler lambda"
  type        = list(string)
  default     = []
}

variable "extra_lambda_layers_groups_scans_batch_handler" {
  description = "Extra layers that should be applied to the scans batch handler lambda"
  type        = list(string)
  default     = []
}

variable "extra_lambda_layers_update_github_org_users" {
  description = "Extra layers that should be applied to the update GitHub org users lambda"
  type        = list(string)
  default     = []
}

variable "extra_lambda_layers_search_repositories_handler" {
  description = "Extra layers that should be applied to the search repositories handler lambda"
  type        = list(string)
  default     = []
}

variable "extra_lambda_layers_search_scans_handler" {
  description = "Extra layers that should be applied to the search scans handler lambda"
  type        = list(string)
  default     = []
}

variable "extra_lambda_layers_search_vulnerabilities_handler" {
  description = "Extra layers that should be applied to the search vulnerabilities handler lambda"
  type        = list(string)
  default     = []
}

variable "extra_lambda_layers_system_allowlist_handler" {
  description = "Extra layers that should be applied to the system allowlist handler lambda"
  type        = list(string)
  default     = []
}

variable "extra_lambda_layers_system_services_handler" {
  description = "Extra layers that should be applied to the system services handler lambda"
  type        = list(string)
  default     = []
}

variable "extra_lambda_layers_system_status_handler" {
  description = "Extra layers that should be applied to the system status handler lambda"
  type        = list(string)
  default     = []
}

variable "extra_lambda_layers_sbom_components_handler" {
  description = "Extra layers that should be applied to the SBOM components handler lambda"
  type        = list(string)
  default     = []
}

variable "extra_lambda_layers_sbom_licenses_handler" {
  description = "Extra layers that should be applied to the SBOM licenses handler lambda"
  type        = list(string)
  default     = []
}

variable "extra_lambda_layers_db_cleanup" {
  description = "Extra layers that should be applied to the DB cleanup lambda"
  type        = list(string)
  default     = []
}

variable "extra_lambda_layers_ci_tools_handler" {
  description = "Extra layers that should be applied to the CI tools handler lambda"
  type        = list(string)
  default     = []
}

variable "extra_lambda_layers_api_authorizer" {
  description = "Extra layers that should be applied to the API authorizer lambda"
  type        = list(string)
  default     = []
}

variable "extra_lambda_layers_scan_scheduler" {
  description = "Extra layers that should be applied to the scan scheduler lambda"
  type        = list(string)
  default     = []
}

variable "extra_lambda_layers_scheduled_scan_handler" {
  description = "Extra layers that should be applied to the scheduled scan handler lambda"
  type        = list(string)
  default     = []
}

variable "extra_lambda_layers_engine_scale_down" {
  description = "Extra layers that should be applied to the engine scale down lambda"
  type        = list(string)
  default     = []
}

variable "extra_lambda_layers_repo_handler" {
  description = "Extra layers that should be applied to the repo handler lambda"
  type        = list(string)
  default     = []
}

variable "extra_lambda_layers_users_handler" {
  description = "Extra layers that should be applied to the users handler lambda"
  type        = list(string)
  default     = []
}

variable "extra_lambda_layers_users_keys_handler" {
  description = "Extra layers that should be applied to the users keys handler lambda"
  type        = list(string)
  default     = []
}

variable "extra_lambda_layers_users_services_handler" {
  description = "Extra layers that should be applied to the users services handler lambda"
  type        = list(string)
  default     = []
}

variable "extra_lambda_layers_signin_handler" {
  description = "Extra layers that should be applied to the signin handler lambda"
  type        = list(string)
  default     = []
}

variable "extra_lambda_layers_scans_batch_handler" {
  description = "Extra layers that should be applied to the scans batch handler lambda"
  type        = list(string)
  default     = []
}

variable "extra_lambda_layers_license_retriever" {
  description = "Extra layers that should be applied to the license retriever lambda"
  type        = list(string)
  default     = []
}

variable "extra_env_vars_event_dispatch" {
  description = "Extra environment variables to configure for the event dispatch lambda"
  type        = map(string)
  default     = {}
}

variable "extra_event_dispatch_queues" {
  description = "Extra SQS queues the event dispatch lambda needs write permissions on"
  type        = list(string)
  default     = []
}

################################################
# Public Engine Cluster Customization
################################################

variable "pub_engine_size" {
  default = "m5.large"
}

variable "engine_scale_min_public" {
  description = "Minimum number of engines to run in the group"
  default     = 1
}

variable "engine_scale_max_public" {
  description = "Maximum number of engines to run in the group"
  default     = 2
}

variable "pub_plugin_java_heap_size" {
  default = "2g"
}

################################################
# NAT Engine Cluster Customization
################################################

variable "nat_engine_size" {
  default = "m5.large"
}

variable "engine_scale_min_nat" {
  description = "Minimum number of engines to run in the group"
  default     = 1
}

variable "engine_scale_max_nat" {
  description = "Maximum number of engines to run in the group"
  default     = 2
}

variable "nat_plugin_java_heap_size" {
  default = "2g"
}
