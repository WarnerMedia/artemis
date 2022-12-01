module "write-logs" {
  source = "../role_policy_attachment"
  actions = [
    "logs:CreateLogGroup",
    "logs:CreateLogStream",
    "logs:PutLogEvents",
  ]
  iam_role_names = [
    aws_iam_role.metrics-assume-role.name,
    aws_iam_role.lambda-assume-role.name,
    aws_iam_role.callback-assume-role.name,
    module.public_engine_cluster.scale-down-assume-role.name,
    module.nat_engine_cluster.scale-down-assume-role.name,
    aws_iam_role.event-role.name,
    aws_iam_role.audit-event-role.name,
    aws_iam_role.scan-scheduler-role.name,
    aws_iam_role.scheduled-scan-handler-role.name,
    aws_iam_role.db-cleanup-lambda-role.name
  ]
  name      = "${var.app}-write-logs"
  resources = ["arn:aws:logs:*:*:*"]
}
