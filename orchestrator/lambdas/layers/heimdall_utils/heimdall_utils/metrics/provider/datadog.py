from typing import Any, Callable, Optional
from aws_lambda_powertools.metrics.provider.datadog import DatadogMetrics, DatadogProvider

from heimdall_utils.metrics.base import MetricsProvider, MetricsConfig


class DatadogMetricsProvider(MetricsProvider):
    """
    Implementation of MetricsProvider for Datadog using AWS Lambda Powertools.
    """

    def __init__(self, config: MetricsConfig):
        namespace = config.get("namespace")
        flush_to_log = config.get("flush_to_log")
        provider = DatadogProvider(namespace=namespace, flush_to_log=flush_to_log)
        self.metrics = DatadogMetrics(provider=provider)

    def add_metric(self, name: str, value: float, **tags) -> None:
        self.metrics.add_metric(name, value, **tags)

    def log_metrics(
        self,
        lambda_handler: Optional[Callable] = None,
        capture_cold_start_metric: bool = False,
        raise_on_empty_metrics: bool = False,
    ) -> Callable:
        return self.metrics.log_metrics(lambda_handler, capture_cold_start_metric, raise_on_empty_metrics)
