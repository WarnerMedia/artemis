###############################################################################
# S3 Buckets
###############################################################################

resource "aws_s3_bucket" "heimdall_files" {
  bucket = "${var.app}-${data.aws_caller_identity.current.account_id}"

  tags = merge(
    var.tags,
    {
      "Name" = "Heimdall Files"
    }
  )
}

resource "aws_s3_bucket_ownership_controls" "s3_controls" {
  bucket = aws_s3_bucket.heimdall_files.id
  rule {
    object_ownership = "BucketOwnerPreferred"
  }
}

resource "aws_s3_bucket_acl" "heimdall_files_acl" {
  acl        = "private"
  bucket     = aws_s3_bucket.heimdall_files.id
  depends_on = [aws_s3_bucket_ownership_controls.s3_controls]
}

resource "aws_s3_bucket_versioning" "heimdall_files_version" {
  bucket = aws_s3_bucket.heimdall_files.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "heimdall_files_encryption_config" {
  bucket = aws_s3_bucket.heimdall_files.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

provider "aws" {
  alias   = "artemis"
  region  = var.artemis_region
  profile = var.profile
}

data "aws_s3_bucket" "artemis_s3_bucket" {
  provider = aws.artemis
  bucket   = var.artemis_s3_bucket
}

###############################################################################
# Block Public Access
###############################################################################

resource "aws_s3_bucket_public_access_block" "files-private" {
  bucket                  = aws_s3_bucket.heimdall_files.id
  block_public_acls       = true
  block_public_policy     = true
  restrict_public_buckets = true
  ignore_public_acls      = true
}

###############################################################################
# Bucket Access Policies
###############################################################################

resource "aws_s3_bucket_policy" "files-bucket-policy" {
  bucket = aws_s3_bucket.heimdall_files.id
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
      "${aws_s3_bucket.heimdall_files.arn}/*",
    ]

    condition {
      test     = "Bool"
      variable = "aws:SecureTransport"
      values   = ["false"]
    }
  }
}
