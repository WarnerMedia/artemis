###############################################################################
# CloudFront Certificate
###############################################################################

# Cloudfront certificates can only reside in us-east-1
provider "aws" {
  alias   = "us-east-1"
  region  = "us-east-1"
  profile = var.profile
}

resource "aws_acm_certificate" "ui" {
  provider          = aws.us-east-1
  domain_name       = var.cloudfront_domain
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  options {
    certificate_transparency_logging_preference = "ENABLED"
  }

  tags = merge(
    var.tags,
    {
      Name = "Artemis UI Cloudfront Certificate"
    }
  )
}

resource "aws_route53_record" "ui_cert_validation_dns_record" {
  count = length(aws_acm_certificate.ui.domain_validation_options)

  name    = aws_acm_certificate.ui.domain_validation_options.*.resource_record_name[count.index]
  type    = aws_acm_certificate.ui.domain_validation_options.*.resource_record_type[count.index]
  zone_id = data.aws_route53_zone.primary.zone_id
  records = [aws_acm_certificate.ui.domain_validation_options.*.resource_record_value[count.index]]
  ttl     = 60

  depends_on = [aws_acm_certificate.ui]
}

resource "aws_acm_certificate_validation" "ui_cert_validation" {
  provider                = aws.us-east-1
  certificate_arn         = aws_acm_certificate.ui.arn
  validation_record_fqdns = aws_route53_record.ui_cert_validation_dns_record.*.fqdn
}

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

    compress                   = false
    response_headers_policy_id = var.response_headers_policy_id
  }

  viewer_certificate {
    cloudfront_default_certificate = false
    acm_certificate_arn            = aws_acm_certificate.ui.arn
    ssl_support_method             = "sni-only"
    minimum_protocol_version       = "TLSv1.2_2021"
  }
}

###############################################################################
# Cloudfront domain
###############################################################################

data "aws_route53_zone" "primary" {
  name = var.zone_name
}

resource "aws_route53_record" "cloudfront" {
  zone_id = data.aws_route53_zone.primary.zone_id
  name    = var.cloudfront_domain
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.ui.domain_name
    zone_id                = aws_cloudfront_distribution.ui.hosted_zone_id
    evaluate_target_health = true
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
