resource "aws_security_group" "engine-sec-group" {
  name   = "${var.app}-engine-${var.name}"
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
      Name = "Artemis Engine Security Group ${var.name}"
    }
  )
}

###############################################################################
# EC2 Permissions
###############################################################################

data "aws_iam_policy_document" "ec2-assume-policy" {
  statement {
    effect = "Allow"

    actions = [
      "sts:AssumeRole",
    ]

    principals {
      type = "Service"

      identifiers = [
        "ec2.amazonaws.com",
      ]
    }
  }
}

resource "aws_iam_role" "engine-role" {
  name               = "${var.app}-ec2-${var.name}"
  assume_role_policy = data.aws_iam_policy_document.ec2-assume-policy.json

  tags = merge(
    var.tags,
    {
      Name = "Artemis Engine Role ${var.name}"
    }
  )
}

data "aws_iam_policy_document" "ecr-policy" {
  statement {
    effect = "Allow"

    actions = [
      "ecr:GetAuthorizationToken",
      "ecr:BatchCheckLayerAvailability",
      "ecr:GetDownloadUrlForLayer",
      "ecr:GetRepositoryPolicy",
      "ecr:DescribeRepositories",
      "ecr:ListImages",
      "ecr:DescribeImages",
      "ecr:BatchGetImage",
    ]

    resources = ["*"]
  }
}

module "log-policy" {
  source = "../../../role_policy_attachment"
  actions = [
    "logs:DescribeLogGroups",
    "logs:DescribeLogStreams",
    "logs:PutLogEvents",
    "logs:CreateLogStream",
  ]
  iam_role_names = [aws_iam_role.engine-role.name]
  name           = "${var.app}-logs-${var.name}"
  resources = [
    aws_cloudwatch_log_group.engine-log-group.arn,
    "${aws_cloudwatch_log_group.engine-log-group.arn}:log-stream:*",
  ]
}

module "s3-policy" {
  source = "../../../role_policy_attachment"
  actions = [
    "s3:GetObject",
    "s3:ListBucket"
  ]
  iam_role_names = [aws_iam_role.engine-role.name]
  name           = "${var.app}-engine-s3-${var.name}"
  resources = [
    var.s3_analyzer_files_arn,
    "${var.s3_analyzer_files_arn}/scripts/*",
    "${var.s3_analyzer_files_arn}/services.json",
    "${var.s3_analyzer_files_arn}/plugins/*",
  ]
}

module "lifecycle-policy" {
  source         = "../../../role_policy_attachment"
  actions        = ["autoscaling:CompleteLifecycleAction"]
  iam_role_names = [aws_iam_role.engine-role.name]
  name           = "${var.app}-engine-lifecycle-${var.name}"
  resources = [
    aws_autoscaling_group.engine-asg.arn
  ]
}

resource "aws_iam_role_policy" "engine-ec2-ecr-policy" {
  name   = "${var.app}-ec2-ecr-policy-${var.name}"
  role   = aws_iam_role.engine-role.id
  policy = data.aws_iam_policy_document.ecr-policy.json
}

module "engine-lambda-policy" {
  source         = "../../../role_policy_attachment"
  actions        = ["lambda:InvokeFunction"]
  iam_role_names = [aws_iam_role.engine-role.name]
  name           = "${var.app}-engine-lambda-policy-${var.name}"
  resources = [
    var.system_status_lambda.arn
  ]
}

resource "aws_iam_instance_profile" "engine-ec2" {
  name = "${var.app}-ec2-${var.name}"
  role = aws_iam_role.engine-role.name
}

###############################################################################
# EC2 Instance
###############################################################################

resource "aws_ebs_encryption_by_default" "ebs-encryption" {
  enabled = true
}

###############################################################################
# Autoscaling
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

resource "aws_iam_role" "scale-down-assume-role" {
  name               = "${var.app}-scale-down-lambda-${var.name}"
  assume_role_policy = data.aws_iam_policy_document.lambda-assume-policy.json

  tags = merge(
    var.tags,
    {
      Name = "Artemis Scale Down Lambda Role"
    }
  )
}

###############################################################################
# SSM
###############################################################################

resource "aws_iam_role_policy_attachment" "engine-ssm" {
  role       = aws_iam_role.engine-role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}
