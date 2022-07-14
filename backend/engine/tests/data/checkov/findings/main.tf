resource "aws_s3_bucket" "b" {
  bucket = "my-tf-test-bucket"

  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        kms_master_key_id = aws_kms_key.mykey.arn
        sse_algorithm     = "aws:kms"
      }
    }
  }

  logging {
    target_bucket = var.target_bucket
    target_prefix = "log/${var.s3_bucket_name}"
  }

   versioning {
     enabled = true
   }

  tags = {
    Name        = "My bucket"
    Environment = "Dev"
  }
}

resource "aws_s3_bucket_public_access_block" "b" {
  bucket = aws_s3_bucket.b.id

  block_public_acls       = true
  block_public_policy     = true
  restrict_public_buckets = true
}
