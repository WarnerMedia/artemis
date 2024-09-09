###############################################################################
# API Sub-structure contained in THIS FILE
# /api/v1/scans/batch => Lambda proxy to scans_batch Lambda
###############################################################################

###############################################################################
# Configure the /api/v1/scans endpoint
###############################################################################

#######################################
# /api/v1/scans Resources
#######################################

# /api/v1/scans
resource "aws_api_gateway_resource" "api_v1_scans" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_resource.api_v1.id
  path_part   = "scans"
}

# /api/v1/scans/batch
resource "aws_api_gateway_resource" "api_v1_scans_batch" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_resource.api_v1_scans.id
  path_part   = "batch"
}

# /api/v1/scans/batch/{id}
resource "aws_api_gateway_resource" "api_v1_scans_batch_id" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_resource.api_v1_scans_batch.id
  path_part   = "{id}"
}

#######################################
# /api/v1/scans Methods
#######################################

# ANY /api/v1/scans/batch
resource "aws_api_gateway_method" "api_v1_scans_batch" {
  rest_api_id      = aws_api_gateway_rest_api.api.id
  resource_id      = aws_api_gateway_resource.api_v1_scans_batch.id
  http_method      = "ANY"
  authorization    = "CUSTOM"
  authorizer_id    = aws_api_gateway_authorizer.authorizer.id
  api_key_required = false
}

# ANY /api/v1/scans/batch/{id}
resource "aws_api_gateway_method" "api_v1_scans_batch_id" {
  rest_api_id      = aws_api_gateway_rest_api.api.id
  resource_id      = aws_api_gateway_resource.api_v1_scans_batch_id.id
  http_method      = "ANY"
  authorization    = "CUSTOM"
  authorizer_id    = aws_api_gateway_authorizer.authorizer.id
  api_key_required = false
}

#######################################
# /api/v1/scans Integrations
#######################################

resource "aws_api_gateway_integration" "api_v1_scans_batch" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_method.api_v1_scans_batch.resource_id
  http_method = aws_api_gateway_method.api_v1_scans_batch.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.scans_batch.invoke_arn
}

resource "aws_api_gateway_integration" "api_v1_scans_batch_id" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_method.api_v1_scans_batch_id.resource_id
  http_method = aws_api_gateway_method.api_v1_scans_batch_id.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.scans_batch.invoke_arn
}

###############################################################################
# Scans API Lambdas
###############################################################################

resource "aws_lambda_function" "scans_batch" {
  function_name = "${var.app}-scans-batch-handler"

  s3_bucket = var.s3_analyzer_files_id
  s3_key    = "lambdas/scans_batch/v${var.ver}/scans_batch.zip"

  layers = var.lambda_layers



  handler       = var.datadog_enabled ? "datadog_lambda.handler.handler" : "handlers.handler"
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
    variables = merge({
      DATADOG_ENABLED                 = var.datadog_enabled
      ANALYZER_DJANGO_SECRETS_ARN     = "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:${var.app}/django-secret-key"
      ANALYZER_DB_CREDS_ARN           = "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:${var.app}/db-user"
      ARTEMIS_DOMAIN_NAME             = var.domain_name
      ARTEMIS_CUSTOM_FILTERING_MODULE = var.custom_filtering_module
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
      Name = "Artemis Scans Batch Handler Lambda"
    }
  )
}

###############################################################################
# API Gateway Lambda Permissions
###############################################################################

resource "aws_lambda_permission" "scans_batch" {
  statement_id  = "apigw-allow-scans-batch-lambda"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.scans_batch.arn
  principal     = "apigateway.amazonaws.com"

  # The /*/* portion grants access from any method on any resource
  # within the API Gateway "REST API".
  source_arn = "${aws_api_gateway_deployment.api.execution_arn}/*/*"
}
