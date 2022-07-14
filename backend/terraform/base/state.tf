module "tf_remote_state" {
  source = "github.com/turnerlabs/terraform-remote-state?ref=v5.1.0"

  dynamodb_state_locking = true

  role        = var.saml_role
  application = var.app
  tags        = var.tags
}

output "bucket" {
  value = module.tf_remote_state.bucket
}
