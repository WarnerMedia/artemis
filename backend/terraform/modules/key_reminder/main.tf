data "aws_caller_identity" "current" {}

###############################################################################
# Key Reminder Lambda
###############################################################################

resource "aws_lambda_function" "key_reminder" {
  function_name = "${var.app}-key-reminder"
  s3_bucket     = var.s3_analyzer_files_id
  s3_key        = "lambdas/key_reminder/v${var.ver}/key_reminder.zip"
  layers        = var.lambda_layers
  handler       = var.datadog_enabled ? "datadog_lambda.handler.handler" : "handlers.handler"
  runtime       = var.lambda_runtime
  architectures = [var.lambda_architecture]
  memory_size   = 1024
  timeout       = 900
  role          = aws_iam_role.key-reminder-role.arn

  logging_config {
    log_format = "JSON"
  }

  environment {
    variables = merge({
      DATADOG_ENABLED                 = var.datadog_enabled
      ANALYZER_DB_CREDS_ARN           = "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:${var.app}/db-user"
      ANALYZER_DJANGO_SECRETS_ARN     = "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:${var.app}/django-secret-key"
      ARTEMIS_KEY_REMINDER_FROM_EMAIL = var.key_reminder_email
      ARTEMIS_KEY_REMINDER_SES_REGION = var.key_reminder_ses_region
      ARTEMIS_DOMAIN                  = var.domain
      },
      var.datadog_enabled ? merge({
        DD_LAMBDA_HANDLER = "handlers.handler"
        DD_SERVICE        = "${var.app}-scheduled"
      }, var.datadog_environment_variables)
    : {})
  }

  tags = merge(
    var.tags,
    {
      Name = "Artemis Key Reminder Lambda"
    }
  )
}

###############################################################################
# Scheduling
###############################################################################

resource "aws_cloudwatch_event_rule" "key-reminder" {
  name                = "${var.app}-run-key-reminder"
  description         = "Event that fires every day"
  schedule_expression = "rate(1 day)"

  # This rule is disabled when in maintenance mode
  state = (!var.maintenance_mode && var.key_reminder_enabled) ? "ENABLED" : "DISABLED"
}

resource "aws_cloudwatch_event_target" "key-reminder" {
  target_id = "${var.app}-key-reminder"
  rule      = aws_cloudwatch_event_rule.key-reminder.name
  arn       = aws_lambda_function.key_reminder.arn
}

resource "aws_lambda_permission" "key-reminder-from-cloudwatch" {
  statement_id  = "AllowExecutionFromCloudWatch"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.key_reminder.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.key-reminder.arn
}

###############################################################################
# IAM
###############################################################################

resource "aws_iam_role" "key-reminder-role" {
  name               = "${var.app}-key-reminder-lambda"
  assume_role_policy = data.aws_iam_policy_document.lambda-assume-policy.json

  tags = merge(
    var.tags,
    {
      Name = "Artemis Key Reminder Lambda Role"
    }
  )
}

data "aws_iam_policy_document" "lambda-assume-policy" {
  statement {
    effect = "Allow"

    actions = [
      "sts:AssumeRole",
    ]

    principals {
      type = "Service"

      identifiers = [
        "lambda.amazonaws.com",
      ]
    }
  }
}

module "write-logs" {
  source = "../role_policy_attachment"
  actions = [
    "logs:CreateLogGroup",
    "logs:CreateLogStream",
    "logs:PutLogEvents",
  ]
  iam_role_names = [
    aws_iam_role.key-reminder-role.name
  ]
  name = "${var.app}-key-reminder-write-logs"
  resources = [
    "arn:aws:logs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:log-group:/aws/lambda/${var.app}*:*"
  ]
}
