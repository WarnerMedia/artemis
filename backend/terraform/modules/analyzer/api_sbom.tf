###############################################################################
# API Sub-structure contained in THIS FILE
# /api/v1/sbom/components/{id} => Lambda proxy to sbom_components Lambda
# /api/v1/sbom/licenses/{id}   => Lambda proxy to sbom_licenses Lambda
###############################################################################

###############################################################################
# Configure the /api/v1/sbom endpoint
###############################################################################

#######################################
# /api/v1/sbom Resources
#######################################

# /api/v1/sbom
resource "aws_api_gateway_resource" "api_v1_sbom" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_resource.api_v1.id
  path_part   = "sbom"
}

# /api/v1/sbom/components
resource "aws_api_gateway_resource" "api_v1_sbom_components" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_resource.api_v1_sbom.id
  path_part   = "components"
}

# /api/v1/sbom/components/{name}
resource "aws_api_gateway_resource" "api_v1_sbom_components_name" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_resource.api_v1_sbom_components.id
  path_part   = "{name}"
}

# /api/v1/sbom/components/{name}/{version}
resource "aws_api_gateway_resource" "api_v1_sbom_components_name_version" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_resource.api_v1_sbom_components_name.id
  path_part   = "{version}"
}

# /api/v1/sbom/components/{name}/{version}/{resource}
resource "aws_api_gateway_resource" "api_v1_sbom_components_name_version_resource" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_resource.api_v1_sbom_components_name_version.id
  path_part   = "{resource}"
}

# /api/v1/sbom/licenses
resource "aws_api_gateway_resource" "api_v1_sbom_licenses" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_resource.api_v1_sbom.id
  path_part   = "licenses"
}

# /api/v1/sbom/licenses/{id}
resource "aws_api_gateway_resource" "api_v1_sbom_licenses_id" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_resource.api_v1_sbom_licenses.id
  path_part   = "{id}"
}

#######################################
# /api/v1/sbom Methods
#######################################

# ANY /api/v1/sbom/components
resource "aws_api_gateway_method" "api_v1_sbom_components" {
  rest_api_id      = aws_api_gateway_rest_api.api.id
  resource_id      = aws_api_gateway_resource.api_v1_sbom_components.id
  http_method      = "ANY"
  authorization    = "CUSTOM"
  authorizer_id    = aws_api_gateway_authorizer.authorizer.id
  api_key_required = false
}

# ANY /api/v1/sbom/components/{name}
resource "aws_api_gateway_method" "api_v1_sbom_components_name" {
  rest_api_id      = aws_api_gateway_rest_api.api.id
  resource_id      = aws_api_gateway_resource.api_v1_sbom_components_name.id
  http_method      = "ANY"
  authorization    = "CUSTOM"
  authorizer_id    = aws_api_gateway_authorizer.authorizer.id
  api_key_required = false
}

# ANY /api/v1/sbom/components/{name}/{version}
resource "aws_api_gateway_method" "api_v1_sbom_components_name_version" {
  rest_api_id      = aws_api_gateway_rest_api.api.id
  resource_id      = aws_api_gateway_resource.api_v1_sbom_components_name_version.id
  http_method      = "ANY"
  authorization    = "CUSTOM"
  authorizer_id    = aws_api_gateway_authorizer.authorizer.id
  api_key_required = false
}

# ANY /api/v1/sbom/components/{name}/{version}/{resource}
resource "aws_api_gateway_method" "api_v1_sbom_components_name_version_resource" {
  rest_api_id      = aws_api_gateway_rest_api.api.id
  resource_id      = aws_api_gateway_resource.api_v1_sbom_components_name_version_resource.id
  http_method      = "ANY"
  authorization    = "CUSTOM"
  authorizer_id    = aws_api_gateway_authorizer.authorizer.id
  api_key_required = false
}

# ANY /api/v1/sbom/licenses
resource "aws_api_gateway_method" "api_v1_sbom_licenses" {
  rest_api_id      = aws_api_gateway_rest_api.api.id
  resource_id      = aws_api_gateway_resource.api_v1_sbom_licenses.id
  http_method      = "ANY"
  authorization    = "CUSTOM"
  authorizer_id    = aws_api_gateway_authorizer.authorizer.id
  api_key_required = false
}

# ANY /api/v1/sbom/licenses/{id}
resource "aws_api_gateway_method" "api_v1_sbom_licenses_id" {
  rest_api_id      = aws_api_gateway_rest_api.api.id
  resource_id      = aws_api_gateway_resource.api_v1_sbom_licenses_id.id
  http_method      = "ANY"
  authorization    = "CUSTOM"
  authorizer_id    = aws_api_gateway_authorizer.authorizer.id
  api_key_required = false
}

#######################################
# /api/v1/sbom Integrations
#######################################

resource "aws_api_gateway_integration" "api_v1_sbom_components" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_method.api_v1_sbom_components.resource_id
  http_method = aws_api_gateway_method.api_v1_sbom_components.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.sbom_components.invoke_arn
}

resource "aws_api_gateway_integration" "api_v1_sbom_components_name" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_method.api_v1_sbom_components_name.resource_id
  http_method = aws_api_gateway_method.api_v1_sbom_components_name.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.sbom_components.invoke_arn
}

resource "aws_api_gateway_integration" "api_v1_sbom_components_name_version" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_method.api_v1_sbom_components_name_version.resource_id
  http_method = aws_api_gateway_method.api_v1_sbom_components_name_version.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.sbom_components.invoke_arn
}

resource "aws_api_gateway_integration" "api_v1_sbom_components_name_version_resource" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_method.api_v1_sbom_components_name_version_resource.resource_id
  http_method = aws_api_gateway_method.api_v1_sbom_components_name_version_resource.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.sbom_components.invoke_arn
}

resource "aws_api_gateway_integration" "api_v1_sbom_licenses" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_method.api_v1_sbom_licenses.resource_id
  http_method = aws_api_gateway_method.api_v1_sbom_licenses.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.sbom_licenses.invoke_arn
}

resource "aws_api_gateway_integration" "api_v1_sbom_licenses_id" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_method.api_v1_sbom_licenses_id.resource_id
  http_method = aws_api_gateway_method.api_v1_sbom_licenses_id.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.sbom_licenses.invoke_arn
}

###############################################################################
# SBOM API Lambdas
###############################################################################

resource "aws_lambda_function" "sbom_components" {
  function_name = "${var.app}-sbom-components-handler"

  s3_bucket = var.s3_analyzer_files_id
  s3_key    = "lambdas/sbom_components/v${var.ver}/sbom_components.zip"

  layers = concat([
    aws_lambda_layer_version.artemislib.arn,
    aws_lambda_layer_version.artemisdb.arn,
    aws_lambda_layer_version.artemisapi.arn
  ], var.extra_lambda_layers_sbom_components_handler)

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
  timeout       = 60

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
      Name = "Artemis SBOM Components Handler Lambda"
    }
  )
}

resource "aws_lambda_function" "sbom_licenses" {
  function_name = "${var.app}-sbom-licenses-handler"

  s3_bucket = var.s3_analyzer_files_id
  s3_key    = "lambdas/sbom_licenses/v${var.ver}/sbom_licenses.zip"

  layers = concat([
    aws_lambda_layer_version.artemislib.arn,
    aws_lambda_layer_version.artemisdb.arn,
    aws_lambda_layer_version.artemisapi.arn
  ], var.extra_lambda_layers_sbom_licenses_handler)

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
  timeout       = 60

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
      Name = "Artemis SBOM Licenses Handler Lambda"
    }
  )
}

###############################################################################
# API Gateway Lambda Permissions
###############################################################################

resource "aws_lambda_permission" "sbom_components" {
  statement_id  = "apigw-allow-sbom-components-lambda"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.sbom_components.arn
  principal     = "apigateway.amazonaws.com"

  # The /*/* portion grants access from any method on any resource
  # within the API Gateway "REST API".
  source_arn = "${aws_api_gateway_deployment.api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "sbom_licenses" {
  statement_id  = "apigw-allow-sbom-licenses-lambda"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.sbom_licenses.arn
  principal     = "apigateway.amazonaws.com"

  # The /*/* portion grants access from any method on any resource
  # within the API Gateway "REST API".
  source_arn = "${aws_api_gateway_deployment.api.execution_arn}/*/*"
}
