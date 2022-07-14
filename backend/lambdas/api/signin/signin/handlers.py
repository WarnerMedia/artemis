import os
import re
from base64 import b64encode
from datetime import datetime, timedelta

import requests

from artemislib.aws import AWSConnect

COGNITO_DOMAIN = os.environ["COGNITO_DOMAIN"]
CLIENT_ID = os.environ["CLIENT_ID"]
CLIENT_SECRET_ARN = os.environ["CLIENT_SECRET_ARN"]


def handler(event, context):
    headers = event.get("headers") or {}
    query = event.get("queryStringParameters") or {}

    # Authorization code
    code = query.get("code")
    if not code:
        # No code so return 401
        return {"isBase64Encoded": "false", "statusCode": 401}

    # Host and path are needed to build the expected redirect_uri value
    host = headers.get("Host")
    path = event.get("path")

    # Account for inconsistent header capitalization ("Cookie" or "cookie")
    cookie = headers.get("Cookie", "")  # Capital C Cookie
    if not cookie:
        cookie = headers.get("cookie", "")  # Just in case check for lowercase c cookie

    # Pull the redirect location out of the signin_redirect cookie
    location = re.sub(r"^.*signin_redirect=([^;]+).*$", r"\1", cookie)

    # Make sure we have everything we need
    if not (host and path and location):
        # Missing pieces in the request to return 400
        return {"isBase64Encoded": "false", "statusCode": 400}

    # Request the token using the authorization code
    req = f"grant_type=authorization_code&client_id={CLIENT_ID}&code={code}&redirect_uri=https://{host}{path}"
    resp = requests.post(
        f"https://{COGNITO_DOMAIN}/oauth2/token",
        headers={
            "Content-Type": "application/x-www-form-urlencoded",
            "Authorization": f"Basic {basic_auth(CLIENT_ID)}",
        },
        data=req,
    )
    if resp.status_code == 200:
        # Authorization code grant was successful. Set the id_token cookie and redirect to the
        # original request location
        body = resp.json()
        return {
            "isBase64Encoded": "false",
            "statusCode": 302,
            "headers": {"Location": location},
            "multiValueHeaders": {
                "Set-Cookie": [
                    # Set id_token
                    f'id_token={body["id_token"]}; Secure; SameSite=Lax; Path=/; HttpOnly',
                    # Delete signin_redirect by setting an expiration in the past
                    f"signin_redirect={location}; Secure; SameSite=Lax; Path=/; Expires={expiration()}",
                ]
            },
        }
    else:
        # Authorization code grant was unsuccessful so return 401
        return {"isBase64Encoded": "false", "statusCode": 401}


def basic_auth(client_id: str) -> str:
    # Create the HTTP basis auth token from the provided client ID and the client secret
    # stored in Secrets Manager
    aws = AWSConnect()
    client_secret = aws.get_secret(CLIENT_SECRET_ARN).get("key")
    return b64encode(bytes(f"{client_id}:{client_secret}", "utf-8")).decode("utf-8")


def expiration() -> str:
    # Create a datetime one hour in the past
    expired = datetime.utcnow() - timedelta(hours=1)
    return expired.strftime("%a %d %b %Y %H:%M:%S GMT")  # Cookie expiration format
