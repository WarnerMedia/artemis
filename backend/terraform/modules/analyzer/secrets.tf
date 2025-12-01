###############################################################################
###############################################################################
## --------------------------
## Internally-managed secrets
## --------------------------
##
## These secrets are randomly generated.
###############################################################################
###############################################################################

###############################################################################
# Database
###############################################################################

resource "aws_secretsmanager_secret" "db-master-password" {
  name        = "${var.app}/db-master-password"
  description = "Artemis DB master password"
}

resource "random_password" "db-master-password" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?" # Default TF value minus @
}

resource "aws_secretsmanager_secret_version" "db-master-password" {
  secret_id     = aws_secretsmanager_secret.db-master-password.id
  secret_string = random_password.db-master-password.result
}

resource "aws_secretsmanager_secret" "db-user" {
  name        = "${var.app}/db-user"
  description = "Artemis DB regular user"
}

resource "random_password" "db-user" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?" # Default TF value minus @
}

resource "aws_secretsmanager_secret_version" "db-user" {
  secret_id = aws_secretsmanager_secret.db-user.id
  secret_string = jsonencode({
    "username" : "artemisuser",
    "password" : random_password.db-user.result,
    "engine" : "postgres",
    "host" : aws_rds_cluster.aurora.endpoint,
    "port" : aws_rds_cluster.aurora.port,
    "dbname" : aws_rds_cluster.aurora.database_name,
    "dbClusterIdentifier" : aws_rds_cluster.aurora.id
  })
}

resource "aws_secretsmanager_secret" "django-secret-key" {
  name        = "${var.app}/django-secret-key"
  description = "Django secret key"
}

resource "random_password" "django-secret-key" {
  length  = 32
  special = true
}

resource "aws_secretsmanager_secret_version" "django-secret-key" {
  secret_id = aws_secretsmanager_secret.django-secret-key.id
  secret_string = jsonencode({
    "secret_key" : random_password.django-secret-key.result
  })
}

###############################################################################
# UI
###############################################################################

resource "aws_secretsmanager_secret" "origin-header" {
  name        = "${var.app}/origin-header"
  description = "Origin protection header"
}

resource "random_password" "origin-header" {
  length  = 32
  special = false
}

resource "aws_secretsmanager_secret_version" "origin-header" {
  secret_id = aws_secretsmanager_secret.origin-header.id
  secret_string = jsonencode({
    "name" : "x-artemis-proxy",
    "value" : random_password.origin-header.result
  })
}

###############################################################################
# Service Connections Lambda
###############################################################################

resource "aws_secretsmanager_secret" "artemis-api-secret" {
  name        = "${var.app}/service-connection-metrics-api-key"
  description = "Artemis API Key for the service connection Lambda"
}

resource "aws_secretsmanager_secret_version" "artemis-api-secret" {
  secret_id = aws_secretsmanager_secret.artemis-api-secret.id
  secret_string = jsonencode({
    "key" : "REPLACEVALUE",
  })
}

###############################################################################
###############################################################################
## --------------------------
## Externally-managed secrets
## --------------------------
##
## The secrets from here on come from external sources and are managed by those
## external sources. They are created here so that they exist with the structure
## that Artemis expects but using dummy values.
##
## After these Secret Manager items are created via Terraform the actual values
## need to be set using the AWS console.
##
## !!! THIS FILE MUST NOT BE MODIFIED TO INCLUDE REAL SECRETS !!!
##
###############################################################################
###############################################################################

###############################################################################
# Authentication
###############################################################################

resource "aws_secretsmanager_secret" "cognito-app-secret" {
  name        = "${var.app}/cognito-app-secret"
  description = "AWS Cognito app secret"
}

resource "aws_secretsmanager_secret_version" "cognito-app-secret" {
  secret_id = aws_secretsmanager_secret.cognito-app-secret.id
  secret_string = jsonencode({
    "key" : "REPLACEWITHVALUEFROMCOGNITO",
  })
}

###############################################################################
# Splunk
###############################################################################

resource "aws_secretsmanager_secret" "audit-log-hec" {
  name        = "${var.app}/audit-log-hec"
  description = "Splunk HEC token for sending audit events"
}

resource "aws_secretsmanager_secret_version" "audit-log-hec" {
  secret_id = aws_secretsmanager_secret.audit-log-hec.id
  secret_string = jsonencode({
    "key" : "REPLACEWITHHECTOKEN",
    "url" : "https://HEC_URL"
  })
}

###############################################################################
# GitHub
###############################################################################

resource "aws_secretsmanager_secret" "github-app-private-key" {
  name        = "${var.app}/github-app-private-key"
  description = "RSA private key for the GitHub App integration"
}

resource "aws_secretsmanager_secret_version" "github-app-private-key" {
  secret_id     = aws_secretsmanager_secret.github-app-private-key.id
  secret_string = "REPLACEWITHRSAPRIVATEKEY"
}

resource "aws_secretsmanager_secret" "link-github-account-oauth-app" {
  name        = "${var.app}/link-github-account-oauth-app"
  description = "Credentials needed to retrieve a GitHub API token once a user authorizes the Link GitHub Account oauth app in GitHub."
}

resource "aws_secretsmanager_secret_version" "link-github-account-oauth-app" {
  secret_id = aws_secretsmanager_secret.link-github-account-oauth-app.id
  secret_string = jsonencode({
    "client_id" : "REPLACEWITHCLIENTID",
    "client_secret" : "REPLACEWITHCLIENTSECRET"
  })
}

###############################################################################
# Scanning
###############################################################################

resource "aws_secretsmanager_secret" "callback-auth" {
  name        = "${var.app}/callback-auth"
  description = "Mapping of headers for callback URLs where authentication is required"
}

resource "aws_secretsmanager_secret_version" "callback-auth" {
  secret_id = aws_secretsmanager_secret.callback-auth.id
  secret_string = jsonencode({
    "https://CALLBACK_DESTINATION" : {
      "header" : "REPLACEWITHHEADERNAME",
      "value" : "REPLACEWITHHEADERVALUE"
    }
  })
}

resource "aws_secretsmanager_secret" "scheduler-api-key" {
  name        = "${var.app}/scheduler-api-key"
  description = "API key for the scheduler to authenticate with the API"
}

resource "aws_secretsmanager_secret_version" "scheduler-api-key" {
  secret_id = aws_secretsmanager_secret.scheduler-api-key.id
  secret_string = jsonencode({
    "key" : "REPLACEWITHARTEMISAPIKEY"
  })
}

###############################################################################
# Service integrations
###############################################################################

resource "aws_secretsmanager_secret" "service-integration" {
  count       = length(var.service-integrations)
  name        = "${var.app}/${var.service-integrations[count.index]}"
  description = "Access credentials for ${var.service-integrations[count.index]}"
}

resource "aws_secretsmanager_secret_version" "service-integration" {
  count     = length(aws_secretsmanager_secret.service-integration)
  secret_id = aws_secretsmanager_secret.service-integration.*.id[count.index]
  secret_string = jsonencode({
    "key" : "REPLACEWITHACCESSTOKENVALUE",
  })
}

# The revproxy API key is managed externally to Artemis and may be stored in
# another region
provider "aws" {
  alias   = "revproxy-key"
  region  = var.revproxy_secret_region
  profile = var.profile
}

data "aws_secretsmanager_secret" "revproxy-api-key" {
  provider = aws.revproxy-key
  name     = var.revproxy_secret
}

###############################################################################
# Scan Integrations
###############################################################################

resource "aws_secretsmanager_secret" "aqua_cli_scanner" {
  name        = "${var.app}/aqua_cli_scanner"
  description = "Aqua console connection and access information"
}

resource "aws_secretsmanager_secret_version" "aqua_cli_scanner" {
  secret_id = aws_secretsmanager_secret.aqua_cli_scanner.id
  secret_string = jsonencode({
    "host" : "https://AQUA_CONSOLE_FQDN",
    "user" : "REPLACEWITHSCANNERUSER",
    "password" : "REPLACEWITHSCANNERPASSWORD",
    "registry" : "REPLACEWITHREGISTRYCONTAININGSCANNERIMAGE",
    "image" : "REPLACEWITHAQUASCANNERIMAGENAMEANDTAG"
  })
}

resource "aws_secretsmanager_secret" "veracode-sca" {
  name        = "${var.app}/veracode-sca"
  description = "Veracode SCA agent token and authorization"
}

resource "aws_secretsmanager_secret_version" "veracode-sca" {
  secret_id = aws_secretsmanager_secret.veracode-sca.id
  secret_string = jsonencode({
    "token" : "REPLACEWITHAGENTTOKEN",
    "agentAuthorization" : "REPLACEWITHAGENTAUTHORIZATION"
  })
}

resource "aws_secretsmanager_secret" "snyk-key" {
  name        = "${var.app}/snyk-key"
  description = "Snyk agent authorization token"
}

resource "aws_secretsmanager_secret_version" "snyk-key" {
  secret_id = aws_secretsmanager_secret.snyk-key.id
  secret_string = jsonencode({
    "key" : "REPLACEWITHACCESSTOKENVALUE",
  })
}

resource "aws_secretsmanager_secret" "ghsa-key" {
  name        = "${var.app}/ghsa-key"
  description = "GitHub PAT for accessing the authenticated GHSA API"
}

resource "aws_secretsmanager_secret_version" "ghsa-key" {
  secret_id = aws_secretsmanager_secret.ghsa-key.id
  secret_string = jsonencode({
    "key" : "REPLACEWITHPATVALUE",
  })
}

resource "aws_secretsmanager_secret" "php-compose-auth" {
  name        = "${var.app}/php-compose-auth"
  description = "PHP private repo authentication information"
}

resource "aws_secretsmanager_secret_version" "php-compose-auth" {
  secret_id = aws_secretsmanager_secret.php-compose-auth.id
  secret_string = jsonencode({
    "username" : "REPLACEWITHUSERNAME",
    "password" : "REPLACEWITHPASSWORD",
    "url" : "FQDN"
  })
}

resource "aws_secretsmanager_secret" "node-dep-creds" {
  name        = "${var.app}/node-dep-creds"
  description = "Private NPM repository authentication information"
}

resource "aws_secretsmanager_secret_version" "node-dep-creds" {
  secret_id = aws_secretsmanager_secret.node-dep-creds.id
  secret_string = jsonencode([
    {
      "username" : "REPLACEWITHUSERNAME",
      "password" : "REPLACEWITHPASSWORD",
      "email" : "REPLACEWITHUSEREMAIL",
      "token" : "REPLACEWITHACCESSTOKEN",
      "scope" : "REPLACEWITHPACKAGESCOPE",
      "registry" : "REPLACEWITHREGISTRYURL"
    }
  ])
}

resource "aws_secretsmanager_secret" "private_docker_repo_creds" {
  name        = "${var.app}/private_docker_repo_creds"
  description = "Private Docker repository configuration and authentication information"
}

resource "aws_secretsmanager_secret_version" "private_docker_repo_creds" {
  secret_id = aws_secretsmanager_secret.private_docker_repo_creds.id
  secret_string = jsonencode([
    {
      "url" : "REPLACEWITHREGISTRYURL",
      "search" : "FROMLINEFORIDENTIFYINGPRIVATEBASEIMAGES",
      "username" : "REPLACEWITHUSERNAME",
      "password" : "REPLACEWITHPASSWORD"
    }
  ])
}

resource "aws_secretsmanager_secret" "pepper" {
  name        = "${var.app}/pepper"
  description = "Artemis Pepper for deduping secret results"
}
resource "aws_secretsmanager_secret_version" "artemis-pepper" {
  secret_id = aws_secretsmanager_secret.pepper.id
  secret_string = jsonencode({
    "key" : "REPLACEVALUE",
  })
}

###############################################################################
# Datadog
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
###############################################################################
# Testing
###############################################################################

resource "aws_secretsmanager_secret" "properties" {
  name        = "${var.app}/properties"
  description = "Integration testing configuration information"
}

resource "aws_secretsmanager_secret_version" "properties" {
  secret_id = aws_secretsmanager_secret.properties.id
  secret_string = jsonencode({
    "s3_bucket" : var.s3_analyzer_files_id,
    "url" : "https://${var.domain_name}/api/v1",
    "key" : "REPLACEWITHARTEMISAPIKEY"
  })
}
