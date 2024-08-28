import unittest

from heimdall_utils.metrics.factory import MetricsFactory
from heimdall_utils.metrics.provider.datadog import DatadogMetricsProvider


class TestMetricsUtil(unittest.TestCase):
    def test_metric_factory_default_provider(self):
        provider1 = MetricsFactory.get_metrics_provider("Default")
        provider2 = MetricsFactory.get_metrics_provider("Default")
        self.assertEqual(provider1, provider2)

    def test_metric_factory_datadog_provider(self):
        provider1 = MetricsFactory.get_metrics_provider("Datadog")
        provider2 = MetricsFactory.get_metrics_provider("Datadog")
        self.assertEqual(provider1, provider2)
        print(type(provider1))
        self.assertTrue(isinstance(provider1, DatadogMetricsProvider))
