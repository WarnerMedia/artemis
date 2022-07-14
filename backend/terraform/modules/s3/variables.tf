variable "app" {}

variable "tags" {}

variable "cidrs" {
  description = "CIDR for allowlisting traffic"
  default     = []
}
