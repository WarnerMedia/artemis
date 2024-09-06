###############################################################################
# Splunk Audit Event Lambda
###############################################################################

resource "aws_lambda_function" "audit-event-handler" {
  function_name = "${var.app}-audit-event-handler"

  s3_bucket = var.s3_analyzer_files_id
  s3_key    = "lambdas/splunk_handler/v${var.ver}/splunk_handler.zip"

  handler       = var.datadog_enabled ? "datadog_lambda.handler.handler" : "handlers.handler"
  runtime       = var.lambda_runtime
  architectures = [var.lambda_architecture]
  timeout       = 30

  layers = var.lambda_layers

  role = aws_iam_role.audit-event-role.arn



  environment {
    variables = merge({
      APPLICATION           = var.app
      ENVIRONMENT           = var.environment
      ARTEMIS_SPLUNK_KEY    = "artemis/audit-log-hec"
      ARTEMIS_SCRUB_NONPROD = "false"
      DATADOG_ENABLED       = var.datadog_enabled
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
      Name = "Artemis Audit Event Handler Lambda"
    }
  )
}

###############################################################################
# Event Stream Permissions
###############################################################################

resource "aws_iam_role" "audit-event-role" {
  name               = "${var.app}-audit-event-lambda"
  assume_role_policy = data.aws_iam_policy_document.lambda-assume-policy.json

  tags = merge(
    var.tags,
    {
      Name = "Artemis Audit Event Lambda Role"
    }
  )
}

module "audit-event-queue-receive" {
  source = "../role_policy_attachment"
  actions = [
    "sqs:ReceiveMessage",
    "sqs:DeleteMessage",
    "sqs:GetQueueAttributes",
  ]
  iam_role_names = [aws_iam_role.audit-event-role.name]
  name           = "${var.app}-audit-event-queue-receive"
  resources      = [var.audit_event_queue.arn]
}

module "audit-log-hec-token" {
  source         = "../role_policy_attachment"
  actions        = ["secretsmanager:GetSecretValue"]
  iam_role_names = [aws_iam_role.audit-event-role.name]
  name           = "${var.app}-audit-log-hec-token"
  resources = [
    "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:${var.app}/audit-log-hec-*",
  ]
}

resource "aws_lambda_permission" "audit-event-handler" {
  statement_id  = "AllowExecutionFromSQS"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.audit-event-handler.function_name
  principal     = "events.amazonaws.com"
  source_arn    = var.audit_event_queue.arn
}


###############################################################################
# Event Dispatch Event Source
###############################################################################

resource "aws_lambda_event_source_mapping" "audit-event-handler" {
  event_source_arn = var.audit_event_queue.arn
  function_name    = aws_lambda_function.audit-event-handler.arn
  enabled          = true
}
