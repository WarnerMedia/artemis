variable "maintenance_mode" {
  description = "Whether Artemis is in maintenance mode"
  default = false
}

variable "maintenance_mode_message" {
  description = "Message to accompany maintenance mode"
  default = ""
}

variable "maintenance_mode_retry_after" {
  description = "ISO 8601 timestamp of when maintenance mode is estimated to end"
  default = ""
}