###############################################################################
# API Sub-structure contained in THIS FILE
# /api/v1/users/{id}                => Lambda proxy to users Lambda
# /api/v1/users/{id}/keys           => Lambda proxy to API key management Lambda
# /api/v1/users/{id}/keys/{kid}     => Lambda proxy to API key management Lambda
# /api/v1/users/{id}/services       => Lambda proxy to service account linking Lambda
# /api/v1/users/{id}/services/{sid} => Lambda proxy to service account linking Lambda
###############################################################################

###############################################################################
# Configure the /api/v1/users endpoint
###############################################################################

#######################################
# /api/v1/users Resources
#######################################

# /api/v1/users
resource "aws_api_gateway_resource" "api_v1_users" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_resource.api_v1.id
  path_part   = "users"
}

# /api/v1/users/{id}
resource "aws_api_gateway_resource" "api_v1_users_id" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_resource.api_v1_users.id
  path_part   = "{id}"
}

# /api/v1/users/{id}/keys
resource "aws_api_gateway_resource" "api_v1_users_id_keys" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_resource.api_v1_users_id.id
  path_part   = "keys"
}

# /api/v1/users/{id}/keys/{kid}
resource "aws_api_gateway_resource" "api_v1_users_id_keys_kid" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_resource.api_v1_users_id_keys.id
  path_part   = "{kid}"
}

# /api/v1/users/{id}/services
resource "aws_api_gateway_resource" "api_v1_users_id_services" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_resource.api_v1_users_id.id
  path_part   = "services"
}

# /api/v1/users/{id}/services/{sid}
resource "aws_api_gateway_resource" "api_v1_users_id_services_sid" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_resource.api_v1_users_id_services.id
  path_part   = "{sid}"
}

#######################################
# /api/v1/users Methods
#######################################

# ANY /api/v1/users
resource "aws_api_gateway_method" "api_v1_users" {
  rest_api_id      = aws_api_gateway_rest_api.api.id
  resource_id      = aws_api_gateway_resource.api_v1_users.id
  http_method      = "ANY"
  authorization    = "CUSTOM"
  authorizer_id    = aws_api_gateway_authorizer.authorizer.id
  api_key_required = false
}

# ANY /api/v1/users/{id}
resource "aws_api_gateway_method" "api_v1_users_id" {
  rest_api_id      = aws_api_gateway_rest_api.api.id
  resource_id      = aws_api_gateway_resource.api_v1_users_id.id
  http_method      = "ANY"
  authorization    = "CUSTOM"
  authorizer_id    = aws_api_gateway_authorizer.authorizer.id
  api_key_required = false
}

# ANY /api/v1/users/{id}/keys
resource "aws_api_gateway_method" "api_v1_users_id_keys" {
  rest_api_id      = aws_api_gateway_rest_api.api.id
  resource_id      = aws_api_gateway_resource.api_v1_users_id_keys.id
  http_method      = "ANY"
  authorization    = "CUSTOM"
  authorizer_id    = aws_api_gateway_authorizer.authorizer.id
  api_key_required = false
}

# ANY /api/v1/users/{id}/keys/{kid}
resource "aws_api_gateway_method" "api_v1_users_id_keys_kid" {
  rest_api_id      = aws_api_gateway_rest_api.api.id
  resource_id      = aws_api_gateway_resource.api_v1_users_id_keys_kid.id
  http_method      = "ANY"
  authorization    = "CUSTOM"
  authorizer_id    = aws_api_gateway_authorizer.authorizer.id
  api_key_required = false
}

# ANY /api/v1/users/{id}/services
resource "aws_api_gateway_method" "api_v1_users_id_services" {
  rest_api_id      = aws_api_gateway_rest_api.api.id
  resource_id      = aws_api_gateway_resource.api_v1_users_id_services.id
  http_method      = "ANY"
  authorization    = "CUSTOM"
  authorizer_id    = aws_api_gateway_authorizer.authorizer.id
  api_key_required = false
}

# ANY /api/v1/users/{id}/services/{sid}
resource "aws_api_gateway_method" "api_v1_users_id_services_sid" {
  rest_api_id      = aws_api_gateway_rest_api.api.id
  resource_id      = aws_api_gateway_resource.api_v1_users_id_services_sid.id
  http_method      = "ANY"
  authorization    = "CUSTOM"
  authorizer_id    = aws_api_gateway_authorizer.authorizer.id
  api_key_required = false
}

#######################################
# /api/v1/users Integrations
#######################################

resource "aws_api_gateway_integration" "api_v1_users" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_method.api_v1_users.resource_id
  http_method = aws_api_gateway_method.api_v1_users.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.users-handler.invoke_arn
}

resource "aws_api_gateway_integration" "api_v1_users_id" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_method.api_v1_users_id.resource_id
  http_method = aws_api_gateway_method.api_v1_users_id.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.users-handler.invoke_arn
}

resource "aws_api_gateway_integration" "api_v1_users_id_keys" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_method.api_v1_users_id_keys.resource_id
  http_method = aws_api_gateway_method.api_v1_users_id_keys.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.users-keys-handler.invoke_arn
}

resource "aws_api_gateway_integration" "api_v1_users_id_keys_kid" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_method.api_v1_users_id_keys_kid.resource_id
  http_method = aws_api_gateway_method.api_v1_users_id_keys_kid.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.users-keys-handler.invoke_arn
}

resource "aws_api_gateway_integration" "api_v1_users_id_services" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_method.api_v1_users_id_services.resource_id
  http_method = aws_api_gateway_method.api_v1_users_id_services.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.users-services-handler.invoke_arn
}

resource "aws_api_gateway_integration" "api_v1_users_id_services_sid" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_method.api_v1_users_id_services_sid.resource_id
  http_method = aws_api_gateway_method.api_v1_users_id_services_sid.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.users-services-handler.invoke_arn
}
