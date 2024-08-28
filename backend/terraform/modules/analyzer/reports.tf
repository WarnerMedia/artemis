###############################################################################
# Report Lambdas
###############################################################################

resource "aws_lambda_function" "json_report" {
  function_name = "${var.app}-json-report"

  s3_bucket = var.s3_analyzer_files_id
  s3_key    = "lambdas/json_report/v${var.ver}/json_report.zip"

  layers = concat(var.datadog_enabled ? var.datadog_lambda_layers : [], [
    aws_lambda_layer_version.backend_core.arn
  ], var.extra_lambda_layers_json_report)

  lifecycle {
    ignore_changes = [
      # Ignore changes to the layers as the CI pipline will deploy newer versions
      layers
    ]
  }

  handler       = var.datadog_enabled ? "datadog_lambda.handler.handler" : "handlers.handler"
  runtime       = var.lambda_runtime
  architectures = [var.lambda_architecture]
  memory_size   = 1024
  timeout       = 300

  role = aws_iam_role.lambda-assume-role.arn

  vpc_config {
    subnet_ids = [
      aws_subnet.lambdas.id,
    ]

    security_group_ids = [aws_security_group.lambda-sg.id]
  }

  environment {
    variables = merge({
      DATADOG_ENABLED                   = var.datadog_enabled
      ANALYZER_DJANGO_SECRETS_ARN       = "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:${var.app}/django-secret-key"
      ANALYZER_DB_CREDS_ARN             = "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:${var.app}/db-user"
      ARTEMIS_METADATA_FORMATTER_MODULE = var.metadata_formatter_module
      },
      var.datadog_enabled ? merge({
        DD_LAMBDA_HANDLER     = "handlers.handler"
        DD_SERVICE            = "${var.app}-report-service"
        DD_API_KEY_SECRET_ARN = aws_secretsmanager_secret.datadog-api-key.arn
      }, var.datadog_lambda_variables)
    : {})
  }

  tags = merge(
    var.tags,
    {
      Name = "Artemis JSON Report Lambda"
    }
  )
}

resource "aws_lambda_function" "pdf_report" {
  function_name = "${var.app}-pdf-report"

  s3_bucket = var.s3_analyzer_files_id
  s3_key    = "lambdas/pdf_report/v${var.ver}/pdf_report.zip"

  layers = concat(var.datadog_enabled ? var.datadog_lambda_layers : [], [
    aws_lambda_layer_version.backend_core.arn
  ], var.extra_lambda_layers_pdf_report)

  lifecycle {
    ignore_changes = [
      # Ignore changes to the layers as the CI pipline will deploy newer versions
      layers
    ]
  }

  handler       = var.datadog_enabled ? "datadog_lambda.handler.handler" : "handlers.handler"
  runtime       = var.lambda_runtime
  architectures = [var.lambda_architecture]
  memory_size   = 1024
  timeout       = 900

  role = aws_iam_role.lambda-assume-role.arn

  vpc_config {
    subnet_ids = [
      aws_subnet.lambdas.id,
    ]

    security_group_ids = [aws_security_group.lambda-sg.id]
  }

  environment {
    variables = merge({
      DATADOG_ENABLED                   = var.datadog_enabled
      ANALYZER_DJANGO_SECRETS_ARN       = "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:${var.app}/django-secret-key"
      ANALYZER_DB_CREDS_ARN             = "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:${var.app}/db-user"
      S3_BUCKET                         = var.s3_analyzer_files_id
      ARTEMIS_METADATA_FORMATTER_MODULE = var.metadata_formatter_module
      },
      var.datadog_enabled ? merge({
        DD_LAMBDA_HANDLER     = "handlers.handler"
        DD_SERVICE            = "${var.app}-report-service"
        DD_API_KEY_SECRET_ARN = aws_secretsmanager_secret.datadog-api-key.arn
      }, var.datadog_lambda_variables)
    : {})
  }

  tags = merge(
    var.tags,
    {
      Name = "Artemis PDF Report Lambda"
    }
  )
}

resource "aws_lambda_function" "report_cleanup" {
  function_name = "${var.app}-report-cleanup"

  s3_bucket = var.s3_analyzer_files_id
  s3_key    = "lambdas/report_cleanup/v${var.ver}/report_cleanup.zip"

  layers = concat(var.datadog_enabled ? var.datadog_lambda_layers : [], [
    aws_lambda_layer_version.backend_core.arn
  ], var.extra_lambda_layers_report_cleanup)

  lifecycle {
    ignore_changes = [
      # Ignore changes to the layers as the CI pipline will deploy newer versions
      layers
    ]
  }

  handler       = var.datadog_enabled ? "datadog_lambda.handler.handler" : "handlers.handler"
  runtime       = var.lambda_runtime
  architectures = [var.lambda_architecture]
  memory_size   = 1024
  timeout       = 900

  role = aws_iam_role.lambda-assume-role.arn

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
      S3_BUCKET                   = var.s3_analyzer_files_id
      MAX_REPORT_AGE              = 1440
      },
      var.datadog_enabled ? merge({
        DD_LAMBDA_HANDLER     = "handlers.handler"
        DD_SERVICE            = "${var.app}-report-service"
        DD_API_KEY_SECRET_ARN = aws_secretsmanager_secret.datadog-api-key.arn
      }, var.datadog_lambda_variables)
    : {})
  }

  tags = merge(
    var.tags,
    {
      Name = "Artemis Report Cleanup Lambda"
    }
  )
}

resource "aws_lambda_function" "sbom_report" {
  function_name = "${var.app}-sbom-report"

  s3_bucket = var.s3_analyzer_files_id
  s3_key    = "lambdas/sbom_report/v${var.ver}/sbom_report.zip"

  layers = concat(var.datadog_enabled ? var.datadog_lambda_layers : [], [
    aws_lambda_layer_version.backend_core.arn
  ], var.extra_lambda_layers_sbom_report)

  lifecycle {
    ignore_changes = [
      # Ignore changes to the layers as the CI pipline will deploy newer versions
      layers
    ]
  }

  handler       = var.datadog_enabled ? "datadog_lambda.handler.handler" : "handlers.handler"
  runtime       = var.lambda_runtime
  architectures = [var.lambda_architecture]
  memory_size   = 1024
  timeout       = 300

  role = aws_iam_role.lambda-assume-role.arn

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
      S3_BUCKET                   = var.s3_analyzer_files_id
      ARTEMIS_LOG_LEVEL           = var.log_level
      },
      var.datadog_enabled ? merge({
        DD_LAMBDA_HANDLER     = "handlers.handler"
        DD_SERVICE            = "${var.app}-report-service"
        DD_API_KEY_SECRET_ARN = aws_secretsmanager_secret.datadog-api-key.arn
      }, var.datadog_lambda_variables)
    : {})
  }

  tags = merge(
    var.tags,
    {
      Name = "Artemis SBOM Report Lambda"
    }
  )
}

###############################################################################
# Report IAM
###############################################################################

module "lambda-invoke-policy" {
  source = "../role_policy_attachment"
  actions = [
    "lambda:InvokeFunction"
  ]
  iam_role_names = [aws_iam_role.lambda-assume-role.name]
  name           = "${var.app}-lamba-invoke"
  resources = [
    aws_lambda_function.json_report.arn,
    aws_lambda_function.sbom_report.arn
  ]
}

module "s3-reports-lambda-policy" {
  source = "../role_policy_attachment"
  actions = [
    "s3:GetObject",
    "s3:PutObject",
    "s3:DeleteObject"
  ]
  iam_role_names = [aws_iam_role.lambda-assume-role.name]
  name           = "${var.app}-lambda-s3-reports"
  resources = [
    "${var.s3_analyzer_files_arn}/reports/*"
  ]
}

module "report-queue-send-recv" {
  source = "../role_policy_attachment"
  actions = [
    "sqs:SendMessage",
    "sqs:ReceiveMessage",
    "sqs:DeleteMessage",
    "sqs:GetQueueAttributes"
  ]
  iam_role_names = [aws_iam_role.lambda-assume-role.name]
  name           = "${var.app}-reports-queue-send-recv"
  resources = [
    var.report_queue.arn
  ]
}

###############################################################################
# Report Queue Event Source
###############################################################################

resource "aws_lambda_permission" "pdf-report-generation" {
  statement_id  = "AllowExecutionFromSQS"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.pdf_report.function_name
  principal     = "events.amazonaws.com"
  source_arn    = var.report_queue.arn
}

resource "aws_lambda_event_source_mapping" "report-queue" {
  event_source_arn = var.report_queue.arn
  function_name    = aws_lambda_function.pdf_report.arn
  batch_size       = 1
}

###############################################################################
# Report Cleanup
###############################################################################

resource "aws_cloudwatch_event_rule" "every-day" {
  name                = "${var.app}-run-every-day"
  description         = "Event that fires every every day at 12am ET"
  schedule_expression = "cron(0 4 ? * * *)"

  # This rule is disabled when in maintenance mode
  is_enabled = !var.maintenance_mode
}

resource "aws_cloudwatch_event_target" "report-cleanup" {
  target_id = "${var.app}-report-cleanup"
  rule      = aws_cloudwatch_event_rule.every-day.name
  arn       = aws_lambda_function.report_cleanup.arn
}

resource "aws_lambda_permission" "report-cleanup-from-cloudwatch" {
  statement_id  = "AllowExecutionFromCloudWatch"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.repo-handler.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.every-day.arn
}
