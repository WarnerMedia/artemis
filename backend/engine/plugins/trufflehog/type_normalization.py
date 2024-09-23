_SSH_TYPES = ["PrivateKey"]
_AWS_TYPES = ["AWS", "AWSSessionKey"]
_MONGO_TYPES = ["MongoDB"]
_POSTGRES_TYPES = ["Postgres"]
_GOOGLE_TYPES = ["GoogleOauth2", "GoogleApiKey", "GCPApplicationDefaultCredentials", "GCP"]
_REDIS_TYPES = ["Redis"]
_SLACK_TYPES = ["Slack", "SlackWebhook"]


def get_type_normalization_table() -> dict[str, str]:
    table = {}

    for name in _SSH_TYPES:
        table[name] = "ssh"

    for name in _AWS_TYPES:
        table[name] = "aws"

    for name in _MONGO_TYPES:
        table[name] = "mongo"

    for name in _POSTGRES_TYPES:
        table[name] = "postgres"

    for name in _GOOGLE_TYPES:
        table[name] = "google"

    for name in _REDIS_TYPES:
        table[name] = "redis"

    for name in _SLACK_TYPES:
        table[name] = "slack"

    return table


_TYPE_NORMALIZATION_TABLE = get_type_normalization_table()


def normalize_type(finding_type: str) -> str:
    if finding_type in _TYPE_NORMALIZATION_TABLE:
        return _TYPE_NORMALIZATION_TABLE[finding_type]
    else:
        return finding_type
