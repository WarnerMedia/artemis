data "aws_caller_identity" "current" {}

###############################################################################
# S3 Buckets
###############################################################################

resource "aws_s3_bucket" "analyzer_files" {
  bucket = "${var.app}-${data.aws_caller_identity.current.account_id}"
  acl    = "private"

  versioning {
    enabled = true
  }

  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        sse_algorithm = "AES256"
      }
    }
  }

  tags = merge(
    var.tags,
    {
      Name = "Artemis Lambdas"
    }
  )
}

resource "aws_s3_bucket" "analyzer_docs" {
  bucket = "${var.app}-docs-${data.aws_caller_identity.current.account_id}"
  acl    = "private"

  versioning {
    enabled = true
  }

  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        sse_algorithm = "AES256"
      }
    }
  }

  tags = merge(
    var.tags,
    {
      Name   = "Artemis Docs",
      Access = "Public"
    }
  )
}

###############################################################################
# Bucket Access Policies
###############################################################################

resource "aws_s3_bucket_policy" "files-enforcessl-policy" {
  bucket = aws_s3_bucket.analyzer_files.id
  policy = data.aws_iam_policy_document.files-enforcessl-policy.json
}

data "aws_iam_policy_document" "files-enforcessl-policy" {
  statement {
    sid = "EnforceSSL"

    effect = "Deny"

    principals {
      type = "*"

      identifiers = [
        "*",
      ]
    }

    actions = [
      "s3:*",
    ]

    resources = [
      "arn:aws:s3:::${var.app}-${data.aws_caller_identity.current.account_id}/*",
    ]

    condition {
      test     = "Bool"
      variable = "aws:SecureTransport"
      values   = ["false"]
    }
  }
}

resource "aws_s3_bucket_policy" "docs-access-policy" {
  bucket = aws_s3_bucket.analyzer_docs.id
  policy = data.aws_iam_policy_document.docs-access-policy.json
}

data "aws_iam_policy_document" "docs-access-policy" {
  statement {
    effect = "Deny"

    principals {
      type = "*"

      identifiers = [
        "*",
      ]
    }

    actions = [
      "s3:GetObject",
    ]

    resources = [
      "arn:aws:s3:::${var.app}-docs-${data.aws_caller_identity.current.account_id}/*",
    ]

    condition {
      test     = "NotIpAddress"
      variable = "aws:SourceIp"

      values = var.cidrs
    }
  }

  statement {
    sid = "EnforceSSL"

    effect = "Deny"

    principals {
      type = "*"

      identifiers = [
        "*",
      ]
    }

    actions = [
      "s3:*",
    ]

    resources = [
      "arn:aws:s3:::${var.app}-docs-${data.aws_caller_identity.current.account_id}/*",
    ]

    condition {
      test     = "Bool"
      variable = "aws:SecureTransport"
      values   = ["false"]
    }
  }
}
