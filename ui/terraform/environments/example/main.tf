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
      version = "3.6.0"
    }
  }
}

locals {
  tags = {
    application = "artemis-ui"
    environment = "DEPLOYMENT_NAME"
  }
  app         = "artemis-ui"
  region      = "REGION_NAME"
  environment = "DEPLOYMENT_NAME"
  profile     = "AWS_PROFILE_NAME"
}

provider "aws" {
  region  = local.region
  profile = local.profile
}

module "analyzer-ui" {
  source = "../../modules/analyzer-ui"

  app         = local.app
  environment = local.environment
  tags        = local.tags
  profile     = local.profile
}

output "cloudfront_url" {
  value = "https://${module.analyzer-ui.cloudfront_distribution.domain_name}"
}

output "cloudfront_distribution" {
  value = module.analyzer-ui.cloudfront_distribution.id
}

output "s3_bucket" {
  value = module.analyzer-ui.s3_bucket
}
