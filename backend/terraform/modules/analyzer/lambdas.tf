###############################################################################
# Lambda VPC Networking
###############################################################################

#######################################
# Subnets
#######################################

resource "aws_subnet" "nat-gw" {
  vpc_id            = var.vpc_id
  cidr_block        = var.nat_gw_cidr
  availability_zone = var.lambda_availability_zone

  tags = merge(
    var.tags,
    {
      Name = "Artemis NAT GW Public Subnet"
    }
  )
}

# Allow NAT GW subnet to route out through the IGW
resource "aws_route_table_association" "nat-gw-route-table" {
  subnet_id      = aws_subnet.nat-gw.id
  route_table_id = var.vpc_route_table_id
}

resource "aws_subnet" "lambdas" {
  vpc_id            = var.vpc_id
  cidr_block        = var.lambda_cidr
  availability_zone = var.lambda_availability_zone

  tags = merge(
    var.tags,
    {
      Name = "Artemis API Lambda Subnet"
    }
  )
}

#######################################
# NAT Gateway
#######################################

# Create a NAT gateway with an EIP for each private subnet to get internet connectivity
resource "aws_eip" "lambda_nat" {
  vpc = true

  tags = merge(
    var.tags,
    {
      Name = "Artemis NAT Gateway EIP"
    }
  )
}

resource "aws_nat_gateway" "lambda_nat" {
  subnet_id     = aws_subnet.nat-gw.id
  allocation_id = aws_eip.lambda_nat.id

  tags = merge(
    var.tags,
    {
      Name = "Artemis Lambda NAT Gateway"
    }
  )
}

resource "aws_route_table" "lambda_routes" {
  vpc_id = var.vpc_id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.lambda_nat.id
  }

  tags = merge(
    var.tags,
    {
      Name = "Artemis Lambda Route Table"
    }
  )
}

# Allow Lambda subnet to route out through the NAT GW
resource "aws_route_table_association" "lambda-route-table" {
  subnet_id      = aws_subnet.lambdas.id
  route_table_id = aws_route_table.lambda_routes.id
}

#######################################
# Security Group
#######################################

resource "aws_security_group" "lambda-sg" {
  name   = "${var.app}-vpc-lambda"
  vpc_id = var.vpc_id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = -1
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(
    var.tags,
    {
      Name = "Artemis Lambda Security Group"
    }
  )
}

###############################################################################
# Lambda Layers
###############################################################################

resource "aws_lambda_layer_version" "artemislib" {
  layer_name          = "${var.app}-artemislib"
  s3_bucket           = var.s3_analyzer_files_id
  s3_key              = "lambdas/artemislib/v${var.ver}/artemislib.zip"
  compatible_runtimes = [var.lambda_runtime]
}

resource "aws_lambda_layer_version" "artemisdb" {
  layer_name          = "${var.app}-artemisdb"
  s3_bucket           = var.s3_analyzer_files_id
  s3_key              = "lambdas/artemisdb/v${var.ver}/artemisdb.zip"
  compatible_runtimes = [var.lambda_runtime]
}

resource "aws_lambda_layer_version" "artemisapi" {
  layer_name          = "${var.app}-artemisapi"
  s3_bucket           = var.s3_analyzer_files_id
  s3_key              = "lambdas/artemisapi/v${var.ver}/artemisapi.zip"
  compatible_runtimes = [var.lambda_runtime]
}

###############################################################################
# Lambdas
###############################################################################

resource "aws_lambda_function" "repo-handler" {
  function_name = "${var.app}-repo-handler"

  s3_bucket = var.s3_analyzer_files_id
  s3_key    = "lambdas/repo/v${var.ver}/repo.zip"

  layers = [
    aws_lambda_layer_version.artemislib.arn,
    aws_lambda_layer_version.artemisdb.arn,
    aws_lambda_layer_version.artemisapi.arn
  ]

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
  timeout       = 300

  role = aws_iam_role.lambda-assume-role.arn

  vpc_config {
    subnet_ids = [
      aws_subnet.lambdas.id,
    ]

    security_group_ids = [aws_security_group.lambda-sg.id]
  }

  environment {
    variables = {
      TASK_QUEUE                       = module.public_engine_cluster.task_queue.id
      PRIORITY_TASK_QUEUE              = module.public_engine_cluster.priority_task_queue.id
      TASK_QUEUE_NAT                   = module.nat_engine_cluster.task_queue.id
      PRIORITY_TASK_QUEUE_NAT          = module.nat_engine_cluster.priority_task_queue.id
      DEFAULT_DEPTH                    = "500"
      S3_BUCKET                        = var.s3_analyzer_files_id
      ANALYZER_DJANGO_SECRETS_ARN      = "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:${var.app}/django-secret-key"
      ANALYZER_DB_CREDS_ARN            = "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:${var.app}/db-user"
      JSON_REPORT_LAMBDA               = aws_lambda_function.json_report.arn
      SBOM_REPORT_LAMBDA               = aws_lambda_function.sbom_report.arn
      REPORT_QUEUE                     = var.report_queue.id
      ARTEMIS_FEATURE_AQUA_ENABLED     = var.aqua_enabled ? 1 : 0
      ARTEMIS_FEATURE_VERACODE_ENABLED = var.veracode_enabled ? 1 : 0
      ARTEMIS_FEATURE_SNYK_ENABLED     = var.snyk_enabled ? 1 : 0
      ARTEMIS_GITHUB_APP_ID            = var.github_app_id
      ARTEMIS_AUDIT_QUEUE              = var.event_queue.id
      ARTEMIS_ENVIRONMENT              = var.environment
      ARTEMIS_DOMAIN_NAME              = var.domain_name
    }
  }

  tags = merge(
    var.tags,
    {
      Name = "Artemis Repo Handler Lambda"
    }
  )
}

resource "aws_lambda_function" "users-handler" {
  function_name = "${var.app}-users-handler"

  s3_bucket = var.s3_analyzer_files_id
  s3_key    = "lambdas/users/v${var.ver}/users.zip"

  layers = [
    aws_lambda_layer_version.artemislib.arn,
    aws_lambda_layer_version.artemisdb.arn,
    aws_lambda_layer_version.artemisapi.arn
  ]

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
  timeout       = 60

  role = aws_iam_role.lambda-assume-role.arn

  vpc_config {
    subnet_ids = [
      aws_subnet.lambdas.id,
    ]

    security_group_ids = [aws_security_group.lambda-sg.id]
  }

  environment {
    variables = {
      S3_BUCKET                   = var.s3_analyzer_files_id
      ANALYZER_DJANGO_SECRETS_ARN = "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:${var.app}/django-secret-key"
      ANALYZER_DB_CREDS_ARN       = "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:${var.app}/db-user"
      ARTEMIS_LINK_GH_SECRETS_ARN = "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:${var.app}/link-github-account-oauth-app"
      ARTEMIS_AUDIT_QUEUE         = var.audit_event_queue.id
      ARTEMIS_AUDIT_QUEUE         = var.event_queue.id
      ARTEMIS_ENVIRONMENT         = var.environment
      ARTEMIS_DOMAIN_NAME         = var.domain_name
    }
  }

  tags = merge(
    var.tags,
    {
      Name = "Artemis User Handler Lambda"
    }
  )
}

resource "aws_lambda_function" "users-keys-handler" {
  function_name = "${var.app}-users-keys-handler"

  s3_bucket = var.s3_analyzer_files_id
  s3_key    = "lambdas/users_keys/v${var.ver}/users_keys.zip"

  layers = [
    aws_lambda_layer_version.artemislib.arn,
    aws_lambda_layer_version.artemisdb.arn,
    aws_lambda_layer_version.artemisapi.arn
  ]

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
  timeout       = 60

  role = aws_iam_role.lambda-assume-role.arn

  vpc_config {
    subnet_ids = [
      aws_subnet.lambdas.id,
    ]

    security_group_ids = [aws_security_group.lambda-sg.id]
  }

  environment {
    variables = {
      ANALYZER_DJANGO_SECRETS_ARN = "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:${var.app}/django-secret-key"
      ANALYZER_DB_CREDS_ARN       = "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:${var.app}/db-user"
      ARTEMIS_AUDIT_QUEUE         = var.event_queue.id
      ARTEMIS_ENVIRONMENT         = var.environment
      ARTEMIS_DOMAIN_NAME         = var.domain_name
      S3_BUCKET                   = var.s3_analyzer_files_id
    }
  }

  tags = merge(
    var.tags,
    {
      Name = "Artemis User Keys Handler Lambda"
    }
  )
}

resource "aws_lambda_function" "users-services-handler" {
  function_name = "${var.app}-users-services-handler"

  s3_bucket = var.s3_analyzer_files_id
  s3_key    = "lambdas/users_services/v${var.ver}/users_services.zip"

  layers = [
    aws_lambda_layer_version.artemislib.arn,
    aws_lambda_layer_version.artemisdb.arn,
    aws_lambda_layer_version.artemisapi.arn
  ]

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
  timeout       = 60

  role = aws_iam_role.lambda-assume-role.arn

  vpc_config {
    subnet_ids = [
      aws_subnet.lambdas.id,
    ]

    security_group_ids = [aws_security_group.lambda-sg.id]
  }

  environment {
    variables = {
      ANALYZER_DJANGO_SECRETS_ARN = "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:${var.app}/django-secret-key"
      ANALYZER_DB_CREDS_ARN       = "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:${var.app}/db-user"
      ARTEMIS_LINK_GH_SECRETS_ARN = "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:${var.app}/link-github-account-oauth-app"
      ARTEMIS_DOMAIN_NAME         = var.domain_name
    }
  }

  tags = merge(
    var.tags,
    {
      Name = "Artemis Users Services Handler Lambda"
    }
  )
}

resource "aws_lambda_function" "signin-handler" {
  function_name = "${var.app}-signin-handler"

  s3_bucket = var.s3_analyzer_files_id
  s3_key    = "lambdas/signin/v${var.ver}/signin.zip"

  layers = [
    aws_lambda_layer_version.artemislib.arn
  ]

  lifecycle {
    ignore_changes = [
      # Ignore changes to the layers as the CI pipline will deploy newer versions
      layers
    ]
  }

  handler       = "handlers.handler"
  runtime       = var.lambda_runtime
  architectures = [var.lambda_architecture]
  memory_size   = 128
  timeout       = 5

  role = aws_iam_role.lambda-assume-role.arn

  environment {
    variables = {
      COGNITO_DOMAIN      = var.cognito_domain
      CLIENT_ID           = var.cognito_app_id
      CLIENT_SECRET_ARN   = "${var.app}/cognito-app-secret"
      ARTEMIS_AUDIT_QUEUE = var.audit_event_queue.id
    }
  }

  tags = merge(
    var.tags,
    {
      Name = "Artemis Signin Handler Lambda"
    }
  )
}

###############################################################################
# Lambda IAM
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
  name               = "${var.app}-api-lambda"
  assume_role_policy = data.aws_iam_policy_document.lambda-assume-policy.json

  tags = merge(
    var.tags,
    {
      Name = "Artemis API Lambda Role"
    }
  )
}

data "aws_caller_identity" "current" {}

module "access-secret-manager-keys" {
  source  = "../role_policy_attachment"
  actions = ["secretsmanager:GetSecretValue"]
  iam_role_names = [
    aws_iam_role.lambda-assume-role.name,
    module.public_engine_cluster.engine-role.name,
    module.nat_engine_cluster.engine-role.name,
    module.public_engine_cluster.scale-down-assume-role.name,
    module.nat_engine_cluster.scale-down-assume-role.name,
    aws_iam_role.db-cleanup-lambda-role.name
  ]
  name = "${var.app}-access-secret-manager-keys"
  resources = [
    "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:${var.app}/*",
    aws_secretsmanager_secret.revproxy-api-key.arn
  ]
}

module "s3-lambda-policy" {
  source         = "../role_policy_attachment"
  actions        = ["s3:GetObject"]
  iam_role_names = [aws_iam_role.lambda-assume-role.name]
  name           = "${var.app}-lambda-s3"
  resources = [
    "${var.s3_analyzer_files_arn}/scan_data/*",
    "${var.s3_analyzer_files_arn}/services.json",
    "${var.s3_analyzer_files_arn}/ci-tools/*",
  ]
}

module "vpc-lambda-policy" {
  source = "../role_policy_attachment"
  actions = [
    "ec2:CreateNetworkInterface",
    "ec2:DescribeNetworkInterfaces",
    "ec2:DeleteNetworkInterface",
  ]
  iam_role_names = [
    aws_iam_role.lambda-assume-role.name,
    module.public_engine_cluster.scale-down-assume-role.name,
    module.nat_engine_cluster.scale-down-assume-role.name,
    aws_iam_role.scan-scheduler-role.name,
    aws_iam_role.scheduled-scan-handler-role.name,
    aws_iam_role.db-cleanup-lambda-role.name,
    aws_iam_role.callback-assume-role.name
  ]
  name      = "${var.app}-lambda-vpc"
  resources = ["*"]
}
