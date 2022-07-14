###############################################################################
# API Sub-structure contained in THIS FILE
# /api/v1/{id+}        => Lambda proxy to repo Lambda
###############################################################################

###############################################################################
# Configure the /api/v1/{id+} endpoint
###############################################################################

#######################################
# /api/v1/{id+} Resources
#######################################

# /api/v1/{id+}
resource "aws_api_gateway_resource" "api_v1_repo" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_resource.api_v1.id
  path_part   = "{id+}"
}

#######################################
# /api/v1/{id+} Methods
#######################################

# ANY /api/v1/{id+}
resource "aws_api_gateway_method" "api_v1_repo" {
  rest_api_id      = aws_api_gateway_rest_api.api.id
  resource_id      = aws_api_gateway_resource.api_v1_repo.id
  http_method      = "ANY"
  authorization    = "CUSTOM"
  authorizer_id    = aws_api_gateway_authorizer.authorizer.id
  api_key_required = false
}

#######################################
# /api/v1/{id+} Integrations
#######################################

resource "aws_api_gateway_integration" "api_v1_repo" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_method.api_v1_repo.resource_id
  http_method = aws_api_gateway_method.api_v1_repo.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.repo-handler.invoke_arn
}
