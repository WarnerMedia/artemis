from datetime import datetime, timedelta, timezone


def get_utc_datetime(offset_minutes=None):
    now = datetime.utcnow().replace(tzinfo=timezone.utc)
    if offset_minutes is not None:
        now = now + timedelta(minutes=offset_minutes)
    return now


def format_timestamp(utc_dt=None) -> str:
    if utc_dt:
        return utc_dt.replace(tzinfo=timezone.utc).isoformat(timespec="microseconds")
    return None
