###############################################################################
###############################################################################
## --------------------------
## Externally-managed secrets
## --------------------------
##
## The secrets from here on come from external sources and are managed by those
## external sources. They are created here so that they exist with the structure
## that Heimdall expects but using dummy values.
##
## After these Secret Manager items are created via Terraform the actual values
## need to be set using the AWS console.
##
## !!! THIS FILE MUST NOT BE MODIFIED TO INCLUDE REAL SECRETS !!!
##
###############################################################################
###############################################################################

###############################################################################
# Artemis API Authentication
###############################################################################

resource "aws_secretsmanager_secret" "artemis-api-key" {
  name        = "${var.app}/artemis-api-key"
  description = "Artemis API key"
}

resource "aws_secretsmanager_secret_version" "artemis-api-key" {
  secret_id = aws_secretsmanager_secret.artemis-api-key.id
  secret_string = jsonencode({
    "key" : "REPLACEWITHVALUEFROMARTEMIS",
  })
}


###############################################################################
# Datadog Authentication
###############################################################################
resource "aws_secretsmanager_secret" "datadog-api-key" {
  name        = "${var.app}/datadog-api-key"
  description = "Datadog API key"
}

resource "aws_secretsmanager_secret_version" "datadog-api-key" {
  secret_id = aws_secretsmanager_secret.datadog-api-key.id
  secret_string = jsonencode({
    "key" : "REPLACEWITHVALUEFROMDATADOG",
  })
}
