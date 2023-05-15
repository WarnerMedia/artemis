###############################################################################
# Batch Lambdas
###############################################################################

resource "aws_lambda_function" "org-queue" {
  function_name = "${var.app}-org-queue"

  s3_bucket = aws_s3_bucket.heimdall_files.id
  s3_key    = "lambdas/org_queue/v${var.ver}/org_queue.zip"

  handler       = "handlers.handler"
  runtime       = var.lambda_runtime
  architectures = [var.lambda_architecture]
  memory_size   = 1024
  timeout       = var.org_queue_lambda_timeout

  role = aws_iam_role.vpc-lambda-assume-role.arn

  layers = [
    aws_lambda_layer_version.lambda_layers_orgs.arn,
    aws_lambda_layer_version.lambda_layers_utils.arn
  ]

  lifecycle {
    ignore_changes = [
      # Ignore changes to the layers as the Makefile will deploy newer versions
      layers
    ]
  }

  environment {
    variables = {
      APPLICATION                 = var.app
      REGION                      = var.aws_region
      ARTEMIS_S3_BUCKET           = data.aws_s3_bucket.artemis_s3_bucket.bucket
      ORG_QUEUE                   = aws_sqs_queue.org-queue.id
      HEIMDALL_GITHUB_APP_ID      = var.github_app_id
      HEIMDALL_GITHUB_PRIVATE_KEY = var.github_private_key
      ARTEMIS_API                 = var.artemis_api
      HEIMDALL_LOG_LEVEL          = var.log_level
    }
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

  s3_bucket = aws_s3_bucket.heimdall_files.id
  s3_key    = "lambdas/repo_queue/v${var.ver}/repo_queue.zip"

  handler       = "handlers.handler"
  runtime       = var.lambda_runtime
  architectures = [var.lambda_architecture]
  timeout       = var.repo_queue_lambda_timeout

  role = aws_iam_role.vpc-lambda-assume-role.arn

  layers = [
    aws_lambda_layer_version.lambda_layers_utils.arn,
    aws_lambda_layer_version.lambda_layers_repos.arn
  ]

  lifecycle {
    ignore_changes = [
      # Ignore changes to the layers as the Makefile will deploy newer versions
      layers
    ]
  }

  environment {
    variables = {
      APPLICATION                 = var.app
      REGION                      = var.aws_region
      ARTEMIS_S3_BUCKET           = data.aws_s3_bucket.artemis_s3_bucket.bucket
      REPO_QUEUE                  = aws_sqs_queue.repo-queue.id
      ORG_QUEUE                   = aws_sqs_queue.org-queue.id
      HEIMDALL_GITHUB_APP_ID      = var.github_app_id
      HEIMDALL_GITHUB_PRIVATE_KEY = var.github_private_key
      ARTEMIS_API                 = var.artemis_api
      HEIMDALL_LOG_LEVEL          = var.log_level
    }
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

  s3_bucket = aws_s3_bucket.heimdall_files.id
  s3_key    = "lambdas/repo_scan/v${var.ver}/repo_scan.zip"

  handler       = "handlers.handler"
  runtime       = var.lambda_runtime
  architectures = [var.lambda_architecture]
  timeout       = var.repo_scan_lambda_timeout

  role = aws_iam_role.lambda-assume-role.arn

  layers = [
    aws_lambda_layer_version.lambda_layers_utils.arn
  ]

  lifecycle {
    ignore_changes = [
      # Ignore changes to the layers as the Makefile will deploy newer versions
      layers
    ]
  }

  environment {
    variables = {
      APPLICATION        = var.app
      REGION             = var.aws_region
      ARTEMIS_API        = var.artemis_api
      ARTEMIS_API_KEY    = aws_secretsmanager_secret.artemis-api-key.name
      REPO_QUEUE         = aws_sqs_queue.repo-queue.id
      SCAN_TABLE         = aws_dynamodb_table.repo-scan-id.name
      HEIMDALL_LOG_LEVEL = var.log_level
    }
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

  s3_bucket = aws_s3_bucket.heimdall_files.id
  s3_key    = "lambdas/repo_scan_loop/v${var.ver}/repo_scan_loop.zip"

  handler       = "handlers.handler"
  runtime       = var.lambda_runtime
  architectures = [var.lambda_architecture]
  timeout       = 900

  role = aws_iam_role.lambda-assume-role.arn

  layers = [
    aws_lambda_layer_version.lambda_layers_utils.arn
  ]

  lifecycle {
    ignore_changes = [
      # Ignore changes to the layers as the Makefile will deploy newer versions
      layers
    ]
  }

  environment {
    variables = {
      APPLICATION               = var.app
      REGION                    = var.aws_region
      HEIMDALL_REPO_SCAN_LAMBDA = aws_lambda_function.repo-scan.function_name,
      HEIMDALL_INVOKE_COUNT     = 10
      HEIMDALL_LOG_LEVEL        = var.log_level
    }
  }

  tags = merge(
    var.tags,
    {
      "Name" = "Heimdall Repo Scan Loop Lambda"
    }
  )
}

resource "aws_lambda_layer_version" "lambda_layers_orgs" {
  layer_name          = "${var.app}-orgs"
  s3_bucket           = aws_s3_bucket.heimdall_files.id
  s3_key              = "lambdas/layers/orgs/v${var.ver}/orgs.zip"
  compatible_runtimes = [var.lambda_runtime]
}

resource "aws_lambda_layer_version" "lambda_layers_utils" {
  layer_name          = "${var.app}-utils"
  s3_bucket           = aws_s3_bucket.heimdall_files.id
  s3_key              = "lambdas/layers/utils/v${var.ver}/utils.zip"
  compatible_runtimes = [var.lambda_runtime]
}

resource "aws_lambda_layer_version" "lambda_layers_repos" {
  layer_name          = "${var.app}-repos"
  s3_bucket           = aws_s3_bucket.heimdall_files.id
  s3_key              = "lambdas/layers/repos/v${var.ver}/repos.zip"
  compatible_runtimes = [var.lambda_runtime]
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
data "aws_secretsmanager_secret" "artemis_proxy_secret" {
  name = var.revproxy_api_key
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
}
