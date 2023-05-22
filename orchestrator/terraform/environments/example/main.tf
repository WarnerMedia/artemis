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

locals {
  tags = {
    application = "heimdall"
    environment = "DEPLOYMENT_NAME"
  }
  app                 = "heimdall"
  environment         = "DEPLOYMENT_NAME"
  version             = "1.0.0"
  region              = "REGION_NAME"
  artemis_region      = "REGION_NAME"
  profile             = "AWS_PROFILE_NAME"
  domain_name         = "ROUTE53_DOMAIN_NAME"
  domain_zone_id      = "ROUTE53_ZONE_ID"
  lambda_architecture = "arm64"
  github_app_id       = "APP_ID"
  artemis_s3_bucket   = "ARTEMIS_S3_BUCKET"
  artemis_api         = "https://ARTEMIS_FQDN/api/v1"
}

provider "aws" {
  region  = local.region
  profile = "AWS_PROFILE_NAME"
}

module "heimdall" {
  source = "../../modules/heimdall"

  app                      = local.app
  ver                      = local.version
  environment              = local.environment
  aws_region               = local.region
  domain_name              = local.domain_name
  zone_id                  = local.domain_zone_id
  artemis_s3_bucket        = local.artemis_s3_bucket
  artemis_api              = local.artemis_api
  repo_scan_loop_rate      = "rate(1 minute)"
  lambda_availability_zone = "${local.region}a"
  db_read_capacity         = "5"
  db_write_capacity        = "5"

  tags = local.tags

  # GitHub App
  github_app_id = local.github_app_id

  scanning_enabled = false
}

module "example" {
  source                  = "../../modules/scheduler"
  app                     = module.heimdall.app
  org-queue-arn           = module.heimdall.org-queue-arn
  org-queue-function-name = module.heimdall.org-queue-function-name

  name        = "example"
  description = "Example scheduled scan"

  schedule_expression = "cron(0 0 ? * 0 *)"

  input = <<EOF
{
  "plugins": ["technology_discovery"],
  "default_branch_only": true,
  "batch_label": "example"
}
EOF

  enabled = false

}

output "repo-scan-table-name" {
  value = module.heimdall.repo-scan-table-name
}
