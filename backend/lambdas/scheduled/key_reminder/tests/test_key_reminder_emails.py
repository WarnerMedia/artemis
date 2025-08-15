import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from key_reminder.handlers import handler
from datetime import datetime


@pytest.fixture
def mock_api_keys():
    with patch("key_reminder.handlers.get_expiring_api_keys") as mock:
        yield mock


@pytest.fixture
def mock_send_mail():
    with patch("key_reminder.handlers.send_email") as mock:
        yield mock


@pytest.fixture(autouse=True)
def mock_timezone_now():
    with patch("key_reminder.handlers.timezone") as mock_timezone:
        mock_timezone.now.return_value = datetime(2025, 7, 1)
        mock_timezone.side_effect = lambda *args, **kwargs: datetime(*args, **kwargs)
        yield mock_timezone


@pytest.fixture(autouse=True)
def patch_key_reminder_envs():
    with (
        patch("key_reminder.handlers.KEY_REMINDER_FROM_EMAIL", "from@example.com"),
        patch("key_reminder.handlers.KEY_REMINDER_SES_REGION", "us-east-2"),
        patch("key_reminder.handlers.ARTEMIS_DOMAIN", "artemis.com"),
    ):
        yield


def test_missing_envs(caplog: pytest.LogCaptureFixture):
    with (
        patch("key_reminder.handlers.KEY_REMINDER_FROM_EMAIL", ""),
        patch("key_reminder.handlers.KEY_REMINDER_SES_REGION", ""),
        patch("key_reminder.handlers.ARTEMIS_DOMAIN", ""),
    ):
        with caplog.at_level(1):
            handler()

        assert any("One or more required environment variables are missing or empty" in msg for msg in caplog.messages)
        assert any(record.levelname == "ERROR" for record in caplog.records)


def test_remind_keys_no_expiring_keys(mock_api_keys: MagicMock | AsyncMock, mock_send_mail: MagicMock | AsyncMock):
    mock_api_keys.return_value = []
    handler()
    mock_send_mail.assert_not_called()


def test_remind_keys_sends_email_for_expiring_keys(
    mock_api_keys: MagicMock | AsyncMock, mock_send_mail: MagicMock | AsyncMock
):
    mock_key = MagicMock()
    mock_key.name = "abc123"
    mock_key.expires = datetime(2025, 7, 8)
    mock_key.user.email = "user@example.com"
    mock_api_keys.return_value = [mock_key]
    handler()
    mock_send_mail.assert_called()
    called = [{"message": call[0][0], "email": call[0][1]} for call in mock_send_mail.call_args_list]

    assert called[0].get("email") == "user@example.com"
    assert "will expire in the next 7 days" in called[0].get("message", "")


def test_remind_keys_multiple_expiring_keys(
    mock_api_keys: MagicMock | AsyncMock, mock_send_mail: MagicMock | AsyncMock
):
    mock_key1 = MagicMock()
    mock_key1.name = "key1"
    mock_key1.expires = datetime(2025, 7, 31)
    mock_key1.user.email = "user1@example.com"

    mock_key2 = MagicMock()
    mock_key2.name = "key2"
    mock_key2.expires = datetime(2025, 7, 8)
    mock_key2.user.email = "user2@example.com"

    mock_api_keys.return_value = [mock_key1, mock_key2]
    handler()
    assert mock_send_mail.call_count == 2

    called = [{"message": call[0][0], "email": call[0][1]} for call in mock_send_mail.call_args_list]

    assert called[0].get("email") == "user1@example.com"
    assert called[1].get("email") == "user2@example.com"

    assert "will expire in the next 30 days" in called[0].get("message", "")
    assert "will expire in the next 7 days" in called[1].get("message", "")


def test_remind_keys_expired_key(mock_api_keys: MagicMock | AsyncMock, mock_send_mail: MagicMock | AsyncMock):
    mock_key1 = MagicMock()
    mock_key1.name = "expired key"
    mock_key1.expires = datetime(2025, 7, 1)
    mock_key1.user.email = "expired@example.com"

    mock_api_keys.return_value = [mock_key1]
    handler()
    assert mock_send_mail.call_count == 1

    called = [{"message": call[0][0], "email": call[0][1]} for call in mock_send_mail.call_args_list]

    assert called[0].get("email") == "expired@example.com"

    assert "has expired" in called[0].get("message", "")


def test_remind_keys_no_duplicate_emails(mock_api_keys: MagicMock | AsyncMock, mock_send_mail: MagicMock | AsyncMock):
    mock_key1 = MagicMock()
    mock_key1.name = "already sent"
    mock_key1.expires = datetime(2025, 7, 24)
    mock_key1.user.email = "user@example.com"

    mock_api_keys.return_value = [mock_key1]
    handler()
    mock_send_mail.assert_not_called()
