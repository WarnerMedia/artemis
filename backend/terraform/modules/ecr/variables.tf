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
