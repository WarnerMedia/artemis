###############################################################################
# Lambda
###############################################################################

resource "aws_lambda_function" "service-connection-metrics" {
  function_name = "${var.app}-service-connection-metrics"
  s3_bucket     = var.s3_analyzer_files_id
  s3_key        = "lambdas/service_connection_metrics/v${var.ver}/service_connection_metrics.zip"
  layers        = var.lambda_layers
  handler       = var.datadog_enabled ? "datadog_lambda.handler.handler" : "handlers.handler"
  runtime       = var.lambda_runtime
  architectures = [var.lambda_architecture]
  memory_size   = 1024
  timeout       = 900
  role          = aws_iam_role.service-connections-role.arn

  logging_config {
    log_format = "JSON"
  }
  vpc_config {
    subnet_ids         = [aws_subnet.lambdas.id]
    security_group_ids = [aws_security_group.lambda-sg.id]
  }

  environment {
    variables = merge({
      DATADOG_ENABLED                   = var.datadog_enabled
      APPLICATION_TAG                   = var.app
      ARTEMIS_GITHUB_APP_ID             = var.github_app_id
      ARTEMIS_REVPROXY_DOMAIN_SUBSTRING = var.revproxy_domain_substring
      ARTEMIS_REVPROXY_SECRET           = var.revproxy_secret
      ARTEMIS_REVPROXY_SECRET_REGION    = var.revproxy_secret_region
      S3_BUCKET                         = var.s3_analyzer_files_id
      ARTEMIS_MEMCACHE_ENDPOINT         = aws_elasticache_cluster.memcached.cache_nodes[0].address
      ARTEMIS_MEMCACHE_PORT             = var.memcached_port
      },
      var.datadog_enabled ? merge({
        DD_LAMBDA_HANDLER = "handlers.handler"
        DD_SERVICE        = "${var.app}-maintenance"
      }, var.datadog_environment_variables)
    : {})
  }

  tags = merge(
    var.tags,
    {
      Name = "Artemis Service Connection Status Lambda"
    }
  )
}

###############################################################################
# Lambda IAM
###############################################################################

resource "aws_iam_role" "service-connections-role" {
  name               = "${var.app}-service-connections-role"
  assume_role_policy = data.aws_iam_policy_document.lambda-assume-policy.json

  tags = merge(
    var.tags,
    {
      Name = "Artemis Service Connection Status Lambda"
    }
  )
}

resource "aws_cloudwatch_event_rule" "run-service-connection-metrics" {
  name                = "${var.app}-run-service-connection-metrics"
  description         = "Event that fires every 15 minutes"
  schedule_expression = "rate(15 minutes)"

  # This rule is disabled when in maintenance mode
  state = !var.maintenance_mode ? "ENABLED" : "DISABLED"
}

resource "aws_cloudwatch_event_target" "service-connection" {
  target_id = "${var.app}-scan-scheduler"
  rule      = aws_cloudwatch_event_rule.run-service-connection-metrics.name
  arn       = aws_lambda_function.service-connection-metrics.arn
}

resource "aws_lambda_permission" "run-service-connections-lambda-from-cloudwatch" {
  statement_id  = "AllowExecutionFromCloudWatch"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.service-connection-metrics.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.run-service-connection-metrics.arn
}
