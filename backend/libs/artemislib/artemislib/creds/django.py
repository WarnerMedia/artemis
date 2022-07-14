import os

from artemislib.aws import AWSConnect


class DjangoSecrets:
    def __init__(self):
        super().__init__()
        self.secret_key = None

        arn = os.environ.get("ANALYZER_DJANGO_SECRETS_ARN")
        if arn:
            aws = AWSConnect()
            creds = aws.get_secret(arn)
            if not creds:
                raise Exception("Failed to get secrets from Secrets Manager")
            self.secret_key = creds["secret_key"]
        else:
            self.secret_key = os.environ.get("ANALYZER_DJANGO_SECRET_KEY")

        if not (self.secret_key):
            raise Exception("Failed to get django secrets")
