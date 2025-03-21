###############################################################################
# API Gateway
###############################################################################

resource "aws_api_gateway_rest_api" "api" {
  name        = "${var.app}-rest-api"
  description = "Artemis REST API"

  endpoint_configuration {
    types = ["REGIONAL"]
  }
}

###############################################################################
# Overall API Structure
# /                    => HTTP proxy to UI CF distribution for base path
# /{ui+}               => HTTP proxy to UI CF distribution for everything else
# /api/v1/{id+}        => Lambda proxy to repo Lambda
# /api/v1/users/{id}   => Lambda proxy to users Lambda
# /signin              => Callback URL after successful Okta/Cognito auth
# /ci-tools/{path+}    => Lambda proxy for retrieving CI scripts
###############################################################################

###############################################################################
# API Sub-structure contained in THIS FILE
# /                    => HTTP proxy to UI CF distribution for base path
# /{ui+}               => HTTP proxy to UI CF distribution for everything else
# /api/v1              => API prefix resource
# /signin              => Callback URL after successful Okta/Cognito auth
# /ci-tools/{path+}    => Lambda proxy for retrieving CI scripts
###############################################################################

###############################################################################
# Configure the / endpoint
###############################################################################

#######################################
# / Resources
#######################################

# /{ui+}
resource "aws_api_gateway_resource" "ui" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_rest_api.api.root_resource_id
  path_part   = "{ui+}"
}

#######################################
# / Methods
#######################################

resource "aws_api_gateway_method" "root" {
  rest_api_id      = aws_api_gateway_rest_api.api.id
  resource_id      = aws_api_gateway_rest_api.api.root_resource_id
  http_method      = "GET"
  authorization    = "CUSTOM"
  authorizer_id    = aws_api_gateway_authorizer.authorizer.id
  api_key_required = false
}

resource "aws_api_gateway_method" "ui" {
  rest_api_id      = aws_api_gateway_rest_api.api.id
  resource_id      = aws_api_gateway_resource.ui.id
  http_method      = "GET"
  authorization    = "CUSTOM"
  authorizer_id    = aws_api_gateway_authorizer.authorizer.id
  api_key_required = false

  request_parameters = {
    "method.request.path.ui" = true
  }
}

#######################################
# / Integrations
#######################################

# Decode the JSON to name and value
locals {
  origin-header = jsondecode(
    aws_secretsmanager_secret_version.origin-header.secret_string
  )
}

resource "aws_api_gateway_integration" "root" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_method.root.resource_id
  http_method = aws_api_gateway_method.root.http_method

  integration_http_method = "GET"
  type                    = "HTTP_PROXY"
  uri                     = var.ui_origin_url

  request_parameters = {
    "integration.request.header.${local.origin-header.name}" = "'${local.origin-header.value}'"
  }
}

resource "aws_api_gateway_integration" "ui" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_method.ui.resource_id
  http_method = aws_api_gateway_method.ui.http_method

  integration_http_method = "GET"
  type                    = "HTTP_PROXY"
  uri                     = "${var.ui_origin_url}/{ui}"

  request_parameters = {
    "integration.request.path.ui"                            = "method.request.path.ui"
    "integration.request.header.${local.origin-header.name}" = "'${local.origin-header.value}'"
  }
}

###############################################################################
# Configure the /api/v1 endpoint
###############################################################################

#######################################
# /api/v1 Resources
#######################################

# /api
resource "aws_api_gateway_resource" "api" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_rest_api.api.root_resource_id
  path_part   = "api"
}

# /api/v1
resource "aws_api_gateway_resource" "api_v1" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_resource.api.id
  path_part   = "v1"
}

###############################################################################
# Configure the /signin endpoint
###############################################################################

#######################################
# /signin Resources
#######################################

# /signin
resource "aws_api_gateway_resource" "signin" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_rest_api.api.root_resource_id
  path_part   = "signin"
}

#######################################
# /signin Methods
#######################################

resource "aws_api_gateway_method" "signin" {
  rest_api_id      = aws_api_gateway_rest_api.api.id
  resource_id      = aws_api_gateway_resource.signin.id
  http_method      = "GET"
  authorization    = "CUSTOM"
  authorizer_id    = aws_api_gateway_authorizer.authorizer.id
  api_key_required = false
}

#######################################
# /signin Integrations
#######################################

resource "aws_api_gateway_integration" "signin" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_method.signin.resource_id
  http_method = aws_api_gateway_method.signin.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.signin-handler.invoke_arn
}

###############################################################################
# Configure the /ci-tools endpoint
###############################################################################

#######################################
# /ci-tools Resources
#######################################

# /ci-tools
resource "aws_api_gateway_resource" "ci-tools" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_rest_api.api.root_resource_id
  path_part   = "ci-tools"
}

# /ci-tools/{path+}
resource "aws_api_gateway_resource" "ci-tools-path" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_resource.ci-tools.id
  path_part   = "{path+}"
}

#######################################
# /ci-tools Methods
#######################################

resource "aws_api_gateway_method" "ci-tools-path" {
  rest_api_id      = aws_api_gateway_rest_api.api.id
  resource_id      = aws_api_gateway_resource.ci-tools-path.id
  http_method      = "GET"
  authorization    = "CUSTOM"
  authorizer_id    = aws_api_gateway_authorizer.authorizer.id
  api_key_required = false
}

#######################################
# /ci-tools Integrations
#######################################

resource "aws_api_gateway_integration" "ci-tools-path" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_method.ci-tools-path.resource_id
  http_method = aws_api_gateway_method.ci-tools-path.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.ci-tools.invoke_arn
}

###############################################################################
# CI Tools Lambda
###############################################################################

resource "aws_lambda_function" "ci-tools" {
  function_name = "${var.app}-ci-tools-handler"
  s3_bucket     = var.s3_analyzer_files_id
  s3_key        = "lambdas/ci_tools/v${var.ver}/ci_tools.zip"
  layers        = var.lambda_layers
  handler       = var.datadog_enabled ? "datadog_lambda.handler.handler" : "handlers.handler"
  runtime       = var.lambda_runtime
  architectures = [var.lambda_architecture]
  memory_size   = 1024
  timeout       = 30
  role          = aws_iam_role.lambda-assume-role.arn

  logging_config {
    log_format = "JSON"
  }
  vpc_config {
    subnet_ids = [
      aws_subnet.lambdas.id,
    ]

    security_group_ids = [aws_security_group.lambda-sg.id]
  }

  environment {
    variables = merge({
      DATADOG_ENABLED = var.datadog_enabled
      S3_BUCKET       = var.s3_analyzer_files_id
      },
      var.datadog_enabled ? merge({
        DD_LAMBDA_HANDLER = "handlers.handler"
        DD_SERVICE        = "${var.app}-api"
      }, var.datadog_environment_variables)
    : {})
  }

  tags = merge(
    var.tags,
    {
      Name = "Artemis CI Tools Handler Lambda"
    }
  )
}

################################################################################
# API Gateway Custom Responses
################################################################################

resource "aws_api_gateway_gateway_response" "unauthorized" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  status_code   = "401"
  response_type = "UNAUTHORIZED"

  response_templates = {
    "text/html" = templatefile("${path.module}/templates/unauthorized_response.html.tpl", {
      cognito_domain    = var.cognito_domain
      cognito_app_id    = var.cognito_app_id
      identity_provider = var.identity_provider
    })
  }

  response_parameters = merge({
    "gatewayresponse.header.Content-Type" = "'text/html'"
  }, var.additional_response_headers)
}

###############################################################################
# API Gateway Lambda Permissions
###############################################################################

resource "aws_lambda_permission" "repo" {
  statement_id  = "apigw-allow-repo-lambda"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.repo-handler.arn
  principal     = "apigateway.amazonaws.com"

  # The /*/* portion grants access from any method on any resource
  # within the API Gateway "REST API".
  source_arn = "${aws_api_gateway_stage.api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "users" {
  statement_id  = "apigw-allow-users-lambda"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.users-handler.arn
  principal     = "apigateway.amazonaws.com"

  # The /*/* portion grants access from any method on any resource
  # within the API Gateway "REST API".
  source_arn = "${aws_api_gateway_stage.api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "users_keys" {
  statement_id  = "apigw-allow-users-keys-lambda"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.users-keys-handler.arn
  principal     = "apigateway.amazonaws.com"

  # The /*/* portion grants access from any method on any resource
  # within the API Gateway "REST API".
  source_arn = "${aws_api_gateway_stage.api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "users_services" {
  statement_id  = "apigw-allow-users-services-lambda"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.users-services-handler.arn
  principal     = "apigateway.amazonaws.com"

  # The /*/* portion grants access from any method on any resource
  # within the API Gateway "REST API".
  source_arn = "${aws_api_gateway_stage.api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "signin" {
  statement_id  = "apigw-allow-signin-lambda"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.signin-handler.arn
  principal     = "apigateway.amazonaws.com"

  # The /*/* portion grants access from any method on any resource
  # within the API Gateway "REST API".
  source_arn = "${aws_api_gateway_stage.api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "ci-tools" {
  statement_id  = "apigw-allow-ci-tools-lambda"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.ci-tools.arn
  principal     = "apigateway.amazonaws.com"

  # The /*/* portion grants access from any method on any resource
  # within the API Gateway "REST API".
  source_arn = "${aws_api_gateway_stage.api.execution_arn}/*/*"
}

###############################################################################
# Configure the deployment
###############################################################################

resource "aws_api_gateway_deployment" "api" {
  depends_on = [
    aws_api_gateway_integration.root,
    aws_api_gateway_integration.api_v1_repo,
    aws_api_gateway_integration.api_v1_users_id,
    aws_api_gateway_integration.api_v1_groups,
    aws_api_gateway_integration.api_v1_groups_id,
    aws_api_gateway_integration.api_v1_groups_id_keys,
    aws_api_gateway_integration.api_v1_groups_id_keys_kid,
    aws_api_gateway_integration.api_v1_groups_id_members,
    aws_api_gateway_integration.api_v1_groups_id_members_uid,
    aws_api_gateway_integration.api_v1_sbom_components,
    aws_api_gateway_integration.api_v1_sbom_components_name,
    aws_api_gateway_integration.api_v1_sbom_components_name_version,
    aws_api_gateway_integration.api_v1_sbom_components_name_version_resource,
    aws_api_gateway_integration.api_v1_sbom_licenses,
    aws_api_gateway_integration.api_v1_sbom_licenses_id,
    aws_api_gateway_integration.api_v1_scans_batch
  ]

  rest_api_id = aws_api_gateway_rest_api.api.id
}

resource "aws_api_gateway_stage" "api" {
  deployment_id = aws_api_gateway_deployment.api.id
  rest_api_id   = aws_api_gateway_rest_api.api.id
  stage_name    = var.api_stage

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api.arn
    format          = var.api_log_format
  }

  depends_on = [aws_cloudwatch_log_group.api]
}

resource "aws_wafv2_web_acl" "api" {
  name        = "${var.app}-api-acl"
  description = "ACL for ${var.app} API"
  scope       = "REGIONAL"

  default_action {
    allow {}
  }

  visibility_config {
    cloudwatch_metrics_enabled = false
    metric_name                = "${var.app}-api-acl"
    sampled_requests_enabled   = false
  }

  tags = var.tags
}

resource "aws_wafv2_web_acl_association" "api" {
  resource_arn = aws_api_gateway_stage.api.arn
  web_acl_arn  = aws_wafv2_web_acl.api.arn
}

###############################################################################
# Certificate and DNS
###############################################################################

provider "aws" {
  alias   = "us-east-1"
  region  = "us-east-1"
  profile = var.profile
}

resource "aws_acm_certificate" "api" {
  domain_name               = var.domain_name
  subject_alternative_names = var.alternative_names
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  options {
    certificate_transparency_logging_preference = "ENABLED"
  }

  tags = merge(
    var.tags,
    {
      Name = "Artemis API Certificate"
    }
  )
}

resource "aws_route53_record" "api_cert_validation_dns_record" {
  count = length(aws_acm_certificate.api.domain_validation_options)

  name    = aws_acm_certificate.api.domain_validation_options.*.resource_record_name[count.index]
  type    = aws_acm_certificate.api.domain_validation_options.*.resource_record_type[count.index]
  zone_id = lookup(var.zone_map, aws_acm_certificate.api.domain_validation_options.*.domain_name[count.index])
  records = [aws_acm_certificate.api.domain_validation_options.*.resource_record_value[count.index]]
  ttl     = 60

  depends_on = [aws_acm_certificate.api]
}

resource "aws_acm_certificate_validation" "api_cert_validation" {
  certificate_arn         = aws_acm_certificate.api.arn
  validation_record_fqdns = aws_route53_record.api_cert_validation_dns_record.*.fqdn
}

resource "aws_api_gateway_domain_name" "api" {
  count = length(concat([var.domain_name], var.alternative_names))

  domain_name              = concat([var.domain_name], var.alternative_names)[count.index]
  regional_certificate_arn = aws_acm_certificate_validation.api_cert_validation.certificate_arn

  endpoint_configuration {
    types = ["REGIONAL"]
  }
}

resource "aws_route53_record" "api" {
  count = length(aws_api_gateway_domain_name.api)

  name    = aws_api_gateway_domain_name.api.*.domain_name[count.index]
  type    = "A"
  zone_id = lookup(var.zone_map, aws_api_gateway_domain_name.api.*.domain_name[count.index])

  alias {
    evaluate_target_health = true
    name                   = aws_api_gateway_domain_name.api.*.regional_domain_name[count.index]
    zone_id                = aws_api_gateway_domain_name.api.*.regional_zone_id[count.index]
  }
}

resource "aws_api_gateway_base_path_mapping" "api" {
  count = length(aws_api_gateway_domain_name.api)

  api_id      = aws_api_gateway_rest_api.api.id
  stage_name  = aws_api_gateway_stage.api.stage_name
  domain_name = aws_api_gateway_domain_name.api.*.domain_name[count.index]
}

################################################################################
# Logging
################################################################################

resource "aws_cloudwatch_log_group" "api" {
  # Name should match the standard API Gateway naming convention.
  # If the log group was previously automatically created by API Gateway, this
  # resource must be imported first.
  name = "API-Gateway-Execution-Logs_${var.app}-rest-api/${var.api_stage}"

  retention_in_days = var.api_log_retention_period

  tags = var.tags
}

################################################################################
# Authorizor
################################################################################

resource "aws_lambda_function" "api-authorizer" {
  function_name = "${var.app}-api-authorizer"
  s3_bucket     = var.s3_analyzer_files_id
  s3_key        = "lambdas/authorizer/v${var.ver}/authorizer.zip"
  layers        = var.lambda_layers
  handler       = var.datadog_enabled ? "datadog_lambda.handler.handler" : "handlers.handler"
  runtime       = var.lambda_runtime
  architectures = [var.lambda_architecture]
  memory_size   = 1024
  timeout       = 60
  role          = aws_iam_role.lambda-assume-role.arn

  logging_config {
    log_format = "JSON"
  }

  vpc_config {
    subnet_ids = [
      aws_subnet.lambdas.id,
    ]

    security_group_ids = [aws_security_group.lambda-sg.id]
  }

  environment {
    variables = merge({
      DATADOG_ENABLED                      = var.datadog_enabled
      S3_BUCKET                            = var.s3_analyzer_files_id
      ANALYZER_DJANGO_SECRETS_ARN          = "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:${var.app}/django-secret-key"
      ANALYZER_DB_CREDS_ARN                = "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:${var.app}/db-user"
      REGION                               = var.cognito_region
      USERPOOL_ID                          = var.cognito_pool_id
      APP_CLIENT_ID                        = var.cognito_app_id
      ARTEMIS_AUDIT_QUEUE                  = var.event_queue.id
      ARTEMIS_ENVIRONMENT                  = var.environment
      ARTEMIS_MAINTENANCE_MODE             = var.maintenance_mode
      ARTEMIS_MAINTENANCE_MODE_MESSAGE     = var.maintenance_mode_message
      ARTEMIS_MAINTENANCE_MODE_RETRY_AFTER = var.maintenance_mode_retry_after
      ARTEMIS_DEFAULT_SCOPE                = jsonencode(var.default_scope)
      EMAIL_DOMAIN_ALIASES                 = jsonencode(var.email_domain_aliases)
      },
      var.datadog_enabled ? merge({
        DD_LAMBDA_HANDLER = "handlers.handler"
        DD_SERVICE        = "${var.app}-api"
      }, var.datadog_environment_variables)
    : {})
  }

  tags = merge(
    var.tags,
    {
      Name = "Artemis API Authorizer Lambda"
    }
  )
}

data "aws_iam_policy_document" "authorizer-assume-policy" {
  statement {
    effect = "Allow"

    actions = [
      "sts:AssumeRole",
    ]

    principals {
      type = "Service"

      identifiers = [
        "apigateway.amazonaws.com",
      ]
    }
  }
}

resource "aws_iam_role" "authorizer-assume-role" {
  name               = "${var.app}-authorizer"
  assume_role_policy = data.aws_iam_policy_document.authorizer-assume-policy.json

  tags = merge(
    var.tags,
    {
      Name = "Artemis Authorizer Role"
    }
  )
}

module "authorizer" {
  source         = "../role_policy_attachment"
  actions        = ["lambda:InvokeFunction"]
  iam_role_names = [aws_iam_role.authorizer-assume-role.name]
  name           = "${var.app}-authorizer"
  resources      = [aws_lambda_function.api-authorizer.arn]
}

resource "aws_api_gateway_authorizer" "authorizer" {
  name                             = "${var.app}-authorizer"
  rest_api_id                      = aws_api_gateway_rest_api.api.id
  authorizer_uri                   = aws_lambda_function.api-authorizer.invoke_arn
  authorizer_credentials           = aws_iam_role.authorizer-assume-role.arn
  type                             = "REQUEST"
  identity_source                  = ""
  authorizer_result_ttl_in_seconds = 0
}

resource "aws_lambda_permission" "authorizer" {
  statement_id  = "apigw-allow-authorizer-lambda"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api-authorizer.arn
  principal     = "apigateway.amazonaws.com"
  source_arn    = aws_api_gateway_stage.api.execution_arn
}

###############################################################################
# Output
###############################################################################

output "base_url" {
  value = aws_api_gateway_deployment.api.*.invoke_url
}
