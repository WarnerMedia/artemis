data "aws_caller_identity" "current" {}

resource "aws_ecr_repository" "module_repo" {
  name = "${var.app}/${var.repo}"
  tags = var.tags
}

###############################################################################
# ECR Permissions
###############################################################################

resource "aws_ecr_repository_policy" "module_repo_policy" {
  repository = aws_ecr_repository.module_repo.name
  policy     = data.aws_iam_policy_document.ecr.json
}

data "aws_iam_policy_document" "ecr" {
  statement {
    actions = [
      "ecr:GetDownloadUrlForLayer",
      "ecr:BatchGetImage",
      "ecr:BatchCheckLayerAvailability",
      "ecr:PutImage",
      "ecr:InitiateLayerUpload",
      "ecr:UploadLayerPart",
      "ecr:CompleteLayerUpload",
      "ecr:DescribeRepositories",
      "ecr:GetRepositoryPolicy",
      "ecr:ListImages",
      "ecr:DescribeImages",
      "ecr:DeleteRepository",
      "ecr:BatchDeleteImage",
      "ecr:SetRepositoryPolicy",
      "ecr:DeleteRepositoryPolicy",
      "ecr:GetLifecyclePolicy",
      "ecr:PutLifecyclePolicy",
      "ecr:DeleteLifecyclePolicy",
      "ecr:GetLifecyclePolicyPreview",
      "ecr:StartLifecyclePolicyPreview",
    ]

    principals {
      type = "AWS"

      # Add the saml roles for every member on the "team"
      identifiers = [
        "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/${var.saml_role}",
      ]
    }
  }
}

###############################################################################
# Output
###############################################################################

output "module-docker-registry" {
  value = aws_ecr_repository.module_repo.repository_url
}
