variable "resources" {
  description = "List of ARNs of the resources in which to apply the policy"
  type = list(string)
}

variable "actions" {
  description = "List of actions that will have the effect in the policy"
  type = list(string)
}

variable "effect" {
  default = "Allow"
  description = "Whether to allow or deny the actions of the policy. Default is allow."
}

variable "name" {
  description = "name of the policy"
  type = string
}

variable "iam_role_names" {
  description = "name of the role to assign the policy"
  type = list(string)
}

variable "conditions" {
  description = "conditions to apply to the policy"
  default = []
}