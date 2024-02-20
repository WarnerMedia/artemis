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

data "aws_iam_policy_document" "s3-policy" {
  statement {
    actions = [
      "s3:GetObject",
      "s3:ListBucket"
    ]
    resources = [
      var.s3_analyzer_files_arn,
      "${var.s3_analyzer_files_arn}/scripts/*",
      "${var.s3_analyzer_files_arn}/services.json",
      "${var.s3_analyzer_files_arn}/plugins/*",
      # "${var.s3_analyzer_files_arn}/scans/*" Uncomment this line if multiple SBOM tools are being used concurrently.
    ]
  }
  statement {
    actions = [
      "s3:PutObject"
    ]
    resources = [
      "${var.s3_analyzer_files_arn}/scans/*"
    ]
  }
}

resource "aws_iam_policy" "s3-policy" {
  name   = "${var.app}-engine-s3-${var.name}"
  policy = data.aws_iam_policy_document.s3-policy.json
}

resource "aws_iam_role_policy_attachment" "s3-policy" {
  role       = aws_iam_role.engine-role.name
  policy_arn = aws_iam_policy.s3-policy.arn
}

module "autoscaling-policy" {
  source = "../../../role_policy_attachment"
  actions = [
    "autoscaling:CompleteLifecycleAction",
    "autoscaling:SetInstanceHealth",
    "ec2:TerminateInstances"
  ]
  iam_role_names = [aws_iam_role.engine-role.name]
  name           = "${var.app}-engine-autoscaling-policy-${var.name}"
  resources = [
    aws_autoscaling_group.engine-asg.arn,
    "arn:aws:ec2:${var.aws_region}:${data.aws_caller_identity.current.account_id}:instance/*"
  ]
  conditions = [{
    test     = "StringEquals"
    variable = "aws:ResourceTag/application"
    values   = [var.app]
  }]
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
