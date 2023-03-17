###############################################################################
# Event Stream Dispatch Lambda
###############################################################################

resource "aws_lambda_function" "event-dispatch" {
  function_name = "${var.app}-event-dispatch"

  s3_bucket = var.s3_analyzer_files_id
  s3_key    = "lambdas/event_dispatch/v${var.ver}/event_dispatch.zip"

  handler       = "handlers.handler"
  runtime       = var.lambda_runtime
  architectures = [var.lambda_architecture]
  timeout       = 30

  role = aws_iam_role.event-role.arn

  environment {
    variables = merge({
      SECRETS_QUEUE                    = var.secrets_queue.id
      REGION                           = var.aws_region
      S3_BUCKET                        = var.s3_analyzer_files_id
      SECRETS_ENABLED                  = var.secrets_enabled
      ARTEMIS_AUDIT_QUEUE              = var.audit_event_queue.id
      ARTEMIS_ADDITIONAL_EVENT_ROUTING = var.additional_event_routing
    }, var.extra_env_vars_event_dispatch)
  }

  tags = merge(
    var.tags,
    {
      Name = "Artemis Event Stream Dispatch Lambda"
    }
  )
}

###############################################################################
# Event Stream Permissions
###############################################################################

resource "aws_iam_role" "event-role" {
  name               = "${var.app}-event-lambda"
  assume_role_policy = data.aws_iam_policy_document.lambda-assume-policy.json

  tags = merge(
    var.tags,
    {
      Name = "Artemis Event Lambda Role"
    }
  )
}

module "event-queue-send" {
  source  = "../role_policy_attachment"
  actions = ["sqs:SendMessage"]
  iam_role_names = [
    module.public_engine_cluster.engine-role.name,
    module.nat_engine_cluster.engine-role.name,
    aws_iam_role.lambda-assume-role.name
  ]
  name      = "${var.app}-event-queue-send"
  resources = [var.event_queue.arn]
}

module "event-queue-receive" {
  source = "../role_policy_attachment"
  actions = [
    "sqs:ReceiveMessage",
    "sqs:DeleteMessage",
    "sqs:GetQueueAttributes",
  ]
  iam_role_names = [
    module.public_engine_cluster.engine-role.name,
    module.nat_engine_cluster.engine-role.name,
    aws_iam_role.event-role.name
  ]
  name      = "${var.app}-event-queue-receive"
  resources = [var.event_queue.arn]
}

module "event-dispatch-queue-send" {
  source         = "../role_policy_attachment"
  actions        = ["sqs:SendMessage"]
  iam_role_names = [aws_iam_role.event-role.name]
  name           = "${var.app}-event-dispatch-queue-send"
  resources      = concat([var.secrets_queue.arn, var.audit_event_queue.arn], var.extra_event_dispatch_queues)
}

module "event-services-json" {
  source         = "../role_policy_attachment"
  actions        = ["s3:GetObject"]
  iam_role_names = [aws_iam_role.event-role.name]
  name           = "${var.app}-event-services-json"
  resources      = ["${var.s3_analyzer_files_arn}/services.json"]
}

resource "aws_lambda_permission" "event-dispatch" {
  statement_id  = "AllowExecutionFromSQS"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.event-dispatch.function_name
  principal     = "events.amazonaws.com"
  source_arn    = var.event_queue.arn
}

###############################################################################
# Event Dispatch Event Source
###############################################################################

resource "aws_lambda_event_source_mapping" "event-dispatch" {
  event_source_arn = var.event_queue.arn
  function_name    = aws_lambda_function.event-dispatch.arn
}
