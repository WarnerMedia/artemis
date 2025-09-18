from artemislib.env import APPLICATION, REV_PROXY_SECRET, REV_PROXY_SECRET_REGION


class GetProxySecret:
    _secret = None

    def __new__(cls):
        if not cls._secret:
            from artemislib.aws import AWSConnect  # pylint: disable=import-outside-toplevel

            aws_connect = AWSConnect(region=REV_PROXY_SECRET_REGION)
            cls._secret = aws_connect.get_secret_raw(REV_PROXY_SECRET)
        return cls._secret


def get_api_key(service_secret) -> str:
    from artemislib.aws import AWSConnect, ClientError  # pylint: disable=import-outside-toplevel

    aws_connect = AWSConnect()
    try:
        secret = aws_connect.get_secret(f"{APPLICATION}/{service_secret}")
        if secret:
            return secret.get("key", "")
    except ClientError:
        return ""
    return ""
