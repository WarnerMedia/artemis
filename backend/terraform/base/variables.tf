variable "aws_profile" {
}

variable "aws_region" {
  default = "us-east-2"
}

variable "saml_role" {
}

variable "app" {
  default = "artemis"
}

variable "tags" {
  type = map(string)

  default = {
    application = "artemis"
    environment = "nonprod"
  }
}
