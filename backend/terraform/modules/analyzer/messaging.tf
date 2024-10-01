###############################################################################
# SQS
###############################################################################
locals {
  task_queues = [
    module.public_engine_cluster.task_queue.arn,
    module.public_engine_cluster.priority_task_queue.arn,
    module.nat_engine_cluster.task_queue.arn,
    module.nat_engine_cluster.priority_task_queue.arn,
    var.report_queue.arn
  ]
}

###############################################################################
# SQS Permissions
###############################################################################

module "task-queue-send" {
  source         = "../role_policy_attachment"
  actions        = ["sqs:SendMessage"]
  iam_role_names = [aws_iam_role.lambda-assume-role.name]
  name           = "${var.app}-task-queue-send"
  resources      = local.task_queues
}

module "task-queue-receive" {
  source = "../role_policy_attachment"
  actions = [
    "sqs:ReceiveMessage",
    "sqs:DeleteMessage",
  ]
  iam_role_names = [
    module.public_engine_cluster.engine-role.name,
    module.nat_engine_cluster.engine-role.name
  ]
  name      = "${var.app}-task-queue-receive"
  resources = local.task_queues
}

###############################################################################
# SQS Event Permissions
###############################################################################

###############################################################################
# Custom Metrics
###############################################################################

resource "aws_lambda_function" "sqs-metrics" {
  function_name = "${var.app}-task-queue-metrics"
  s3_bucket     = var.s3_analyzer_files_id
  s3_key        = "lambdas/task_queue_metrics/v${var.ver}/task_queue_metrics.zip"
  handler       = var.datadog_enabled ? "datadog_lambda.handler.handler" : "handlers.handler"
  runtime       = var.lambda_runtime
  architectures = [var.lambda_architecture]
  timeout       = 60
  layers        = var.lambda_layers
  memory_size   = 256
  role          = aws_iam_role.metrics-assume-role.arn

  logging_config {
    log_format = "JSON"
  }

  environment {
    variables = merge({
      DATADOG_ENABLED         = var.datadog_enabled
      TASK_QUEUE              = module.public_engine_cluster.task_queue.id
      PRIORITY_TASK_QUEUE     = module.public_engine_cluster.priority_task_queue.id
      TASK_QUEUE_NAT          = module.nat_engine_cluster.task_queue.id
      PRIORITY_TASK_QUEUE_NAT = module.nat_engine_cluster.priority_task_queue.id
      ENGINE_ASG_NAT          = module.nat_engine_cluster.engine-asg.name
      ENGINE_ASG_PUBLIC       = module.public_engine_cluster.engine-asg.name
      },
      var.datadog_enabled ? merge({
        DD_LAMBDA_HANDLER = "handlers.handler"
        DD_SERVICE        = "${var.app}-engine-task"
      }, var.datadog_environment_variables)
    : {})
  }

  tags = merge(
    var.tags,
    {
      Name = "Artemis Task Queue Metrics Lambda"
    }
  )
}

resource "aws_iam_role" "metrics-assume-role" {
  name               = "${var.app}-metrics-lambda"
  assume_role_policy = data.aws_iam_policy_document.lambda-assume-policy.json

  tags = merge(
    var.tags,
    {
      Name = "Artemis Metrics Lambda Role"
    }
  )
}

module "metrics-sqs-policy" {
  source         = "../role_policy_attachment"
  actions        = ["sqs:GetQueueAttributes"]
  iam_role_names = [aws_iam_role.metrics-assume-role.name]
  name           = "${var.app}-metrics-sqs-policy"
  resources      = local.task_queues
}

module "metrics-asg-policy" {
  source         = "../role_policy_attachment"
  actions        = ["autoscaling:DescribeAutoScalingGroups"]
  iam_role_names = [aws_iam_role.metrics-assume-role.name]
  name           = "${var.app}-metrics-asg-policy"
  resources      = ["*"]
}

module "metrics-cw-policy" {
  source         = "../role_policy_attachment"
  actions        = ["cloudwatch:PutMetricData"]
  iam_role_names = [aws_iam_role.metrics-assume-role.name]
  name           = "${var.app}-metrics-cw-policy"
  resources      = ["*"]
}

resource "aws_cloudwatch_event_rule" "every-minute" {
  name                = "${var.app}-run-every-minute"
  description         = "Event that fires every minute"
  schedule_expression = "rate(1 minute)"
}

resource "aws_cloudwatch_event_target" "queue-metrics" {
  target_id = "${var.app}-task-queue-metrics"
  rule      = aws_cloudwatch_event_rule.every-minute.name
  arn       = aws_lambda_function.sqs-metrics.arn
}

resource "aws_lambda_permission" "allow-cloudwatch" {
  statement_id  = "AllowExecutionFromCloudWatch"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.sqs-metrics.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.every-minute.arn
}
