import os

from artemislib.aws import AWSConnect


def get_github_linking_app_creds():
    """
    Get the Client ID/Client Secret for the GitHub App used to link GitHub accounts to Artemis users
    """
    client_id = None
    client_secret = None

    arn = os.environ.get("ARTEMIS_LINK_GH_SECRETS_ARN")

    if arn:
        aws = AWSConnect()
        creds = aws.get_secret(arn)
        if not creds:
            raise Exception("Failed to get secrets from Secrets Manager")
        client_id = creds["client_id"]
        client_secret = creds["client_secret"]
    else:
        client_id = os.environ.get("ARTEMIS_LINK_GH_CLIENT_ID")
        client_secret = os.environ.get("ARTEMIS_LINK_GH_CLIENT_SECRET")

    if not (client_id and client_secret):
        raise Exception("Failed to get Link GitHub Account app secrets")

    return {"client_id": client_id, "client_secret": client_secret}
