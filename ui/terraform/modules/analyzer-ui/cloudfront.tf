###############################################################################
# CloudFront Distribution
###############################################################################

resource "aws_cloudfront_distribution" "ui" {
  comment = "${var.app}-${var.environment}"

  enabled         = true
  is_ipv6_enabled = true

  origin {
    domain_name = aws_s3_bucket.files.bucket_domain_name
    origin_id   = "${var.app}-${var.environment}"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.oai.cloudfront_access_identity_path
    }
  }

  default_root_object = "index.html"
  web_acl_id          = aws_wafv2_web_acl.waf.arn

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  default_cache_behavior {
    target_origin_id = "${var.app}-${var.environment}"

    allowed_methods = ["GET", "HEAD"]
    cached_methods  = ["GET", "HEAD"]

    forwarded_values {
      query_string = false

      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 7200
    max_ttl                = 86400
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}

###############################################################################
# CloudFront Origin Access Identity
###############################################################################

resource "aws_cloudfront_origin_access_identity" "oai" {
  comment = "${var.app}-${var.environment}-s3-access"
}

###############################################################################
# Outputs
###############################################################################

output "cloudfront_distribution" {
  value = aws_cloudfront_distribution.ui
}