from .env import KEY_REMINDER_FROM_EMAIL, KEY_REMINDER_SES_REGION, ARTEMIS_DOMAIN
from artemislib.logging import Logger
from artemisdb.artemisdb.models import APIKey
from django.utils import timezone
from datetime import datetime
import boto3

LOG = Logger(__name__)


def handler(_event=None, _context=None):
    if not KEY_REMINDER_FROM_EMAIL or not KEY_REMINDER_SES_REGION or not ARTEMIS_DOMAIN:
        LOG.error("One or more required environment variables are missing or empty.")
        return

    now = timezone.now()
    api_keys = get_expiring_api_keys(now)
    in_30_days = []
    in_7_days = []
    in_3_days = []
    in_2_days = []
    in_1_day = []
    expired = []

    for key in api_keys:
        if key.expires is None:
            continue
        delta = key.expires - now

        match delta.days:
            case 30:
                in_30_days.append((key))
            case 7:
                in_7_days.append((key))
            case 3:
                in_3_days.append((key))
            case 2:
                in_2_days.append((key))
            case 1:
                in_1_day.append((key))

        # 0 could mean its about to expire, but close enough.
        if delta.days <= 0:
            expired.append((key))

    notify_user(30, in_30_days)
    notify_user(7, in_7_days)
    notify_user(3, in_3_days)
    notify_user(2, in_2_days)
    notify_user(1, in_1_day)
    notify_user(0, expired)


def get_expiring_api_keys(now: datetime) -> list[APIKey]:
    yesterday = now - timezone.timedelta(days=1)
    return list(APIKey.objects.filter(expires__gte=yesterday, expires__lte=now + timezone.timedelta(days=30)))


def notify_user(days: int, keys):
    message = 'Your key "{name}" will expire {expiration}.'

    expiration = ""

    match days:
        case 30:
            expiration = "in the next 30 days"
        case 7:
            expiration = "in the next 7 days"
        case 3:
            expiration = "in the next 3 days"
        case 2:
            expiration = "in the next 2 days"
        case 1:
            expiration = "within the next day"
        case 0:
            message = 'Your key "{name}" has expired.'
            expiration = ""

    message += "\nYou can see a list of your keys here: https://{domain}/settings"

    for key in keys:
        LOG.info(
            'Notifying user {email} about key "{name}"" expiring in {days} days ({expiration})'.format(
                email=key.user.email, name=key.name, days=days, expiration=key.expires
            )
        )
        send_email(message.format(name=key.name, expiration=expiration, domain=ARTEMIS_DOMAIN), key.user.email)


def send_email(message, email):
    ses = boto3.client("ses", region_name=KEY_REMINDER_SES_REGION)

    try:
        ses.send_email(
            Source=KEY_REMINDER_FROM_EMAIL,
            Destination={"ToAddresses": [email]},
            Message={
                "Subject": {"Data": "Artemis API Key Expiration Notice"},
                "Body": {"Text": {"Data": message}},
            },
        )
    except Exception as e:
        LOG.error(f"Unexpected error when sending email to {email}: {e}")
