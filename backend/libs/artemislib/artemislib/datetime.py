from datetime import datetime, timedelta, timezone


def format_timestamp(utc_dt=None) -> str:
    if utc_dt:
        return utc_dt.replace(tzinfo=timezone.utc).isoformat(timespec="microseconds")
    return None


def get_utc_datetime(offset_minutes=None):
    now = datetime.utcnow().replace(tzinfo=timezone.utc)
    if offset_minutes is not None:
        now = now + timedelta(minutes=offset_minutes)
    return now


def format_unix_time(timestamp) -> datetime:
    return datetime.fromtimestamp(timestamp, tz=timezone.utc).isoformat(timespec="microseconds")


def from_iso_timestamp(timestamp: str) -> datetime:
    if timestamp.endswith("Z"):
        # Replace the Z timezone notation with +00:00
        timestamp = f"{timestamp[:-1]}+00:00"
    dt = datetime.fromisoformat(timestamp)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def format_http_date(timestamp: str) -> str:
    # Format the timestamp into the HTTP Date format
    # Docs: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Date
    return from_iso_timestamp(timestamp).strftime("%a, %d %b %Y %H:%M:%S GMT")
