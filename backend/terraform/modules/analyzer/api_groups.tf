###############################################################################
# API Sub-structure contained in THIS FILE
# /api/v1/groups/{id}                => Lambda proxy to groups Lambda
# /api/v1/groups/{id}/keys           => Lambda proxy to API key management Lambda
# /api/v1/groups/{id}/keys/{kid}     => Lambda proxy to API key management Lambda
# /api/v1/groups/{id}/members       => Lambda proxy to group member linking Lambda
# /api/v1/groups/{id}/members/{uid} => Lambda proxy to group member linking Lambda
###############################################################################

###############################################################################
# Configure the /api/v1/groups endpoint
###############################################################################

#######################################
# /api/v1/groups Resources
#######################################
# /api/v1/groups
resource "aws_api_gateway_resource" "api_v1_groups" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_resource.api_v1.id
  path_part   = "groups"
}

# /api/v1/groups/{id}
resource "aws_api_gateway_resource" "api_v1_groups_id" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_resource.api_v1_groups.id
  path_part   = "{id}"
}

# /api/v1/groups/{id}/keys
resource "aws_api_gateway_resource" "api_v1_groups_id_keys" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_resource.api_v1_groups_id.id
  path_part   = "keys"
}

# /api/v1/groups/{id}/keys/{kid}
resource "aws_api_gateway_resource" "api_v1_groups_id_keys_kid" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_resource.api_v1_groups_id_keys.id
  path_part   = "{kid}"
}

# /api/v1/groups/{id}/members
resource "aws_api_gateway_resource" "api_v1_groups_id_members" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_resource.api_v1_groups_id.id
  path_part   = "members"
}

# /api/v1/groups/{id}/members/{uid}
resource "aws_api_gateway_resource" "api_v1_groups_id_members_uid" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_resource.api_v1_groups_id_members.id
  path_part   = "{uid}"
}

#######################################
# /api/v1/groups Methods
#######################################
# ANY /api/v1/groups
resource "aws_api_gateway_method" "api_v1_groups" {
  rest_api_id      = aws_api_gateway_rest_api.api.id
  resource_id      = aws_api_gateway_resource.api_v1_groups.id
  http_method      = "ANY"
  authorization    = "CUSTOM"
  authorizer_id    = aws_api_gateway_authorizer.authorizer.id
  api_key_required = false
}

# ANY /api/v1/groups/{id}
resource "aws_api_gateway_method" "api_v1_groups_id" {
  rest_api_id      = aws_api_gateway_rest_api.api.id
  resource_id      = aws_api_gateway_resource.api_v1_groups_id.id
  http_method      = "ANY"
  authorization    = "CUSTOM"
  authorizer_id    = aws_api_gateway_authorizer.authorizer.id
  api_key_required = false
}

# ANY /api/v1/groups/{id}/keys
resource "aws_api_gateway_method" "api_v1_groups_id_keys" {
  rest_api_id      = aws_api_gateway_rest_api.api.id
  resource_id      = aws_api_gateway_resource.api_v1_groups_id_keys.id
  http_method      = "ANY"
  authorization    = "CUSTOM"
  authorizer_id    = aws_api_gateway_authorizer.authorizer.id
  api_key_required = false
}

# ANY /api/v1/groups/{id}/keys/{kid}
resource "aws_api_gateway_method" "api_v1_groups_id_keys_kid" {
  rest_api_id      = aws_api_gateway_rest_api.api.id
  resource_id      = aws_api_gateway_resource.api_v1_groups_id_keys_kid.id
  http_method      = "ANY"
  authorization    = "CUSTOM"
  authorizer_id    = aws_api_gateway_authorizer.authorizer.id
  api_key_required = false
}

# ANY /api/v1/groups/{id}/members
resource "aws_api_gateway_method" "api_v1_groups_id_members" {
  rest_api_id      = aws_api_gateway_rest_api.api.id
  resource_id      = aws_api_gateway_resource.api_v1_groups_id_members.id
  http_method      = "ANY"
  authorization    = "CUSTOM"
  authorizer_id    = aws_api_gateway_authorizer.authorizer.id
  api_key_required = false
}

# ANY /api/v1/groups/{id}/members
resource "aws_api_gateway_method" "api_v1_groups_id_members_uid" {
  rest_api_id      = aws_api_gateway_rest_api.api.id
  resource_id      = aws_api_gateway_resource.api_v1_groups_id_members_uid.id
  http_method      = "ANY"
  authorization    = "CUSTOM"
  authorizer_id    = aws_api_gateway_authorizer.authorizer.id
  api_key_required = false
}

#######################################
# /api/v1/groups Integrations
#######################################

resource "aws_api_gateway_integration" "api_v1_groups" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_method.api_v1_groups.resource_id
  http_method = aws_api_gateway_method.api_v1_groups.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.groups-handler.invoke_arn
}

resource "aws_api_gateway_integration" "api_v1_groups_id" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_method.api_v1_groups_id.resource_id
  http_method = aws_api_gateway_method.api_v1_groups_id.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.groups-handler.invoke_arn
}

resource "aws_api_gateway_integration" "api_v1_groups_id_keys" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_method.api_v1_groups_id_keys.resource_id
  http_method = aws_api_gateway_method.api_v1_groups_id_keys.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.groups-keys-handler.invoke_arn
}

resource "aws_api_gateway_integration" "api_v1_groups_id_keys_kid" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_method.api_v1_groups_id_keys_kid.resource_id
  http_method = aws_api_gateway_method.api_v1_groups_id_keys_kid.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.groups-keys-handler.invoke_arn
}

resource "aws_api_gateway_integration" "api_v1_groups_id_members" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_method.api_v1_groups_id_members.resource_id
  http_method = aws_api_gateway_method.api_v1_groups_id_members.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.groups-members-handler.invoke_arn
}

resource "aws_api_gateway_integration" "api_v1_groups_id_members_uid" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_method.api_v1_groups_id_members_uid.resource_id
  http_method = aws_api_gateway_method.api_v1_groups_id_members_uid.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.groups-members-handler.invoke_arn
}

###############################################################################
# Groups API Lambdas
###############################################################################

resource "aws_lambda_function" "groups-handler" {
  function_name = "${var.app}-groups-handler"

  s3_bucket = var.s3_analyzer_files_id
  s3_key    = "lambdas/groups/v${var.ver}/groups.zip"

  layers = concat([
    aws_lambda_layer_version.backend_core.arn
  ], var.extra_lambda_layers_groups_handler)

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
  timeout       = 300

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
      Name = "Artemis Groups Handler Lambda"
    }
  )
}

resource "aws_lambda_function" "groups-members-handler" {
  function_name = "${var.app}-groups-members-handler"

  s3_bucket = var.s3_analyzer_files_id
  s3_key    = "lambdas/groups_members/v${var.ver}/groups_members.zip"

  layers = concat([
    aws_lambda_layer_version.backend_core.arn
  ], var.extra_lambda_layers_groups_members_handler)

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
  timeout       = 300

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
      Name = "Artemis Groups Members Handler Lambda"
    }
  )
}

resource "aws_lambda_function" "groups-keys-handler" {
  function_name = "${var.app}-groups-keys-handler"

  s3_bucket = var.s3_analyzer_files_id
  s3_key    = "lambdas/groups_keys/v${var.ver}/groups_keys.zip"

  layers = concat([
    aws_lambda_layer_version.backend_core.arn
  ], var.extra_lambda_layers_groups_keys_handler)

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
  timeout       = 300

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
      Name = "Artemis Groups Keys Handler Lambda"
    }
  )
}

###############################################################################
# API Gateway Lambda Permissions
###############################################################################
resource "aws_lambda_permission" "groups" {
  statement_id  = "apigw-allow-groups-lambda"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.groups-handler.arn
  principal     = "apigateway.amazonaws.com"

  # The /*/* portion grants access from any method on any resource
  # within the API Gateway "REST API".
  source_arn = "${aws_api_gateway_deployment.api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "groups_members" {
  statement_id  = "apigw-allow-groups-members-lambda"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.groups-members-handler.arn
  principal     = "apigateway.amazonaws.com"

  # The /*/* portion grants access from any method on any resource
  # within the API Gateway "REST API".
  source_arn = "${aws_api_gateway_deployment.api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "groups_keys" {
  statement_id  = "apigw-allow-groups-keys-lambda"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.groups-keys-handler.arn
  principal     = "apigateway.amazonaws.com"

  # The /*/* portion grants access from any method on any resource
  # within the API Gateway "REST API".
  source_arn = "${aws_api_gateway_deployment.api.execution_arn}/*/*"
}
