###############################################################################
# Update Github Org Users Lambda
###############################################################################

resource "aws_lambda_function" "update_github_org_users" {
  function_name = "${var.app}-update-github-org-users"

  s3_bucket = var.s3_analyzer_files_id
  s3_key    = "lambdas/update_github_org_users/v${var.ver}/update_github_org_users.zip"

  layers = concat([
    aws_lambda_layer_version.artemislib.arn,
    aws_lambda_layer_version.artemisdb.arn
  ], var.extra_lambda_layers_update_github_org_users)

  lifecycle {
    ignore_changes = [
      # Ignore changes to the layers as the CI pipline will deploy newer versions
      layers
    ]
  }

  handler       = "handlers.handler"
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
    variables = {
      ANALYZER_DB_CREDS_ARN       = "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:${var.app}/db-user"
      ANALYZER_DJANGO_SECRETS_ARN = "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:${var.app}/django-secret-key"
      ARTEMIS_GITHUB_APP_ID       = var.github_app_id
      S3_BUCKET                   = var.s3_analyzer_files_id
    }
  }

  tags = merge(
    var.tags,
    {
      Name = "Artemis Update GitHub Org Users Lambda"
    }
  )
}

###############################################################################
# Scheduling
###############################################################################

resource "aws_cloudwatch_event_rule" "update-github-org-users" {
  name                = "${var.app}-run-update-github-org-users"
  description         = "Event that fires every hour"
  schedule_expression = "cron(0 * ? * * *)"

  # This rule is disabled when in maintenance mode
  is_enabled = !var.maintenance_mode
}

resource "aws_cloudwatch_event_target" "update-github-org-users" {
  target_id = "${var.app}-update-github-org-users"
  rule      = aws_cloudwatch_event_rule.update-github-org-users.name
  arn       = aws_lambda_function.update_github_org_users.arn
}

resource "aws_lambda_permission" "update-github-org-users-from-cloudwatch" {
  statement_id  = "AllowExecutionFromCloudWatch"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.update_github_org_users.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.update-github-org-users.arn
}

###############################################################################
# IAM
###############################################################################

module "lambda-invoke-policy_update-github-org-users" {
  source = "../role_policy_attachment"
  actions = [
    "lambda:InvokeFunction"
  ]
  iam_role_names = [aws_iam_role.lambda-assume-role.name]
  name           = "${var.app}-lamba-invoke_update-github-org-users"
  resources = [
    aws_lambda_function.update_github_org_users.arn
  ]
}
