from artemislib.logging import Logger
from artemisdb.artemisdb.models import APIKey
from django.utils import timezone
import boto3

LOG = Logger(__name__)


def handler(_event=None, _context=None):
    yesterday = timezone.now() - timezone.timedelta(days=1)
    now = timezone.now()
    api_keys = list(APIKey.objects.filter(expires__gte=yesterday, expires__lte=now + timezone.timedelta(days=30)))
    now = timezone.now()
    in_30_days = []
    in_7_days = []
    in_2_days = []
    in_1_day = []
    just_expired = []

    for key in api_keys:
        expires = key.expires
        if expires is None:
            continue
        delta = expires - now
        if 7 < delta.days <= 30:
            in_30_days.append((key))
        if 2 < delta.days <= 7:
            in_7_days.append((key))
        if 1 < delta.days <= 2:
            in_2_days.append((key))
        if 0 <= delta.days <= 1:
            in_1_day.append((key))
        if -1 <= delta.days <= 0 and expires <= now:
            just_expired.append((key))
    notify_user(30, in_30_days)
    notify_user(7, in_7_days)
    notify_user(2, in_2_days)
    notify_user(1, in_1_day)
    notify_user(0, just_expired)


def notify_user(days: int, keys):
    message = (
        'Your key "{name}" will expire {expiration}.'
        "You can see a list of your keys here: https://artemis.appsec.cso.warnermedia.com/settings"
    )
    for key in keys:
        name = key.name
        expiration = ""
        match days:
            case 30:
                expiration = "in the next 30 days"
            case 7:
                expiration = "in the next 7 days"
            case 2:
                expiration = "in the next 2 days"
            case 1:
                expiration = "within the next day"
            case 0:
                message = (
                    'Your key "{name}" has expired.'
                    "You can see a list of your keys here: https://artemis.appsec.cso.warnermedia.com/settings"
                )
                expiration = ""

        send_email(message.format(name=name, expiration=expiration), key.user.email)


def send_email(message, email):
    LOG.info("sending message to email %s", email)
    LOG.info(message)
    ses = boto3.client("ses", region_name="us-east-1")

    ses.send_email(
        Source="matt.fleury@wbd.com",
        Destination={"ToAddresses": [email]},
        Message={
            "Subject": {"Data": "Artemis API Key Expiration Notice"},
            "Body": {"Text": {"Data": message}},
        },
    )
