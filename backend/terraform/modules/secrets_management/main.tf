data "aws_caller_identity" "current" {}

###############################################################################
# Secrets Management Lambda
###############################################################################

resource "aws_lambda_function" "secrets-handler" {
  function_name = "${var.app}-secrets-handler"

  s3_bucket = var.s3_analyzer_files_id
  s3_key    = var.lambda_bundle_s3_key

  handler       = var.datadog_enabled ? "datadog_lambda.handler.handler" : "handlers.handler"
  runtime       = var.lambda_runtime
  architectures = [var.lambda_architecture]
  timeout       = 30
  layers        = var.lambda_layers
  memory_size   = 256
  role          = aws_iam_role.secrets-role.arn

  environment {
    variables = merge({
      DATADOG_ENABLED       = var.datadog_enabled
      APPLICATION           = var.app
      ENVIRONMENT           = var.environment
      ARTEMIS_SCRUB_DETAILS = var.scrub_details
      },
      var.datadog_enabled ? merge({
        DD_LAMBDA_HANDLER = "handlers.handler"
        DD_SERVICE        = "${var.app}-data-forwarder"
      }, var.datadog_environment_variables)
    : {})
  }

  tags = merge(
    var.tags,
    {
      Name = "Artemis Secrets Management Handler Lambda"
    }
  )
}

###############################################################################
# Event Stream Permissions
###############################################################################

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

resource "aws_iam_role" "secrets-role" {
  name               = "${var.app}-secrets-management-lambda"
  assume_role_policy = data.aws_iam_policy_document.lambda-assume-policy.json

  tags = merge(
    var.tags,
    {
      Name = "Artemis Secrets Management Lambda Role"
    }
  )
}

module "write-logs" {
  source = "../role_policy_attachment"
  actions = [
    "logs:CreateLogGroup",
    "logs:CreateLogStream",
    "logs:PutLogEvents",
  ]
  iam_role_names = [
    aws_iam_role.secrets-role.name
  ]
  name      = "${var.app}-secrets-management-write-logs"
  resources = ["arn:aws:logs:*:*:*"]
}


module "secrets-queue-receive" {
  source = "../role_policy_attachment"
  actions = [
    "sqs:ReceiveMessage",
    "sqs:DeleteMessage",
    "sqs:GetQueueAttributes",
  ]
  iam_role_names = [aws_iam_role.secrets-role.name]
  name           = "${var.app}-secrets-queue-receive"
  resources      = [var.secrets_queue.arn]
}

module "access-secret-manager-keys" {
  source  = "../role_policy_attachment"
  actions = ["secretsmanager:GetSecretValue"]
  iam_role_names = [
    aws_iam_role.secrets-role.name
  ]
  name = "${var.app}-secrets-management-access-secret-manager-keys"
  resources = [
    "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:${var.app}/*"
  ]
}

resource "aws_lambda_permission" "secrets-handler" {
  statement_id  = "AllowExecutionFromSQS"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.secrets-handler.function_name
  principal     = "events.amazonaws.com"
  source_arn    = var.secrets_queue.arn
}

###############################################################################
# Event Dispatch Event Source
###############################################################################

resource "aws_lambda_event_source_mapping" "secrets-handler" {
  event_source_arn = var.secrets_queue.arn
  function_name    = aws_lambda_function.secrets-handler.arn
  enabled          = var.secrets_enabled
}
