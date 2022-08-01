variable "app" {
  description = "app name"
}

variable "org-queue-arn" {
  description = "arn of the org-queue"
}

variable "org-queue-function-name" {
  description = "function name of the org-queue"
}

variable "enabled" {
  description = "Whether the schedule is enabled"
  type        = bool
}

variable "name" {
  description = "Scan schedule name (e.g. secrets, sbom, vulns, orgABC, etc.)"
}

variable "description" {
  description = "Scan schedule description"
}

variable "schedule_expression" {
  description = "CloudWatch event schedule expression"
}

variable "input" {
  description = "String-encoded JSON scan configuration block"
}
