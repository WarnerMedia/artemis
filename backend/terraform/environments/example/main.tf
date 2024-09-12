terraform {
  backend "s3" {
    region         = "REGION_NAME"
    bucket         = "S3_BUCKET_NAME"
    key            = "STATE_FILE_S3_KEY"
    profile        = "AWS_PROFILE_NAME"
    dynamodb_table = "DYNAMO_DB_LOCK_TABLE_NAME"
  }
  required_providers {
    aws = {
      version = "3.64.2"
    }
  }
}

provider "aws" {
  region  = "REGION_NAME"
  profile = "AWS_PROFILE_NAME"
}

locals {
  tags = {
    application = "artemis"
    environment = "DEPLOYMENT_NAME"
  }
  vpc_cidr    = "10.0.0.0/16"
  app         = "artemis"
  region      = "REGION_NAME"
  environment = "DEPLOYMENT_NAME"
  version     = "2.0.0"
  zone_map = {
    "ARTEMIS_ROUTE53_FQDN" = "ROUTE53_ZONEID"
  }
  saml_role           = "AWS_PROFILE_NAME"
  aqua_enabled        = false
  veracode_enabled    = false
  snyk_enabled        = false
  lambda_architecture = "arm64"
  github_app_id       = "APP_ID"
}

module "vpc" {
  source   = "../../modules/vpc"
  tags     = local.tags
  vpc_cidr = local.vpc_cidr
}

module "s3" {
  source = "../../modules/s3"
  app    = local.app
  tags   = local.tags
}

module "sqs_queues" {
  source = "../../modules/sqs_queue"
  app    = local.app
  tags   = local.tags
}

module "iam" {
  source = "../../modules/IAM"
  app    = local.app
  tags   = local.tags
}

module "ecr" {
  source = "../../modules/ecr"
  app    = local.app
  for_each = {
    engine         = "Artemis Engine Image Repository",
    python         = "Artemis Python Image Repository",
    node           = "Artemis Node Image Repository",
    php            = "Artemis PHP Image Repository",
    dind           = "Artemis Docker-in-Docker Image Repository",
    golang         = "Artemis Golang Image Repository",
    java           = "Artemis Java Image Repository",
    swift          = "Artemis Swift Image Repository",
    ruby           = "Artemis Ruby Image Repository",
    db_maintenance = "Artemis DB Maintenance Image Repository"
  }
  repo      = each.key
  saml_role = local.saml_role
  tags = merge(
    local.tags,
    {
      Name = each.value
    }
  )
}

// If Veracode is not enabled, comment this out.
module "veracode_ecr" {
  source    = "../../modules/ecr"
  app       = local.app
  repo      = "veracode"
  saml_role = local.saml_role
  tags = merge(
    local.tags,
    {
      Name = "Artemis Veracode Image Repository"
    }
  )
}

module "analyzer" {
  source = "../../modules/analyzer"

  profile                     = "user-profile"
  app                         = local.app
  ver                         = local.version
  environment                 = local.environment
  aws_region                  = local.region
  availability_zone           = "${local.region}a"
  lambda_availability_zone    = "${local.region}a"
  lambda_architecture         = local.lambda_architecture
  domain_name                 = "ARTEMIS_ROUTE53_FQDN"
  alternative_names           = []
  api_stage                   = "v1"
  lambda_cidr                 = "10.0.32.0/20"
  db_kms_key                  = "arn:aws:kms:${local.region}:ACCOUNT_ID:key/KEY_ID"
  database_availability_zones = ["${local.region}a", "${local.region}d"]
  db_instance_type            = "db.r6g.2xlarge"
  database_cidrs              = ["10.0.2.0/24", "10.0.3.0/24"]
  ui_origin_url               = "https://artemis-ui.example.com"
  cognito_domain              = "COGNITO_DOMAIN"
  cognito_app_id              = "COGNITO_APP_ID"
  cognito_pool_id             = "COGNITO_POOL_ID"
  identity_provider           = "IDP"
  provision_form_url          = "PROVISIONING_FORM_URL"

  zone_map = local.zone_map

  tags                     = local.tags
  vpc_id                   = module.vpc.vpc_id
  vpc_route_table_id       = module.vpc.vpc_route_table_id
  s3_analyzer_files_arn    = module.s3.s3_analyzer_files_arn
  s3_analyzer_files_bucket = module.s3.s3_analyzer_files_bucket
  s3_analyzer_files_id     = module.s3.s3_analyzer_files_id
  callback_queue_arn       = module.sqs_queues.callback_queue.arn
  event_queue              = module.sqs_queues.event_queue
  secrets_queue            = module.sqs_queues.secrets_queue
  report_queue             = module.sqs_queues.report_queue
  audit_event_queue        = module.sqs_queues.audit_event_queue
  scheduled_scan_queue     = module.sqs_queues.scheduled_scan_queue
  metadata_events_queue    = module.sqs_queues.metadata_events_queue

  # Aqua config variables
  aqua_enabled = local.aqua_enabled

  # Veracode config variable
  veracode_enabled = local.veracode_enabled

  # Snyk config variable
  snyk_enabled = local.snyk_enabled

  # GitHub App
  github_app_id = local.github_app_id

  # Private Docker Repo Configs/Credentials key
  private_docker_repos_key = "private_docker_repo_creds"

  # Control of maintenance mode
  maintenance_mode             = var.maintenance_mode
  maintenance_mode_message     = var.maintenance_mode_message
  maintenance_mode_retry_after = var.maintenance_mode_retry_after

  # List of service integration names. These are referenced in the services.json config.
  service-integrations = []

  # Enable Forwarding for detected secrets
  secrets_enabled = false

  # GHAS config variable
  ghas_enabled = false
}

module "metric_alarms" {
  source = "../../modules/metric_alarms"

  app                          = local.app
  repo_handler_error_period    = "60"
  repo_handler_error_threshold = "10"
  engine_error_period          = "120"
  engine_error_threshold       = "10"
  engine_error_pattern         = "ERROR"

  engine_log_group_name      = module.analyzer.engine_log_group_name
  repo_handler_function_name = module.analyzer.repo_handler_function_name
}

/* Uncomment this if implementing a secrets management lambda
module "secrets_management" {
  source = "../../modules/secrets_management"

  app                  = local.app
  ver                  = local.version
  environment          = local.environment
  tags                 = local.tags
  lambda_architecture  = local.lambda_architecture
  s3_analyzer_files_id = module.s3.s3_analyzer_files_id
  lambda_bundle_s3_key = "lambdas/secrets_handler/v${local.version}/secrets_handler.zip"
  secrets_queue        = module.sqs_queues.secrets_queue
  secrets_enabled      = false
}
*/
