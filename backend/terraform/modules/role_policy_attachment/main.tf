data "aws_iam_policy_document" "policy-document" {
  statement {
    effect    = var.effect
    actions   = var.actions
    resources = var.resources

    dynamic "condition" {
      for_each = var.conditions
      content {
        test     = condition.value["test"]
        variable = condition.value["variable"]
        values   = condition.value["values"]
      }
    }
  }
}

resource "aws_iam_policy" "iam-policy" {
  name   = var.name
  policy = data.aws_iam_policy_document.policy-document.json
}

resource "aws_iam_role_policy_attachment" "policy-attachment" {
  count      = length(var.iam_role_names)

  role       = var.iam_role_names[count.index]
  policy_arn = aws_iam_policy.iam-policy.arn
}
