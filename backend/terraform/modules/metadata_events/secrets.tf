resource "aws_secretsmanager_secret" "metadata-events-secret" {
  name        = "${var.app}/metadata-events-secret"
  description = "Metadata Events authentication"
}

resource "aws_secretsmanager_secret_version" "metadata-events-secret" {
  secret_id     = aws_secretsmanager_secret.metadata-events-secret.id
  secret_string = "REPLACEWITHVALUE"
}