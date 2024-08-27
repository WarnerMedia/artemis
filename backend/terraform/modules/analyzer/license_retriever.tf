###############################################################################
# Lambda
###############################################################################

resource "aws_lambda_function" "license-retriever" {
  function_name = "${var.app}-license-retriever"

  s3_bucket = var.s3_analyzer_files_id
  s3_key    = "lambdas/license_retriever/v${var.ver}/license_retriever.zip"

  layers = var.lambda_layers

  lifecycle {
    ignore_changes = [
      # Ignore changes to the layers as the CI pipline will deploy newer versions
      layers
    ]
  }

  handler       = var.datadog_enabled ? "datadog_lambda.handler.handler" : "handlers.handler"
  runtime       = var.lambda_runtime
  architectures = [var.lambda_architecture]
  memory_size   = 128
  timeout       = 900

  role = aws_iam_role.license-retriever-lambda-role.arn

  vpc_config {
    subnet_ids = [
      aws_subnet.lambdas.id,
    ]

    security_group_ids = [aws_security_group.lambda-sg.id]
  }

  environment {
    variables = merge({
      DATADOG_ENABLED             = var.datadog_enabled
      ANALYZER_DJANGO_SECRETS_ARN = "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:${var.app}/django-secret-key"
      ANALYZER_DB_CREDS_ARN       = "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:${var.app}/db-user"
      APPLICATION_TAG             = var.app
      ARTEMIS_LOG_LEVEL           = var.log_level
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
      Name = "Artemis License Retriever Lambda"
    }
  )
}

###############################################################################
# Lambda IAM
###############################################################################

resource "aws_iam_role" "license-retriever-lambda-role" {
  name               = "${var.app}-license-retriever"
  assume_role_policy = data.aws_iam_policy_document.lambda-assume-policy.json

  tags = merge(
    var.tags,
    {
      Name = "Artemis License Retriever Lambda Role"
    }
  )
}

###############################################################################
# License Retriever Scheduling
###############################################################################

resource "aws_cloudwatch_event_rule" "license-retriever-schedule" {
  name        = "${var.app}-license-retriever-schedule"
  description = "Event that triggers the License Retriever Lambda"

  # Run at 09:17 UTC every day
  #
  # We do our best to account for API rate limiting when retrieving license data.
  # In the case of packagist.org, they do not have rate limiting but request that
  # scheduled jobs not be run at the top of the hour to avoid traffic spikes.
  # https://packagist.org/apidoc#best-practices
  schedule_expression = "cron(17 9 ? * * *)"

  # This rule is disabled when in maintenance mode
  is_enabled = !var.maintenance_mode
}

resource "aws_cloudwatch_event_target" "license-retriever" {
  target_id = "${var.app}-db-cleanup"
  rule      = aws_cloudwatch_event_rule.license-retriever-schedule.name
  arn       = aws_lambda_function.license-retriever.arn
}

resource "aws_lambda_permission" "license-retriever-from-cloudwatch" {
  statement_id  = "AllowExecutionFromCloudWatch"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.license-retriever.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.license-retriever-schedule.arn
}
