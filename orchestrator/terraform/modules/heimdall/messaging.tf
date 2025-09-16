###############################################################################
# SQS
###############################################################################

resource "aws_sqs_queue" "org-queue" {
  name                       = "${var.app}-org-queue"
  visibility_timeout_seconds = 900
  redrive_policy = jsonencode({
    "deadLetterTargetArn" = aws_sqs_queue.org-deadletter-queue.arn
    "maxReceiveCount"     = 1
  })

  tags = merge(
    var.tags,
    {
      "Name" = "Heimdall Org Queue"
    }
  )
}

resource "aws_sqs_queue" "org-deadletter-queue" {
  name                       = "${var.app}-org-deadletter-queue"
  visibility_timeout_seconds = 900
  message_retention_seconds  = 691200

  tags = merge(
    var.tags,
    {
      "Name" = "Heimdall Org Deadletter Queue"
    }
  )
}

resource "aws_sqs_queue" "repo-queue" {
  name = "${var.app}-repo-queue"
  redrive_policy = jsonencode({
    "deadLetterTargetArn" = aws_sqs_queue.repo-deadletter-queue.arn
    "maxReceiveCount"     = 1
  })

  tags = merge(
    var.tags,
    {
      "Name" = "Heimdall Repo Queue"
    }
  )
}

resource "aws_sqs_queue" "repo-deadletter-queue" {
  name                       = "${var.app}-repo-deadletter-queue"
  visibility_timeout_seconds = 900
  message_retention_seconds  = 691200

  tags = merge(
    var.tags,
    {
      "Name" = "Heimdall Repo Deadletter Queue"
    }
  )
}

###############################################################################
# SQS Permissions
###############################################################################

#######################################
# Policy Documents
#######################################

data "aws_iam_policy_document" "org-queue-send-and-receive" {
  statement {
    effect = "Allow"

    actions = [
      "sqs:SendMessage",
      "sqs:ReceiveMessage",
      "sqs:DeleteMessage",
      "sqs:GetQueueAttributes",
    ]

    resources = [
      "${aws_sqs_queue.org-queue.arn}",
      "${aws_sqs_queue.org-deadletter-queue.arn}",
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
      "${aws_sqs_queue.repo-deadletter-queue.arn}",
    ]
  }
}

data "aws_iam_policy_document" "repo-queue-send-and-receive" {
  statement {
    effect = "Allow"

    actions = [
      "sqs:SendMessage",
      "sqs:ReceiveMessage",
      "sqs:DeleteMessage",
      "sqs:GetQueueAttributes",
    ]

    resources = [
      "${aws_sqs_queue.repo-queue.arn}",
      "${aws_sqs_queue.repo-deadletter-queue.arn}",
    ]
  }
}

#######################################
# Policies
#######################################

resource "aws_iam_policy" "org-queue-send-and-receive" {
  name   = "${var.app}-org-queue-send-and-receive"
  policy = data.aws_iam_policy_document.org-queue-send-and-receive.json
}

resource "aws_iam_policy" "repo-queue-send" {
  name   = "${var.app}-repo-queue-send"
  policy = data.aws_iam_policy_document.repo-queue-send.json
}

resource "aws_iam_policy" "repo-queue-send-and-receive" {
  name   = "${var.app}-repo-queue-send-and-receive"
  policy = data.aws_iam_policy_document.repo-queue-send-and-receive.json
}

#######################################
# Policy Attachments
#######################################

resource "aws_iam_role_policy_attachment" "vpc-lambda-org-queue-send-and-receive" {
  role       = aws_iam_role.vpc-lambda-assume-role.name
  policy_arn = aws_iam_policy.org-queue-send-and-receive.arn
}

resource "aws_iam_role_policy_attachment" "vpc-lambda-repo-queue-send-and-receive" {
  role       = aws_iam_role.vpc-lambda-assume-role.name
  policy_arn = aws_iam_policy.repo-queue-send-and-receive.arn
}

resource "aws_iam_role_policy_attachment" "lambda-repo-queue-send-and-receive" {
  role       = aws_iam_role.lambda-assume-role.name
  policy_arn = aws_iam_policy.repo-queue-send-and-receive.arn
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

output "org-deadletter-queue" {
  value = aws_sqs_queue.org-deadletter-queue.id
}

output "repo-deadletter-queue" {
  value = aws_sqs_queue.repo-deadletter-queue.id
}
