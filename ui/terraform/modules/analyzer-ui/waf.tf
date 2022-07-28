################################################################################
# WAF Web ACL
################################################################################

# Pull the origin protection header name and value JSON out of Secrets Manager
data "aws_secretsmanager_secret_version" "origin-header" {
  secret_id = "${var.backend_app}/origin-header"
}

# Decode the JSON to name and value
locals {
  origin-header = jsondecode(
    data.aws_secretsmanager_secret_version.origin-header.secret_string
  )
}

provider "aws" {
  alias   = "global"
  region  = "us-east-1" # Required for CLOUDFRONT scope
  profile = var.profile
}

resource "aws_wafv2_web_acl" "waf" {
  provider = aws.global
  name     = "${var.app}-${var.environment}"
  scope    = "CLOUDFRONT"

  default_action {
    block {}
  }

  rule {
    name     = "APIGatewayProxyRestriction"
    priority = 1

    action {
      allow {}
    }

    statement {
      byte_match_statement {
        search_string         = local.origin-header.value
        positional_constraint = "EXACTLY"
        field_to_match {
          single_header {
            name = local.origin-header.name
          }
        }
        text_transformation {
          priority = 1
          type     = "NONE"
        }
      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = false
      metric_name                = local.origin-header.name
      sampled_requests_enabled   = false
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = false
    metric_name                = local.origin-header.name
    sampled_requests_enabled   = false
  }
}
