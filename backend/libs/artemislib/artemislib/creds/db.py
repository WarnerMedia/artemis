import os

from artemislib.aws import AWSConnect


class DatabaseCreds:
    def __init__(self):
        super().__init__()
        self.name = None
        self.username = None
        self.password = None
        self.host = None
        self.port = None

        creds_arn = os.environ.get("ANALYZER_DB_CREDS_ARN")
        if creds_arn:
            aws = AWSConnect()
            creds = aws.get_secret(creds_arn)
            if not creds:
                raise Exception("Failed to get creds from Secrets Manager")
            self.name = creds["dbname"]
            self.username = creds["username"]
            self.password = creds["password"]
            self.host = creds["host"]
            self.port = creds["port"]
        else:
            self.name = os.environ.get("ANALYZER_DB_NAME")
            self.username = os.environ.get("ANALYZER_DB_USERNAME")
            self.password = os.environ.get("ANALYZER_DB_PASSWORD")
            self.host = os.environ.get("ANALYZER_DB_HOST")
            self.port = int(os.environ.get("ANALYZER_DB_PORT"))

        if not (self.name and self.username and self.password and self.host and self.port):
            raise Exception("Failed to get creds")
