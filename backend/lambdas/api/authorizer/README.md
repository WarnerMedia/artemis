# API authorizer lambda

API Gateway authorizer to enable authorization via AWS Cognito or API keys.

## Endpoints

Invoked via API Gateway.

## Configuration

### Standard environment variables

* `ARTEMIS_DEFAULT_SCOPE`
* `ARTEMIS_MAINTENANCE_MODE`
* `ARTEMIS_MAINTENANCE_MODE_MESSAGE`
* `ARTEMIS_MAINTENANCE_MODE_RETRY_AFTER`

### Lambda-specific environment variables

* `APP_CLIENT_ID` - AWS Cognito app client ID. This is used to vaidate that the token came from the expected AWS Cognito user pool.
* `ARTEMIS_DEFAULT_SCOPE` - (Optional) JSON array of default repository scopes to assign to new users. Example: `["github/warnermedia/artemis"]`. Default: `[]`
* `EMAIL_DOMAIN_ALIASES` - (Optional) JSON array of transformations to apply when matching users from Cognito to registered users within the app (see below). Default: `[]`
* `REGION` - AWS region of the AWS Cognito user pool (e.g. `us-east-`).
* `USERPOOL_ID` - ID of the AWS Cognito user pool.

## Email domain aliases

The `EMAIL_DOMAIN_ALIASES` configuration enables support for authentication systems where a given user may have multiple email addresses under different domains. A common case is a large organization which has changed names but kept the old email domain as an alias for the new domain.

For example: A user logs in via Cognito as `jane.doe@example.com` but is registered in Artemis as `jane_doe@example.org`.

`EMAIL_DOMAIN_ALIASES` is a JSON array. Example:

```json
[
    {
        "email_transformation": {
            "new_email_regex": "[.]",
            "old_email_expr": "_"
        },
        "new_domain": "example.com",
        "old_domains": [
            "example.org",
            "example.net"
        ]
    },
    {
        "email_transformation": null,
        "new_domain": "example.com",
        "old_domains": [
            "foo.example"
        ]
    }
]
```

Each object in the array has these fields:

* `email_transformation` - (Optional) Apply a search-and-replace on the localpart of the email address (i.e. the part before the `@`). `new_email_regex` is a [Python regular expression](https://docs.python.org/3/library/re.html) which is applied to the email address from Cognito (e.g. the _current_ email address the user uses to log in), with each match replaced by the [pattern](https://docs.python.org/3/library/re.html#re.sub) `old_email_expr` in order to search within Artemis.
* `new_domain` - The current email domain the user uses to authenticate (passed to this lambda from Cognito).
* `old_domains` - List of past email domains, i.e. if the user is already registered in Artemis, they may be using one of these old domains.
