import unittest
import uuid
from datetime import datetime, time, timezone

from artemisdb.artemisdb.models import ScanSchedule
from scan_scheduler.schedule import _get_next_day_of_month, _get_next_day_of_week, _set_time, calculate_next_scan_time


def noop():
    pass


SCHEDULE = ScanSchedule(
    schedule_id=uuid.UUID("7da8475c-6aa6-4514-9f68-95c8d3253985"),
    name="Unit Testing",
    owner_id=1,
    next_scan_time=datetime.fromtimestamp(0).replace(tzinfo=timezone.utc),
)
SCHEDULE.save = noop


class TestNextScanTime(unittest.TestCase):
    def test_intervals(self):
        # These times are way in the future so that they don't hit the "if the new time is in the past" logic
        current = datetime(2121, 12, 1, 0, 0, 0, 0, timezone.utc)
        expected = datetime(2121, 12, 1, 1, 0, 0, 0, timezone.utc)
        SCHEDULE.interval_minutes = 60
        SCHEDULE.next_scan_time = current
        calculate_next_scan_time(SCHEDULE)
        self.assertEqual(SCHEDULE.next_scan_time, expected)

    def test_next_in_past(self):
        current = datetime(2021, 12, 1, 0, 0, 0, 0, timezone.utc)
        expected = datetime.now(timezone.utc)
        SCHEDULE.interval_minutes = 60
        SCHEDULE.next_scan_time = current
        calculate_next_scan_time(SCHEDULE)
        self.assertGreaterEqual(SCHEDULE.next_scan_time, expected)

    def test_set_time(self):
        test_case = datetime(2021, 12, 1, 10, 11, 12, tzinfo=timezone.utc)
        expected = datetime(2021, 12, 1, 3, 30, 0, tzinfo=timezone.utc)
        actual = _set_time(test_case, time(3, 30, 0, tzinfo=timezone.utc))
        self.assertEqual(expected, actual)

    def test_set_time_none(self):
        test_case = datetime(2021, 12, 1, 10, 11, 12, tzinfo=timezone.utc)
        expected = datetime(2021, 12, 1, 0, 0, 0, tzinfo=timezone.utc)
        actual = _set_time(test_case)
        self.assertEqual(expected, actual)

    def test_next_day_of_week(self):
        dt = datetime(2021, 12, 14, 12, 30, 45, tzinfo=timezone.utc)  # Tuesday
        expected = datetime(2021, 12, 20, 12, 30, 45, tzinfo=timezone.utc)  # Monday
        actual = _get_next_day_of_week(dt, 0)
        self.assertEqual(expected, actual)

    def test_next_day_of_month_same(self):
        dt = datetime(2021, 12, 14, 12, 30, 45, tzinfo=timezone.utc)
        expected = datetime(2021, 12, 15, 12, 30, 45, tzinfo=timezone.utc)
        actual = _get_next_day_of_month(dt, 15)
        self.assertEqual(expected, actual)

    def test_next_day_of_month_next(self):
        dt = datetime(2021, 12, 16, 12, 30, 45, tzinfo=timezone.utc)
        expected = datetime(2022, 1, 15, 12, 30, 45, tzinfo=timezone.utc)
        actual = _get_next_day_of_month(dt, 15)
        self.assertEqual(expected, actual)
