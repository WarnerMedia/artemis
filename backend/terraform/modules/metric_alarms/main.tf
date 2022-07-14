###############################################################################
# Lambda Cloudwatch Alarms
###############################################################################

resource "aws_cloudwatch_metric_alarm" "repo-handler-error-logging" {
  alarm_name          = "${var.app}-repo-handler-error-logging"
  alarm_description   = "Monitor repo handler lambda for high amounts of errors"
  namespace           = "AWS/Lambda"
  metric_name         = "Errors"
  evaluation_periods  = "1"
  period              = var.repo_handler_error_period
  statistic           = "Sum"
  comparison_operator = "GreaterThanThreshold"
  threshold           = var.repo_handler_error_threshold
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = var.repo_handler_function_name
  }

  alarm_actions = []
}

###############################################################################
# Engine Error Metric Filters and Alarms
###############################################################################

resource "aws_cloudwatch_log_metric_filter" "engine-error-metric-filter" {
  name           = "EngineErrorMetricFilter"
  log_group_name = var.engine_log_group_name
  pattern        = var.engine_error_pattern
  metric_transformation {
    name      = "EngineErrorsFromMetricFilter"
    namespace = var.app
    value     = "1"
  }
}

resource "aws_cloudwatch_metric_alarm" "engine-error-alarm" {
  alarm_name          = "${var.app}-engine-error-alarm"
  alarm_description   = "Monitor engine logs for high amounts of errors"
  namespace           = var.app
  metric_name         = aws_cloudwatch_log_metric_filter.engine-error-metric-filter.name
  evaluation_periods  = "1"
  period              = var.engine_error_period
  statistic           = "Sum"
  comparison_operator = "GreaterThanThreshold"
  threshold           = var.engine_error_threshold
  treat_missing_data  = "notBreaching"

  alarm_actions = []
}

