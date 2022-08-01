###############################################################################
# SQS
###############################################################################

resource "aws_sqs_queue" "org-queue" {
  name                       = "${var.app}-org-queue"
  visibility_timeout_seconds = 900

  tags = merge(
    var.tags,
    {
      "Name" = "Heimdall Org Queue"
    }
  )
}

resource "aws_sqs_queue" "repo-queue" {
  name = "${var.app}-repo-queue"

  tags = merge(
    var.tags,
    {
      "Name" = "Heimdall Repo Queue"
    }
  )
}

###############################################################################
# SQS Permissions
###############################################################################

#######################################
# Policy Documents
#######################################

data "aws_iam_policy_document" "org-queue-send" {
  statement {
    effect = "Allow"

    actions = [
      "sqs:SendMessage",
    ]

    resources = [
      "${aws_sqs_queue.org-queue.arn}",
    ]
  }
}

data "aws_iam_policy_document" "org-queue-receive" {
  statement {
    effect = "Allow"

    actions = [
      "sqs:ReceiveMessage",
      "sqs:DeleteMessage",
      "sqs:GetQueueAttributes",
    ]

    resources = [
      "${aws_sqs_queue.org-queue.arn}",
    ]
  }
}

data "aws_iam_policy_document" "repo-queue-send" {
  statement {
    effect = "Allow"

    actions = [
      "sqs:SendMessage",
    ]

    resources = [
      "${aws_sqs_queue.repo-queue.arn}",
    ]
  }
}

data "aws_iam_policy_document" "repo-queue-receive" {
  statement {
    effect = "Allow"

    actions = [
      "sqs:ReceiveMessage",
      "sqs:DeleteMessage",
      "sqs:GetQueueAttributes",
    ]

    resources = [
      "${aws_sqs_queue.repo-queue.arn}",
    ]
  }
}

#######################################
# Policies
#######################################

resource "aws_iam_policy" "org-queue-send" {
  name   = "${var.app}-org-queue-send"
  policy = data.aws_iam_policy_document.org-queue-send.json
}

resource "aws_iam_policy" "org-queue-receive" {
  name   = "${var.app}-org-queue-receive"
  policy = data.aws_iam_policy_document.org-queue-receive.json
}

resource "aws_iam_policy" "repo-queue-send" {
  name   = "${var.app}-repo-queue-send"
  policy = data.aws_iam_policy_document.repo-queue-send.json
}

resource "aws_iam_policy" "repo-queue-receive" {
  name   = "${var.app}-repo-queue-receive"
  policy = data.aws_iam_policy_document.repo-queue-receive.json
}

#######################################
# Policy Attachments
#######################################

resource "aws_iam_role_policy_attachment" "vpc-lambda-org-queue-send" {
  role       = aws_iam_role.vpc-lambda-assume-role.name
  policy_arn = aws_iam_policy.org-queue-send.arn
}

resource "aws_iam_role_policy_attachment" "vpc-lambda-org-queue-receive" {
  role       = aws_iam_role.vpc-lambda-assume-role.name
  policy_arn = aws_iam_policy.org-queue-receive.arn
}

resource "aws_iam_role_policy_attachment" "vpc-lambda-repo-queue-send" {
  role       = aws_iam_role.vpc-lambda-assume-role.name
  policy_arn = aws_iam_policy.repo-queue-send.arn
}

resource "aws_iam_role_policy_attachment" "lambda-repo-queue-receive" {
  role       = aws_iam_role.lambda-assume-role.name
  policy_arn = aws_iam_policy.repo-queue-receive.arn
}

resource "aws_iam_role_policy_attachment" "api-sqs-repo-queue-send" {
  role       = aws_iam_role.lambda-assume-role.name
  policy_arn = aws_iam_policy.repo-queue-send.arn
}


###############################################################################
# Output
###############################################################################

output "org-queue" {
  value = aws_sqs_queue.org-queue.id
}

output "repo-queue" {
  value = aws_sqs_queue.repo-queue.id
}
