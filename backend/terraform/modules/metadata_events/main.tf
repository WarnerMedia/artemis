data "aws_caller_identity" "current" {}

###############################################################################
# Metadata Events Lambda
###############################################################################

resource "aws_lambda_function" "metadata-events-handler" {
  function_name = "${var.app}-metadata-events-handler"

  s3_bucket = var.s3_analyzer_files_id
  s3_key    = "lambdas/metadata_events_handler/v${var.ver}/metadata_events_handler.zip"

  handler       = "handlers.handler"
  runtime       = var.lambda_runtime
  architectures = [var.lambda_architecture]
  timeout       = 30

  role = aws_iam_role.metadata-events-role.arn

  environment {
    variables = {
      APPLICATION                  = var.app
      ENVIRONMENT                  = var.environment
      ARTEMIS_SPLUNK_KEY           = aws_secretsmanager_secret.metadata-events-secret.name
      ARTEMIS_SCRUB_NONPROD        = "false"
    }
  }

  tags = merge(
    var.tags,
    {
      Name = "Artemis Metadata Event Handler Lambda"
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

resource "aws_iam_role" "metadata-events-role" {
  name               = "${var.app}-metadata-event-lambda"
  assume_role_policy = data.aws_iam_policy_document.lambda-assume-policy.json

  tags = merge(
    var.tags,
    {
      Name = "Artemis Metadata Events Lambda Role"
    }
  )
}

module "metadata-events-queue-receive" {
  source = "../role_policy_attachment"
  actions = [
    "sqs:ReceiveMessage",
    "sqs:DeleteMessage",
    "sqs:GetQueueAttributes",
  ]
  iam_role_names = [aws_iam_role.metadata-events-role.name]
  name           = "${var.app}-metadata-events-queue-receive"
  resources      = [var.metadata_events_queue.arn]
}

resource "aws_lambda_permission" "metadata-events-handler" {
  statement_id  = "AllowExecutionFromSQS"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.metadata-events-handler.function_name
  principal     = "events.amazonaws.com"
  source_arn    = var.metadata_events_queue.arn
}

module "write-logs" {
  source = "../role_policy_attachment"
  actions = [
    "logs:CreateLogGroup",
    "logs:CreateLogStream",
    "logs:PutLogEvents",
  ]
  iam_role_names = [
    aws_iam_role.metadata-events-role.name
  ]
  name      = "${var.app}-metadata-events-write-logs"
  resources = [
    "arn:aws:logs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:log-group:/aws/lambda/${var.app}*:*"
  ]
}

module "access-secret-manager-keys" {
  source  = "../role_policy_attachment"
  actions = ["secretsmanager:GetSecretValue"]
  iam_role_names = [
    aws_iam_role.metadata-events-role.name
  ]
  name = "${var.app}-metadata-events-access-secret-manager-keys"
  resources = [
    "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:${var.app}/*"
  ]
}

###############################################################################
# Event Dispatch Event Source
###############################################################################

resource "aws_lambda_event_source_mapping" "metadata-events-handler" {
  event_source_arn = var.metadata_events_queue.arn
  function_name    = aws_lambda_function.metadata-events-handler.arn
  enabled          = var.metadata_events_enabled
}
