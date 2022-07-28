###############################################################################
# S3 Buckets
###############################################################################

data "aws_caller_identity" "current" {}

resource "aws_s3_bucket" "files" {
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
      "Name" = "Artemis UI Static Files"
    }
  )
}

###############################################################################
# Block Public Access
###############################################################################

resource "aws_s3_bucket_public_access_block" "files-private" {
  bucket                  = aws_s3_bucket.files.id
  block_public_acls       = true
  block_public_policy     = true
  restrict_public_buckets = true
  ignore_public_acls      = true
}

###############################################################################
# Bucket Access Policies
###############################################################################

resource "aws_s3_bucket_policy" "files-bucket-policy" {
  bucket = aws_s3_bucket.files.id
  policy = data.aws_iam_policy_document.files-bucket-policy.json
}

data "aws_iam_policy_document" "files-bucket-policy" {
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
      "${aws_s3_bucket.files.arn}/*",
    ]

    condition {
      test     = "Bool"
      variable = "aws:SecureTransport"
      values   = ["false"]
    }
  }

  statement {
    sid = "AllowCloudFront"

    effect = "Allow"

    principals {
      type        = "AWS"
      identifiers = [aws_cloudfront_origin_access_identity.oai.iam_arn]
    }

    actions = [
      "s3:GetObject"
    ]

    resources = ["${aws_s3_bucket.files.arn}/*"]
  }
}

###############################################################################
# Outputs
###############################################################################

output "s3_bucket" {
  value = aws_s3_bucket.files.id
}
