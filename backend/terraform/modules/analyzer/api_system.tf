###############################################################################
# API Sub-structure contained in THIS FILE
# /api/v1/system/allowlist/{id} => Lambda proxy to system_allowlist Lambda
# /api/v1/system/status         => Lambda proxy to system_status Lambda
###############################################################################

###############################################################################
# Configure the /api/v1/system endpoint
###############################################################################

#######################################
# /api/v1/system Resources
#######################################

# /api/v1/system
resource "aws_api_gateway_resource" "api_v1_system" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_resource.api_v1.id
  path_part   = "system"
}

# /api/v1/system/allowlist
resource "aws_api_gateway_resource" "api_v1_system_allowlist" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_resource.api_v1_system.id
  path_part   = "allowlist"
}

# /api/v1/system/allowlist/{id}
resource "aws_api_gateway_resource" "api_v1_system_allowlist_id" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_resource.api_v1_system_allowlist.id
  path_part   = "{id}"
}

# /api/v1/system/status
resource "aws_api_gateway_resource" "api_v1_system_status" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_resource.api_v1_system.id
  path_part   = "status"
}

#######################################
# /api/v1/system Methods
#######################################

# ANY /api/v1/system/allowlist
resource "aws_api_gateway_method" "api_v1_system_allowlist" {
  rest_api_id      = aws_api_gateway_rest_api.api.id
  resource_id      = aws_api_gateway_resource.api_v1_system_allowlist.id
  http_method      = "ANY"
  authorization    = "CUSTOM"
  authorizer_id    = aws_api_gateway_authorizer.authorizer.id
  api_key_required = false
}

# ANY /api/v1/system/allowlist/{id}
resource "aws_api_gateway_method" "api_v1_system_allowlist_id" {
  rest_api_id      = aws_api_gateway_rest_api.api.id
  resource_id      = aws_api_gateway_resource.api_v1_system_allowlist_id.id
  http_method      = "ANY"
  authorization    = "CUSTOM"
  authorizer_id    = aws_api_gateway_authorizer.authorizer.id
  api_key_required = false
}

# ANY /api/v1/system/status
resource "aws_api_gateway_method" "api_v1_system_status" {
  rest_api_id      = aws_api_gateway_rest_api.api.id
  resource_id      = aws_api_gateway_resource.api_v1_system_status.id
  http_method      = "ANY"
  authorization    = "NONE"
  api_key_required = false
}

#######################################
# /api/v1/system Integrations
#######################################

resource "aws_api_gateway_integration" "api_v1_system_allowlist" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_method.api_v1_system_allowlist.resource_id
  http_method = aws_api_gateway_method.api_v1_system_allowlist.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.system_allowlist.invoke_arn
}

resource "aws_api_gateway_integration" "api_v1_system_allowlist_id" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_method.api_v1_system_allowlist_id.resource_id
  http_method = aws_api_gateway_method.api_v1_system_allowlist_id.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.system_allowlist.invoke_arn
}

resource "aws_api_gateway_integration" "api_v1_system_status" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_method.api_v1_system_status.resource_id
  http_method = aws_api_gateway_method.api_v1_system_status.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.system_status.invoke_arn
}

###############################################################################
# System API Lambdas
###############################################################################

resource "aws_lambda_function" "system_allowlist" {
  function_name = "${var.app}-system-allowlist-handler"

  s3_bucket = var.s3_analyzer_files_id
  s3_key    = "lambdas/system_allowlist/v${var.ver}/system_allowlist.zip"

  layers = concat([
    aws_lambda_layer_version.artemislib.arn,
    aws_lambda_layer_version.artemisdb.arn,
    aws_lambda_layer_version.artemisapi.arn
  ], extra_lambda_layers_system_allowlist_handler)

  lifecycle {
    ignore_changes = [
      # Ignore changes to the layers as the CI pipline will deploy newer versions
      layers
    ]
  }

  handler       = "handlers.handler"
  runtime       = var.lambda_runtime
  architectures = [var.lambda_architecture]
  memory_size   = 1024
  timeout       = 30

  role = aws_iam_role.lambda-assume-role.arn

  vpc_config {
    subnet_ids = [
      aws_subnet.lambdas.id,
    ]

    security_group_ids = [aws_security_group.lambda-sg.id]
  }

  environment {
    variables = {
      ANALYZER_DJANGO_SECRETS_ARN     = "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:${var.app}/django-secret-key"
      ANALYZER_DB_CREDS_ARN           = "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:${var.app}/db-user"
      ARTEMIS_CUSTOM_FILTERING_MODULE = var.custom_filtering_module
    }
  }

  tags = merge(
    var.tags,
    {
      Name = "Artemis System Allowlist Handler Lambda"
    }
  )
}

resource "aws_lambda_function" "system_status" {
  function_name = "${var.app}-system-status-handler"

  s3_bucket = var.s3_analyzer_files_id
  s3_key    = "lambdas/system_status/v${var.ver}/system_status.zip"

  layers = concat([
    aws_lambda_layer_version.artemislib.arn,
    aws_lambda_layer_version.artemisdb.arn,
    aws_lambda_layer_version.artemisapi.arn
  ], var.extra_lambda_layers_system_status_handler)

  lifecycle {
    ignore_changes = [
      # Ignore changes to the layers as the CI pipline will deploy newer versions
      layers
    ]
  }

  handler       = "handlers.handler"
  runtime       = var.lambda_runtime
  architectures = [var.lambda_architecture]
  memory_size   = 1024
  timeout       = 30

  role = aws_iam_role.lambda-assume-role.arn

  vpc_config {
    subnet_ids = [
      aws_subnet.lambdas.id,
    ]

    security_group_ids = [aws_security_group.lambda-sg.id]
  }

  environment {
    variables = {
      ANALYZER_DJANGO_SECRETS_ARN          = "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:${var.app}/django-secret-key"
      ANALYZER_DB_CREDS_ARN                = "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:${var.app}/db-user"
      ARTEMIS_MAINTENANCE_MODE             = var.maintenance_mode
      ARTEMIS_MAINTENANCE_MODE_MESSAGE     = var.maintenance_mode_message
      ARTEMIS_MAINTENANCE_MODE_RETRY_AFTER = var.maintenance_mode_retry_after
      ARTEMIS_DOMAIN_NAME                  = var.domain_name
    }
  }

  tags = merge(
    var.tags,
    {
      Name = "Artemis System Status Handler Lambda"
    }
  )
}

###############################################################################
# API Gateway Lambda Permissions
###############################################################################

resource "aws_lambda_permission" "system_allowlist" {
  statement_id  = "apigw-allow-system-allowlist-lambda"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.system_allowlist.arn
  principal     = "apigateway.amazonaws.com"

  # The /*/* portion grants access from any method on any resource
  # within the API Gateway "REST API".
  source_arn = "${aws_api_gateway_deployment.api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "system_status" {
  statement_id  = "apigw-allow-system-status-lambda"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.system_status.arn
  principal     = "apigateway.amazonaws.com"

  # The /*/* portion grants access from any method on any resource
  # within the API Gateway "REST API".
  source_arn = "${aws_api_gateway_deployment.api.execution_arn}/*/*"
}
