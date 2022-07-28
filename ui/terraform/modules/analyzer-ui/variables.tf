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
