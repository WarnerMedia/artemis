variable "app" {}

variable "saml_role" {
  description = "SAML role to use"
}

variable "repo" {
  description = ""
}

variable "tags" {
  type = map(any)
}

variable "lifecycle_policy" {
  description = "ECR Lifecycle Policy"
  type        = map(any)
  default     = {}
}
