###############################################################################
# API Sub-structure contained in THIS FILE
# /provision => Mock integration request to do a 302 redirect to provisioning form
###############################################################################

###############################################################################
# Configure the /provision endpoint
###############################################################################

#######################################
# /provision Resource
#######################################

resource "aws_api_gateway_resource" "provision" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_rest_api.api.root_resource_id
  path_part   = "provision"
}

#######################################
# /provision Method
#######################################

resource "aws_api_gateway_method" "provision" {
  rest_api_id      = aws_api_gateway_rest_api.api.id
  resource_id      = aws_api_gateway_resource.provision.id
  http_method      = "GET"
  authorization    = "NONE"
  api_key_required = false
}

#######################################
# /provision Integration Request
#######################################

resource "aws_api_gateway_integration" "provision" {
  rest_api_id          = aws_api_gateway_rest_api.api.id
  resource_id          = aws_api_gateway_method.provision.resource_id
  http_method          = aws_api_gateway_method.provision.http_method
  type                 = "MOCK"
  passthrough_behavior = "NEVER"
  request_templates = {
    "text/html"        = jsonencode({ "statusCode" = 302 })
    "application/json" = jsonencode({ "statusCode" = 302 })
  }
}

#######################################
# /provision Integration Response
#######################################

resource "aws_api_gateway_integration_response" "provision" {
  depends_on  = [aws_api_gateway_integration.provision]
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_method.provision.resource_id
  http_method = aws_api_gateway_method.provision.http_method
  status_code = aws_api_gateway_method_response.provision.status_code
  response_parameters = {
    "method.response.header.Content-Type" = "'text/html'"
    "method.response.header.Location"     = "'${var.provision_form_url}'"
  }
}

#######################################
# /provision Method Response
#######################################

resource "aws_api_gateway_method_response" "provision" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_method.provision.resource_id
  http_method = aws_api_gateway_method.provision.http_method
  status_code = "302"
  response_parameters = {
    "method.response.header.Content-Type" = true
    "method.response.header.Location"     = true
  }
}
