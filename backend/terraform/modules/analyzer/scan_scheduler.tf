###############################################################################
# Scan Scheduling Lambdas
###############################################################################

resource "aws_lambda_function" "scan_scheduler" {
  function_name = "${var.app}-scan-scheduler"

  s3_bucket = var.s3_analyzer_files_id
  s3_key    = "lambdas/scan_scheduler/v${var.ver}/scan_scheduler.zip"

  layers = var.lambda_layers



  handler       = "handlers.handler"
  runtime       = var.lambda_runtime
  architectures = [var.lambda_architecture]
  timeout       = 30

  role = aws_iam_role.scan-scheduler-role.arn

  environment {
    variables = merge({
      DATADOG_ENABLED               = var.datadog_enabled
      ANALYZER_DJANGO_SECRETS_ARN   = "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:${var.app}/django-secret-key"
      ANALYZER_DB_CREDS_ARN         = "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:${var.app}/db-user"
      ARTEMIS_SCHEDULED_SCANS_QUEUE = var.scheduled_scan_queue.id
      ARTEMIS_LOG_LEVEL             = var.log_level
      },
      var.datadog_enabled ? merge({
        DD_LAMBDA_HANDLER = "handlers.handler"
        DD_SERVICE        = "${var.app}-scheduled-events"
      }, var.datadog_environment_variables)
    : {})
  }

  vpc_config {
    subnet_ids = [
      aws_subnet.lambdas.id,
    ]

    security_group_ids = [aws_security_group.lambda-sg.id]
  }

  tags = merge(
    var.tags,
    {
      Name = "Artemis Scan Scheduler Lambda"
    }
  )
}

resource "aws_lambda_function" "scheduled_scan_handler" {
  function_name = "${var.app}-scheduled-scan-handler"

  s3_bucket = var.s3_analyzer_files_id
  s3_key    = "lambdas/scheduled_scan_handler/v${var.ver}/scheduled_scan_handler.zip"

  layers = var.lambda_layers



  handler       = "handlers.handler"
  runtime       = var.lambda_runtime
  architectures = [var.lambda_architecture]
  timeout       = 30

  role = aws_iam_role.scheduled-scan-handler-role.arn

  environment {
    variables = merge({
      DATADOG_ENABLED             = var.datadog_enabled
      ARTEMIS_API                 = "https://${var.domain_name}/api/v1"
      ANALYZER_DJANGO_SECRETS_ARN = "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:${var.app}/django-secret-key"
      ANALYZER_DB_CREDS_ARN       = "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:${var.app}/db-user"
      ARTEMIS_LOG_LEVEL           = var.log_level
      },
      var.datadog_enabled ? merge({
        DD_LAMBDA_HANDLER = "handlers.handler"
        DD_SERVICE        = "${var.app}-scheduled-events"
      }, var.datadog_environment_variables)
    : {})
  }

  vpc_config {
    subnet_ids = [
      aws_subnet.lambdas.id,
    ]

    security_group_ids = [aws_security_group.lambda-sg.id]
  }

  tags = merge(
    var.tags,
    {
      Name = "Artemis Scheduled Scan Handler Lambda"
    }
  )
}

###############################################################################
# Scan Scheduler Permissions
###############################################################################

resource "aws_iam_role" "scan-scheduler-role" {
  name               = "${var.app}-scan-scheduler-lambda"
  assume_role_policy = data.aws_iam_policy_document.lambda-assume-policy.json

  tags = merge(
    var.tags,
    {
      Name = "Artemis Scan Scheduler Lambda Role"
    }
  )
}

resource "aws_iam_role" "scheduled-scan-handler-role" {
  name               = "${var.app}-scheduled-scan-handler-lambda"
  assume_role_policy = data.aws_iam_policy_document.lambda-assume-policy.json

  tags = merge(
    var.tags,
    {
      Name = "Artemis Scheduled Scan Handler Lambda Role"
    }
  )
}

module "scheduled-scan-queue-send" {
  source = "../role_policy_attachment"
  actions = [
    "sqs:SendMessage"
  ]
  iam_role_names = [aws_iam_role.scan-scheduler-role.name]
  name           = "${var.app}-scan-scheduler-queue-send"
  resources      = [var.scheduled_scan_queue.arn]
}

module "scheduled-scan-queue-receive" {
  source = "../role_policy_attachment"
  actions = [
    "sqs:ReceiveMessage",
    "sqs:DeleteMessage",
    "sqs:GetQueueAttributes",
  ]
  iam_role_names = [aws_iam_role.scheduled-scan-handler-role.name]
  name           = "${var.app}-scan-scheduler-queue-receive"
  resources      = [var.scheduled_scan_queue.arn]
}

module "scheduler-api-key" {
  source         = "../role_policy_attachment"
  actions        = ["secretsmanager:GetSecretValue"]
  iam_role_names = [aws_iam_role.scheduled-scan-handler-role.name]
  name           = "${var.app}-scheduler-api-key"
  resources = [
    "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:${var.app}/scheduler-api-key-*",
  ]
}

module "scheduler-db-creds" {
  source  = "../role_policy_attachment"
  actions = ["secretsmanager:GetSecretValue"]
  iam_role_names = [
    aws_iam_role.scan-scheduler-role.name,
    aws_iam_role.scheduled-scan-handler-role.name
  ]
  name = "${var.app}-scheduler-db-creds"
  resources = [
    "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:${var.app}/django-secret-key-*",
    "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:${var.app}/db-user-*"
  ]
}

resource "aws_lambda_permission" "scheduled-scan-handler" {
  statement_id  = "AllowExecutionFromSQS"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.scheduled_scan_handler.function_name
  principal     = "events.amazonaws.com"
  source_arn    = var.scheduled_scan_queue.arn
}


###############################################################################
# Scheduled Scans Event Source
###############################################################################

resource "aws_lambda_event_source_mapping" "scheduled-scan-handler" {
  event_source_arn = var.scheduled_scan_queue.arn
  function_name    = aws_lambda_function.scheduled_scan_handler.function_name
  enabled          = true
}

###############################################################################
# Scheduling
###############################################################################

resource "aws_cloudwatch_event_rule" "run-scheduled-scans" {
  name                = "${var.app}-run-scheduled-scans"
  description         = "Event that fires every minute"
  schedule_expression = "rate(1 minute)"

  # This rule is disabled when in maintenance mode
  state = !var.maintenance_mode ? "ENABLED" : "DISABLED"
}

resource "aws_cloudwatch_event_target" "scan-scheduler" {
  target_id = "${var.app}-scan-scheduler"
  rule      = aws_cloudwatch_event_rule.run-scheduled-scans.name
  arn       = aws_lambda_function.scan_scheduler.arn
}

resource "aws_lambda_permission" "run-scan-scheduler-from-cloudwatch" {
  statement_id  = "AllowExecutionFromCloudWatch"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.scan_scheduler.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.run-scheduled-scans.arn
}
