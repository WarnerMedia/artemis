###############################################################################
# API Sub-structure contained in THIS FILE
# /api/v1/search/repositories => Lambda proxy to search_repositories Lambda
# /api/v1/search/scans        => Lambda proxy to search_scans Lambda
###############################################################################

###############################################################################
# Configure the /api/v1/search endpoint
###############################################################################

#######################################
# /api/v1/search Resources
#######################################

# /api/v1/search
resource "aws_api_gateway_resource" "api_v1_search" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_resource.api_v1.id
  path_part   = "search"
}

# /api/v1/search/repositories
resource "aws_api_gateway_resource" "api_v1_search_repositories" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_resource.api_v1_search.id
  path_part   = "repositories"
}

# /api/v1/search/scans
resource "aws_api_gateway_resource" "api_v1_search_scans" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_resource.api_v1_search.id
  path_part   = "scans"
}

#######################################
# /api/v1/search Methods
#######################################

# ANY /api/v1/search/repositories
resource "aws_api_gateway_method" "api_v1_search_repositories" {
  rest_api_id      = aws_api_gateway_rest_api.api.id
  resource_id      = aws_api_gateway_resource.api_v1_search_repositories.id
  http_method      = "ANY"
  authorization    = "CUSTOM"
  authorizer_id    = aws_api_gateway_authorizer.authorizer.id
  api_key_required = false
}

# ANY /api/v1/search/scans
resource "aws_api_gateway_method" "api_v1_search_scans" {
  rest_api_id      = aws_api_gateway_rest_api.api.id
  resource_id      = aws_api_gateway_resource.api_v1_search_scans.id
  http_method      = "ANY"
  authorization    = "CUSTOM"
  authorizer_id    = aws_api_gateway_authorizer.authorizer.id
  api_key_required = false
}

#######################################
# /api/v1/search Integrations
#######################################

resource "aws_api_gateway_integration" "api_v1_search_repositories" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_method.api_v1_search_repositories.resource_id
  http_method = aws_api_gateway_method.api_v1_search_repositories.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.search_repositories.invoke_arn
}

resource "aws_api_gateway_integration" "api_v1_search_scans" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_method.api_v1_search_scans.resource_id
  http_method = aws_api_gateway_method.api_v1_search_scans.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.search_scans.invoke_arn
}

###############################################################################
# Search API Lambdas
###############################################################################

resource "aws_lambda_function" "search_repositories" {
  function_name = "${var.app}-search-repositories-handler"

  s3_bucket = var.s3_analyzer_files_id
  s3_key    = "lambdas/search_repositories/v${var.ver}/search_repositories.zip"

  layers = [
    aws_lambda_layer_version.artemislib.arn,
    aws_lambda_layer_version.artemisdb.arn,
    aws_lambda_layer_version.artemisapi.arn
  ]

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
      ANALYZER_DJANGO_SECRETS_ARN = "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:${var.app}/django-secret-key"
      ANALYZER_DB_CREDS_ARN       = "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:${var.app}/db-user"
      ARTEMIS_DOMAIN_NAME         = var.domain_name
    }
  }

  tags = merge(
    var.tags,
    {
      Name = "Artemis Search Repositories Handler Lambda"
    }
  )
}

resource "aws_lambda_function" "search_scans" {
  function_name = "${var.app}-search-scans-handler"

  s3_bucket = var.s3_analyzer_files_id
  s3_key    = "lambdas/search_scans/v${var.ver}/search_scans.zip"

  layers = [
    aws_lambda_layer_version.artemislib.arn,
    aws_lambda_layer_version.artemisdb.arn,
    aws_lambda_layer_version.artemisapi.arn
  ]

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
      ANALYZER_DJANGO_SECRETS_ARN = "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:${var.app}/django-secret-key"
      ANALYZER_DB_CREDS_ARN       = "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:${var.app}/db-user"
      ARTEMIS_DOMAIN_NAME         = var.domain_name
    }
  }

  tags = merge(
    var.tags,
    {
      Name = "Artemis Search Scans Handler Lambda"
    }
  )
}

###############################################################################
# API Gateway Lambda Permissions
###############################################################################

resource "aws_lambda_permission" "search_repositories" {
  statement_id  = "apigw-allow-search-repositories-lambda"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.search_repositories.arn
  principal     = "apigateway.amazonaws.com"

  # The /*/* portion grants access from any method on any resource
  # within the API Gateway "REST API".
  source_arn = "${aws_api_gateway_deployment.api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "search_scans" {
  statement_id  = "apigw-allow-search-scans-lambda"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.search_scans.arn
  principal     = "apigateway.amazonaws.com"

  # The /*/* portion grants access from any method on any resource
  # within the API Gateway "REST API".
  source_arn = "${aws_api_gateway_deployment.api.execution_arn}/*/*"
}
