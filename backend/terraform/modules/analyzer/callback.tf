###############################################################################
# Callback Lambda
###############################################################################

resource "aws_lambda_function" "callback" {
  function_name = "${var.app}-callback"

  s3_bucket = var.s3_analyzer_files_id
  s3_key    = "lambdas/callback/v${var.ver}/callback.zip"

  handler       = var.datadog_enabled ? "datadog_lambda.handler.handler" : "handlers.handler"
  runtime       = var.lambda_runtime
  architectures = [var.lambda_architecture]
  timeout       = 30
  layers        = var.lambda_layers

  role = aws_iam_role.callback-assume-role.arn

  vpc_config {
    subnet_ids         = [aws_subnet.lambdas.id]
    security_group_ids = [aws_security_group.lambda-sg.id]
  }

  environment {
    variables = merge({
      DATADOG_ENABLED = var.datadog_enabled
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
      Name = "Artemis Callback Lambda"
    }
  )
}

###############################################################################
# Callback Permissions
###############################################################################

resource "aws_lambda_permission" "callback" {
  statement_id  = "AllowExecutionFromSQS"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.callback.function_name
  principal     = "events.amazonaws.com"
  source_arn    = var.callback_queue_arn
}

resource "aws_iam_role" "callback-assume-role" {
  name               = "${var.app}-callback-lambda"
  assume_role_policy = data.aws_iam_policy_document.lambda-assume-policy.json

  tags = merge(
    var.tags,
    {
      Name = "Artemis Callback Lambda Role"
    }
  )
}

module "callback-queue-send" {
  source  = "../role_policy_attachment"
  actions = ["sqs:SendMessage"]
  iam_role_names = [
    module.public_engine_cluster.engine-role.name, module.nat_engine_cluster.engine-role.name
  ]
  name      = "${var.app}-callback-queue-send-policy"
  resources = [var.callback_queue_arn]
}

module "callback-queue-receive" {
  source = "../role_policy_attachment"
  actions = [
    "sqs:ReceiveMessage",
    "sqs:DeleteMessage",
    "sqs:GetQueueAttributes",
  ]
  iam_role_names = [aws_iam_role.callback-assume-role.name]
  name           = "${var.app}-callback-queue-receive-policy"
  resources      = [var.callback_queue_arn]
}

module "callback-secrets" {
  source         = "../role_policy_attachment"
  actions        = ["secretsmanager:GetSecretValue"]
  iam_role_names = [aws_iam_role.callback-assume-role.name]
  name           = "${var.app}-callback-secrets"
  resources      = ["arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:${var.app}/callback-auth-*"]
}

###############################################################################
# Callback Event Source
###############################################################################

resource "aws_lambda_event_source_mapping" "callback" {
  event_source_arn = var.callback_queue_arn
  function_name    = aws_lambda_function.callback.arn
}
