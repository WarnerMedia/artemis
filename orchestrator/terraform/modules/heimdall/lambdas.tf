###############################################################################
# Batch Lambdas
###############################################################################

resource "aws_lambda_function" "org-queue" {
  function_name = "${var.app}-org-queue"

  logging_config {
    log_format            = "JSON"
    application_log_level = var.application_log_level
    system_log_level      = var.system_log_level
  }

  s3_bucket = aws_s3_bucket.heimdall_files.id
  s3_key    = "lambdas/org_queue/v${var.ver}/org_queue.zip"

  handler       = var.datadog_enabled ? "datadog_lambda.handler.handler" : "handlers.handler"
  runtime       = var.lambda_runtime
  architectures = [var.lambda_architecture]
  memory_size   = 1024
  timeout       = var.org_queue_lambda_timeout

  role = aws_iam_role.vpc-lambda-assume-role.arn

  layers = var.lambda_layers

  environment {
    variables = merge({
      APPLICATION                       = var.app
      REGION                            = var.aws_region
      ARTEMIS_S3_BUCKET                 = data.aws_s3_bucket.artemis_s3_bucket.bucket
      ORG_QUEUE                         = aws_sqs_queue.org-queue.id
      DEFAULT_API_TIMEOUT               = var.third_party_api_timeout
      HEIMDALL_GITHUB_APP_ID            = var.github_app_id
      HEIMDALL_GITHUB_PRIVATE_KEY       = var.github_private_key
      ARTEMIS_API                       = var.artemis_api
      ARTEMIS_REVPROXY_DOMAIN_SUBSTRING = var.revproxy_domain_substring
      ARTEMIS_REVPROXY_SECRET           = var.revproxy_secret
      ARTEMIS_REVPROXY_SECRET_REGION    = var.revproxy_secret_region
      DATADOG_ENABLED                   = var.datadog_enabled
      },
      var.datadog_enabled ? merge({
        DD_LAMBDA_HANDLER     = "handlers.handler"
        DD_SERVICE            = "${var.app}"
        DD_API_KEY_SECRET_ARN = aws_secretsmanager_secret.datadog-api-key.arn
      }, var.datadog_environment_variables)
    : {})
  }

  vpc_config {
    subnet_ids         = [aws_subnet.lambdas.id]
    security_group_ids = [aws_security_group.lambda-sg.id]
  }

  tags = merge(
    var.tags,
    {
      "Name" = "Heimdall Org Queuing Lambda"
    }
  )
}

resource "aws_lambda_function" "repo-queue" {
  function_name = "${var.app}-repo-queue"

  logging_config {
    log_format            = "JSON"
    application_log_level = var.application_log_level
    system_log_level      = var.system_log_level
  }

  s3_bucket = aws_s3_bucket.heimdall_files.id
  s3_key    = "lambdas/repo_queue/v${var.ver}/repo_queue.zip"

  handler       = var.datadog_enabled ? "datadog_lambda.handler.handler" : "handlers.handler"
  runtime       = var.lambda_runtime
  architectures = [var.lambda_architecture]
  timeout       = var.repo_queue_lambda_timeout
  memory_size   = 1024

  role = aws_iam_role.vpc-lambda-assume-role.arn

  layers = lambda_layers
  environment {
    variables = merge({
      APPLICATION                       = var.app
      REGION                            = var.aws_region
      ARTEMIS_S3_BUCKET                 = data.aws_s3_bucket.artemis_s3_bucket.bucket
      REPO_QUEUE                        = aws_sqs_queue.repo-queue.id
      ORG_QUEUE                         = aws_sqs_queue.org-queue.id
      DEFAULT_API_TIMEOUT               = var.third_party_api_timeout
      HEIMDALL_GITHUB_APP_ID            = var.github_app_id
      HEIMDALL_GITHUB_PRIVATE_KEY       = var.github_private_key
      ARTEMIS_API                       = var.artemis_api
      ARTEMIS_REVPROXY_DOMAIN_SUBSTRING = var.revproxy_domain_substring
      ARTEMIS_REVPROXY_SECRET           = var.revproxy_secret
      ARTEMIS_REVPROXY_SECRET_REGION    = var.revproxy_secret_region
      DATADOG_ENABLED                   = var.datadog_enabled
      },
      var.datadog_enabled ? merge({
        DD_LAMBDA_HANDLER     = "handlers.handler"
        DD_SERVICE            = "${var.app}"
        DD_API_KEY_SECRET_ARN = aws_secretsmanager_secret.datadog-api-key.arn
      }, var.datadog_environment_variables)
    : {})
  }

  vpc_config {
    subnet_ids         = [aws_subnet.lambdas.id]
    security_group_ids = [aws_security_group.lambda-sg.id]
  }

  tags = merge(
    var.tags,
    {
      "Name" = "Heimdall Repo Queuing Lambda"
    }
  )
}

resource "aws_lambda_function" "repo-scan" {
  function_name = "${var.app}-repo-scan"

  logging_config {
    log_format            = "JSON"
    application_log_level = var.application_log_level
    system_log_level      = var.system_log_level
  }

  s3_bucket = aws_s3_bucket.heimdall_files.id
  s3_key    = "lambdas/repo_scan/v${var.ver}/repo_scan.zip"

  handler       = var.datadog_enabled ? "datadog_lambda.handler.handler" : "handlers.handler"
  runtime       = var.lambda_runtime
  architectures = [var.lambda_architecture]
  timeout       = var.repo_scan_lambda_timeout

  role = aws_iam_role.lambda-assume-role.arn

  layers = var.lambda_layers
  environment {
    variables = merge({
      APPLICATION            = var.app
      REGION                 = var.aws_region
      ARTEMIS_API            = var.artemis_api
      ARTEMIS_API_KEY        = aws_secretsmanager_secret.artemis-api-key.name
      REPO_QUEUE             = aws_sqs_queue.repo-queue.id
      SCAN_TABLE             = aws_dynamodb_table.repo-scan-id.name
      REPO_DEAD_LETTER_QUEUE = aws_sqs_queue.repo-deadletter-queue.id
      DATADOG_ENABLED        = var.datadog_enabled
      },
      var.datadog_enabled ? merge({
        DD_LAMBDA_HANDLER     = "handlers.handler"
        DD_SERVICE            = "${var.app}"
        DD_API_KEY_SECRET_ARN = aws_secretsmanager_secret.datadog-api-key.arn
      }, var.datadog_environment_variables)
    : {})
  }

  tags = merge(
    var.tags,
    {
      "Name" = "Heimdall Repo Scanning Lambda"
    }
  )
}

resource "aws_lambda_function" "repo-scan-loop" {
  function_name = "${var.app}-repo-scan-loop"

  logging_config {
    log_format            = "JSON"
    application_log_level = var.application_log_level
    system_log_level      = var.system_log_level
  }

  s3_bucket = aws_s3_bucket.heimdall_files.id
  s3_key    = "lambdas/repo_scan_loop/v${var.ver}/repo_scan_loop.zip"

  handler       = var.datadog_enabled ? "datadog_lambda.handler.handler" : "handlers.handler"
  runtime       = var.lambda_runtime
  architectures = [var.lambda_architecture]
  timeout       = 900

  role = aws_iam_role.lambda-assume-role.arn

  layers = var.lambda_layers

  environment {
    variables = merge({
      APPLICATION               = var.app
      REGION                    = var.aws_region
      HEIMDALL_REPO_SCAN_LAMBDA = aws_lambda_function.repo-scan.function_name
      HEIMDALL_INVOKE_COUNT     = 10
      DATADOG_ENABLED           = var.datadog_enabled
      },
      var.datadog_enabled ? merge({
        DD_LAMBDA_HANDLER     = "handlers.handler"
        DD_SERVICE            = "${var.app}"
        DD_API_KEY_SECRET_ARN = aws_secretsmanager_secret.datadog-api-key.arn
      }, var.datadog_environment_variables)
    : {})
  }

  tags = merge(
    var.tags,
    {
      "Name" = "Heimdall Repo Scan Loop Lambda"
    }
  )
}

###############################################################################
# Lambda Layers
###############################################################################

resource "aws_lambda_layer_version" "heimdall_core" {
  layer_name          = "${var.app}-core"
  s3_bucket           = aws_s3_bucket.heimdall_files.id
  s3_key              = "lambdas/layers/heimdall_core/v${var.ver}/heimdall_core.zip"
  compatible_runtimes = [var.lambda_runtime]
}

data "aws_lambda_layer_version" "heimdall_core" {
  layer_name = "${var.app}-core"
}

###############################################################################
# Lambda Permissions
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

resource "aws_iam_role" "lambda-assume-role" {
  name               = "${var.app}-lambda"
  assume_role_policy = data.aws_iam_policy_document.lambda-assume-policy.json

  tags = merge(
    var.tags,
    {
      "Name" = "Heimdall Lambda Role"
    }
  )
}

resource "aws_iam_role" "vpc-lambda-assume-role" {
  name               = "${var.app}-vpc-lambda"
  assume_role_policy = data.aws_iam_policy_document.lambda-assume-policy.json

  tags = merge(
    var.tags,
    {
      "Name" = "Heimdall Webhook VPC Lambda Role"
    }
  )
}

data "aws_caller_identity" "current" {}

provider "aws" {
  alias   = "artemis_revproxy"
  region  = var.revproxy_secret_region
  profile = var.profile
}

data "aws_secretsmanager_secret" "artemis_proxy_secret" {
  provider = aws.artemis_revproxy
  name     = var.revproxy_secret
}

data "aws_secretsmanager_secret" "github_private_key" {
  name = var.github_private_key
}

data "aws_iam_policy_document" "access-secrets" {
  statement {
    effect = "Allow"

    actions = [
      "secretsmanager:GetSecretValue",
    ]

    resources = [
      "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:${var.app}/*",
      data.aws_secretsmanager_secret.artemis_proxy_secret.arn,
      data.aws_secretsmanager_secret.github_private_key.arn
    ]
  }
}

resource "aws_iam_policy" "access-secrets" {
  name   = "${var.app}-access-secrets"
  policy = data.aws_iam_policy_document.access-secrets.json
}

resource "aws_iam_role_policy_attachment" "access-secrets" {
  role       = aws_iam_role.lambda-assume-role.name
  policy_arn = aws_iam_policy.access-secrets.arn
}

resource "aws_iam_role_policy_attachment" "vpc-access-secrets" {
  role       = aws_iam_role.vpc-lambda-assume-role.name
  policy_arn = aws_iam_policy.access-secrets.arn
}

data "aws_iam_policy_document" "write-logs" {
  statement {
    effect = "Allow"

    actions = [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents",
    ]

    resources = [
      "arn:aws:logs:*:*:*",
    ]
  }
}

resource "aws_iam_policy" "write-logs" {
  name   = "${var.app}-write-logs"
  policy = data.aws_iam_policy_document.write-logs.json
}

resource "aws_iam_role_policy_attachment" "api-write-logs" {
  role       = aws_iam_role.lambda-assume-role.name
  policy_arn = aws_iam_policy.write-logs.arn
}

resource "aws_iam_role_policy_attachment" "vpc-write-logs" {
  role       = aws_iam_role.vpc-lambda-assume-role.name
  policy_arn = aws_iam_policy.write-logs.arn
}

data "aws_iam_policy_document" "batch-write-dynamodb-records" {
  statement {
    effect = "Allow"

    actions = [
      "dynamodb:BatchWriteItem"
    ]

    resources = [
      aws_dynamodb_table.repo-scan-id.arn
    ]
  }
}

resource "aws_iam_policy" "batch-write-dynamodb-records" {
  name   = "${var.app}-batch-write-dynamodb-records"
  policy = data.aws_iam_policy_document.batch-write-dynamodb-records.json
}

resource "aws_iam_role_policy_attachment" "api-batch-write-dynamodb-records" {
  role       = aws_iam_role.lambda-assume-role.name
  policy_arn = aws_iam_policy.batch-write-dynamodb-records.arn
}

resource "aws_iam_role_policy_attachment" "vpc-batch-write-dynamodb-records" {
  role       = aws_iam_role.vpc-lambda-assume-role.name
  policy_arn = aws_iam_policy.batch-write-dynamodb-records.arn
}

data "aws_iam_policy_document" "analyzer-s3-services-json-lambda-policy" {
  statement {
    effect = "Allow"

    actions = [
      "s3:GetObject",
    ]

    resources = [
      "${data.aws_s3_bucket.artemis_s3_bucket.arn}/services.json"
    ]
  }
}

resource "aws_iam_policy" "analyzer-s3-services-json-lambda-policy" {
  name   = "${var.app}-analyzer-s3-services-json-lambda-policy"
  policy = data.aws_iam_policy_document.analyzer-s3-services-json-lambda-policy.json
}

resource "aws_iam_role_policy_attachment" "api-get-s3-services-json" {
  role       = aws_iam_role.lambda-assume-role.name
  policy_arn = aws_iam_policy.analyzer-s3-services-json-lambda-policy.arn
}

resource "aws_iam_role_policy_attachment" "vpc-get-s3-services-json" {
  role       = aws_iam_role.vpc-lambda-assume-role.name
  policy_arn = aws_iam_policy.analyzer-s3-services-json-lambda-policy.arn
}

data "aws_iam_policy_document" "repo-scan-lambda-invoke" {
  statement {
    effect = "Allow"

    actions = [
      "lambda:InvokeFunction",
    ]

    resources = [
      aws_lambda_function.repo-scan.arn
    ]
  }
}

resource "aws_iam_policy" "repo-scan-lambda-invoke" {
  name   = "${var.app}-repo-scan-lambda-invoke"
  policy = data.aws_iam_policy_document.repo-scan-lambda-invoke.json
}

resource "aws_iam_role_policy_attachment" "repo-scan-lambda-invoke" {
  role       = aws_iam_role.lambda-assume-role.name
  policy_arn = aws_iam_policy.repo-scan-lambda-invoke.arn
}

###############################################################################
# Lambda Scheduling
###############################################################################

resource "aws_cloudwatch_event_rule" "repo-scan-loop-rate" {
  name                = "${var.app}-repo-scan-loop-rate"
  description         = "The rate at which repo-scan-loop lambda runs"
  schedule_expression = var.repo_scan_loop_rate
  is_enabled          = var.scanning_enabled
  tags = merge(
    var.tags,
    {
      "Name" : "Heimdall Repo Scan Loop Lambda Rate"
    }
  )
}

resource "aws_cloudwatch_event_target" "repo-scan-loop" {
  target_id = "${var.app}-repo-scan-loop"
  rule      = aws_cloudwatch_event_rule.repo-scan-loop-rate.name
  arn       = aws_lambda_function.repo-scan-loop.arn
}

resource "aws_lambda_permission" "repo-queue-from-sqs" {
  statement_id  = "AllowExecutionFromSQS"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.repo-queue.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_sqs_queue.org-queue.arn
}

resource "aws_lambda_permission" "repo-scan-allow-cloudwatch" {
  statement_id  = "AllowExecutionFromCloudWatch"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.repo-scan-loop.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.repo-scan-loop-rate.arn
}

###############################################################################
# Org Queue Event Source
###############################################################################

resource "aws_lambda_event_source_mapping" "org-queue" {
  event_source_arn = aws_sqs_queue.org-queue.arn
  function_name    = aws_lambda_function.repo-queue.arn
  batch_size       = 1

  function_response_types = ["ReportBatchItemFailures"]
}
