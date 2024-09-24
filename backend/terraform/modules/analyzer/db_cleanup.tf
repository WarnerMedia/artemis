###############################################################################
# Lambda
###############################################################################

resource "aws_lambda_function" "db-cleanup" {
  function_name = "${var.app}-db-cleanup"

  s3_bucket = var.s3_analyzer_files_id
  s3_key    = "lambdas/db_cleanup/v${var.ver}/db_cleanup.zip"

  layers = var.lambda_layers



  handler       = var.datadog_enabled ? "datadog_lambda.handler.handler" : "handlers.handler"
  runtime       = var.lambda_runtime
  architectures = [var.lambda_architecture]
  memory_size   = 4096
  timeout       = 900

  role = aws_iam_role.db-cleanup-lambda-role.arn

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
      S3_BUCKET                   = var.s3_analyzer_files_id
      },
      var.datadog_enabled ? merge({
        DD_LAMBDA_HANDLER = "handlers.handler"
        DD_SERVICE        = "${var.app}-maintenance"
      }, var.datadog_environment_variables)
    : {})
  }

  tags = merge(
    var.tags,
    {
      Name = "Artemis Database Cleanup Lambda"
    }
  )
}

###############################################################################
# Lambda IAM
###############################################################################

resource "aws_iam_role" "db-cleanup-lambda-role" {
  name               = "${var.app}-db-cleanup"
  assume_role_policy = data.aws_iam_policy_document.lambda-assume-policy.json

  tags = merge(
    var.tags,
    {
      Name = "Artemis Database Cleanup Lambda Role"
    }
  )
}

module "ec2-policy" {
  source = "../role_policy_attachment"
  actions = [
    "ec2:DescribeInstances"
  ]
  iam_role_names = [
    aws_iam_role.db-cleanup-lambda-role.name
  ]
  name      = "${var.app}-ec2-policy"
  resources = ["*"]
}

module "s3-cleanup-policy" {
  source = "../role_policy_attachment"
  actions = [
    "s3:ListBucket",
    "s3:ListObjects",
    "s3:DeleteObject"
  ]
  iam_role_names = [
    aws_iam_role.db-cleanup-lambda-role.name
  ]
  name = "${var.app}-s3-cleanup-policy"
  resources = [
    var.s3_analyzer_files_arn,
    "${var.s3_analyzer_files_arn}/scans/*"
  ]
}

###############################################################################
# Database Cleanup Scheduling
###############################################################################

resource "aws_cloudwatch_event_rule" "db-cleanup-schedule" {
  name                = "${var.app}-db-cleanup-schedule"
  description         = "Event that triggers the DB cleanup Lambda"
  schedule_expression = "rate(15 minutes)" # Lambda has a 15 min max execution so don't run more often than that

  # This rule is disabled when in maintenance mode
  state = !var.maintenance_mode ? "ENABLED" : "DISABLED"
}

resource "aws_cloudwatch_event_target" "db-cleanup" {
  target_id = "${var.app}-db-cleanup"
  rule      = aws_cloudwatch_event_rule.db-cleanup-schedule.name
  arn       = aws_lambda_function.db-cleanup.arn
}

resource "aws_lambda_permission" "db-cleanup-from-cloudwatch" {
  statement_id  = "AllowExecutionFromCloudWatch"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.db-cleanup.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.db-cleanup-schedule.arn
}
