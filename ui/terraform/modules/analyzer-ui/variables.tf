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
