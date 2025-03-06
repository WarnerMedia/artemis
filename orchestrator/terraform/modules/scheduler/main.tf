resource "aws_cloudwatch_event_rule" "schedule" {
  name                = "${var.app}-run-${var.name}-scan"
  description         = var.description
  state               = var.enabled ? "ENABLED" : "DISABLED"
  schedule_expression = var.schedule_expression
}

resource "aws_cloudwatch_event_target" "org-queue-secrets" {
  target_id = "${var.app}-org-queue-${var.name}"
  rule      = aws_cloudwatch_event_rule.schedule.name
  arn       = var.org-queue-arn
  input     = var.input
}

resource "aws_lambda_permission" "org-queue-allow-cloudwatch" {
  statement_id  = "AllowExecutionFromCloudWatch_${var.name}"
  action        = "lambda:InvokeFunction"
  function_name = var.org-queue-function-name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.schedule.arn
}
