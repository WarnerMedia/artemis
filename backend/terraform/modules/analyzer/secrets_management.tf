###############################################################################
# Secrets Management Lambda
###############################################################################

resource "aws_lambda_function" "secrets-handler" {
  function_name = "${var.app}-secrets-handler"

  s3_bucket = var.s3_analyzer_files_id
  s3_key    = "lambdas/secrets_handler/v${var.ver}/secrets_handler.zip"

  handler       = "handlers.handler"
  runtime       = var.lambda_runtime
  architectures = [var.lambda_architecture]
  timeout       = 30

  role = aws_iam_role.secrets-role.arn

  environment {
    variables = {
      APPLICATION = var.app
      ENVIRONMENT = var.environment
    }
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
