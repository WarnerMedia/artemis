###############################################################################
# On demand API Endpoint and Path Configuration
###############################################################################

resource "aws_api_gateway_rest_api" "on_demand_api" {
  name        = "${var.app}-on-demand-api"
  description = "Heimdall On Demand API Endpoint"

  endpoint_configuration {
    types = ["REGIONAL"]
  }
}

resource "aws_api_gateway_api_key" "org-queue-key" {
  name = "${var.app}-org-queue-key"
}

resource "aws_api_gateway_usage_plan" "org_queue_usage" {
  name = "${var.app}-org-queue-usage-plan"

  api_stages {
    api_id = aws_api_gateway_rest_api.on_demand_api.id
    stage  = var.api_stage
  }
}

resource "aws_api_gateway_usage_plan_key" "org-queue-plan-key" {
  key_id        = aws_api_gateway_api_key.org-queue-key.id
  key_type      = "API_KEY"
  usage_plan_id = aws_api_gateway_usage_plan.org_queue_usage.id
}

resource "aws_api_gateway_resource" "on_demand" {
  rest_api_id = aws_api_gateway_rest_api.on_demand_api.id
  parent_id   = aws_api_gateway_rest_api.on_demand_api.root_resource_id
  path_part   = "on_demand"
}

resource "aws_api_gateway_method" "on_demand" {
  rest_api_id      = aws_api_gateway_rest_api.on_demand_api.id
  resource_id      = aws_api_gateway_resource.on_demand.id
  http_method      = "ANY"
  authorization    = "NONE"
  api_key_required = true
}

resource "aws_api_gateway_integration" "on_demand" {
  rest_api_id = aws_api_gateway_rest_api.on_demand_api.id
  resource_id = aws_api_gateway_method.on_demand.resource_id
  http_method = aws_api_gateway_method.on_demand.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.org-queue.invoke_arn
}

resource "aws_lambda_permission" "on_demand" {
  statement_id  = "apigw-allow-org-queue-lambda"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.org-queue.arn
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_stage.on_demand_api.execution_arn}/*/on_demand"
}

# Deployment

resource "aws_api_gateway_deployment" "on_demand_api" {
  depends_on = [
    aws_api_gateway_integration.on_demand,
  ]

  rest_api_id = aws_api_gateway_rest_api.on_demand_api.id
}

resource "aws_api_gateway_stage" "on_demand_api" {
  deployment_id = aws_api_gateway_deployment.on_demand_api.id
  rest_api_id   = aws_api_gateway_rest_api.on_demand_api.id
  stage_name    = var.api_stage
}

resource "aws_wafv2_web_acl" "on_demand_api" {
  name        = "${var.app}-on-demand-api-acl"
  description = "ACL for ${var.app} On-Demand API"
  scope       = "REGIONAL"

  default_action {
    allow {}
  }

  visibility_config {
    cloudwatch_metrics_enabled = false
    metric_name                = "${var.app}-on-demand-api-acl"
    sampled_requests_enabled   = false
  }

  tags = var.tags
}

resource "aws_wafv2_web_acl_association" "on_demand_api" {
  resource_arn = aws_api_gateway_stage.on_demand_api.arn
  web_acl_arn  = aws_wafv2_web_acl.on_demand_api.arn
}

###############################################################################
# Configure the certificate and domain name
###############################################################################

resource "aws_acm_certificate" "cert" {
  domain_name       = var.domain_name
  validation_method = "DNS"

  tags = merge(
    var.tags,
    {
      "Name" = "Heimdall Certificate"
    }
  )
}

resource "aws_route53_record" "cert_validation_dns_record" {
  for_each = {

    for dvo in aws_acm_certificate.cert.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
    }
  }
  name    = each.value.name
  records = [each.value.record]
  zone_id = var.zone_id
  type    = "CNAME"
  ttl     = 60
}

resource "aws_acm_certificate_validation" "cert_validation" {
  certificate_arn         = aws_acm_certificate.cert.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation_dns_record : record.fqdn]
}

resource "aws_route53_record" "heimdall" {
  name    = aws_api_gateway_domain_name.heimdall.domain_name
  type    = "A"
  zone_id = var.zone_id

  alias {
    evaluate_target_health = true
    name                   = aws_api_gateway_domain_name.heimdall.regional_domain_name
    zone_id                = aws_api_gateway_domain_name.heimdall.regional_zone_id
  }
}

resource "aws_api_gateway_domain_name" "heimdall" {
  domain_name              = var.domain_name
  regional_certificate_arn = aws_acm_certificate_validation.cert_validation.certificate_arn

  endpoint_configuration {
    types = ["REGIONAL"]
  }
}

resource "aws_api_gateway_base_path_mapping" "on_demand" {
  api_id      = aws_api_gateway_rest_api.on_demand_api.id
  stage_name  = var.api_stage
  domain_name = aws_api_gateway_domain_name.heimdall.domain_name
  base_path   = "on_demand"
}
