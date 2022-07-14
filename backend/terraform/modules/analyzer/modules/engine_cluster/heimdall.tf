###############################################################################
# Scheduled autoscaling events to assist Heimdall scanning
###############################################################################

resource "aws_autoscaling_schedule" "heimdall-scan-start" {
  count                  = length(var.heimdall_scans_cron)
  scheduled_action_name  = "${var.app}-heimdall-scan-start-${count.index}-${var.name}"
  min_size               = -1
  max_size               = -1
  desired_capacity       = var.engine_scale_max
  recurrence             = var.heimdall_scans_cron[count.index]
  autoscaling_group_name = aws_autoscaling_group.engine-asg.name
}
