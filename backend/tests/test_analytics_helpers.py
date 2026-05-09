from datetime import date, timedelta
from decimal import Decimal
import unittest

from app.api.v1.endpoints.analytics import _compute_delay_days, _to_float
from app.models.project import Project, ProjectStatus


class AnalyticsHelperTests(unittest.TestCase):
    def test_compute_delay_days_returns_none_for_completed_projects(self):
        project = Project(
            status=ProjectStatus.COMPLETED,
            original_end_date=date.today() - timedelta(days=20),
        )

        self.assertIsNone(_compute_delay_days(project))

    def test_compute_delay_days_uses_revised_end_date_when_present(self):
        project = Project(
            status=ProjectStatus.IN_PROGRESS,
            original_end_date=date.today() - timedelta(days=40),
            revised_end_date=date.today() - timedelta(days=7),
        )

        self.assertEqual(_compute_delay_days(project), 7)

    def test_compute_delay_days_returns_zero_for_future_deadline(self):
        project = Project(
            status=ProjectStatus.IN_PROGRESS,
            original_end_date=date.today() + timedelta(days=12),
        )

        self.assertEqual(_compute_delay_days(project), 0)

    def test_to_float_handles_decimal_and_none(self):
        self.assertEqual(_to_float(Decimal("123.45")), 123.45)
        self.assertEqual(_to_float(None), 0.0)


if __name__ == "__main__":
    unittest.main()
