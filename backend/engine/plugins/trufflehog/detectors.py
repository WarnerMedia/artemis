# Some Trufflehog v3 detectors have overly permissive regular expressions that could lead to creds
# being sent to unrelated services, so we allowlist the detectors that have been determined to be
# safe
verified_detectors_allowlist = [
    "AirbrakeProjectKey",
    "AirbrakeUserKey",
    "AkamaiToken",
    "AmazonMWS",
    "ArtifactoryAccessToken",
    "AsanaOauth",
    "AsanaPersonalAccessToken",
    "Atlassian",
    "AWS",
    "AWSSessionKey",
    "Azure",
    "AzureActiveDirectoryApplicationSecret",
    "AzureBatch",
    "AzureCacheForRedisAccessKey",
    "AzureContainerRegistry",
    "AzureCosmosDBKeyIdentifiable",
    "AzureDevopsPersonalAccessToken",
    "AzureFunctionKey",
    "AzureManagementCertificate",
    "AzureMLWebServiceClassicIdentifiableKey",
    "AzureSasToken",
    "AzureSearchAdminKey",
    "AzureSearchQueryKey",
    "AzureSQL",
    "AzureStorage",
    "BitLyAccessToken",
    "BrowserStack",
    "CircleCI",
    "CloudflareApiToken",
    "CloudflareCaKey",
    "CloudflareGlobalApiKey",
    "DatadogToken",
    "DigitalOceanSpaces",
    "DigitalOceanToken",
    "DigitalOceanV2",
    "Docker",
    "Dockerhub",
    "Docusign",
    "Eventbrite",
    "FastlyPersonalToken",
    "Feedly",
    "FigmaPersonalAccessToken",
    "Firebase",
    "FirebaseCloudMessaging",
    "Flickr",
    "FTP",
    "GCP",
    "Github",
    "GitHubApp",
    "GitHubOauth2",
    "GitHubOld",
    "Gitlab",
    "GoogleApiKey",
    "GoogleOauth2",
    "Grafana",
    "GrafanaServiceAccount",
    "HelloSign",
    "Heroku",
    "IbmCloudUserKey",
    "JiraToken",
    "LinkedIn",
    "MicrosoftTeamsWebhook",
    "Monday",
    "MongoDB",
    "Ngrok",
    "NpmToken",
    "NuGetApiKey",
    "Okta",
    "OpenAI",
    "Optimizely",
    "PagerDutyApiKey",
    "Postgres",
    "Postman",
    "PrivateKey",
    "RabbitMQ",
    "ReCAPTCHA",
    "Redis",
    "RubyGems",
    "Salesforce",
    "SalesforceOauth2",
    "Slack",
    "SlackWebhook",
    "SplunkOberservabilityToken",
    "SQLServer",
    "Square",
    "SquareApp",
    "Squareup",
    "Stripe",
    "TerraformCloudPersonalToken",
    "TravisCI",
    "TrelloApiKey",
    "Twilio",
    "URI",
    "Webex",
    "Wiz",
    "Workday",
    "WpEngine",
]

# Some detectors make a best effort to verify, but are not exhaustive. We never want to mark their
# results as "inactive"
_never_inactive_detectors = [
    "PrivateKey",
]

inactiveable_detectors = [
    detector for detector in verified_detectors_allowlist if detector not in set(_never_inactive_detectors)
]
