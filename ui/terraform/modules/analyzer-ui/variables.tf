###############################################################################
# Environment-specific variables
#
# These must be set to the specific environment and so do not have defaults.
###############################################################################

variable "environment" {
  description = "Environment name (prod, nonprod, etc.)"
}

variable "tags" {
  type = map(any)
}

variable "cloudfront_domain" {
  description = "Domain name that will be used for Cloudfront distribution"
}

variable "zone_name" {
  description = "Name of the zone in which the Cloudfront domain will be created"
}

variable "profile" {}

variable "response_headers_policy_id" {
  description = "ID of a reponse header policy"
  type        = string
}

###############################################################################
# Environment-agnostic variables
#
# The default value should be correct for any environment and not need to be
# overridden.
###############################################################################

variable "app" {
  default = "artemis-ui"
}

variable "backend_app" {
  description = "The application name for the backend deployment"
  default     = "artemis"
}

variable "logging" {
  type = object({
    bucket          = string
    prefix          = string
    include_cookies = bool
  })
  description = "Enable access logs. The S3 bucket must already exist. If not set, logging will be disabled."
  default     = null
}
