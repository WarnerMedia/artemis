from aws_lambda_powertools.logging import Logger
from aws_lambda_powertools.metrics.provider.datadog import DatadogMetrics, DatadogProvider

from heimdall_utils.env import APPLICATION

log = Logger(service=APPLICATION, name=__name__, child=True)


class DatadogSingleton:
    _instance = None

    def __new__(cls) -> DatadogMetrics:
        if cls._instance is None:
            cls._instance = cls._create_instance()
        return cls._instance

    @classmethod
    def _create_instance(cls) -> DatadogMetrics:
        log.debug("Creating Datadog Metric Provider")
        provider = DatadogProvider(namespace=APPLICATION, flush_to_log=False)
        metrics = DatadogMetrics(provider=provider)
        return metrics


def get_metrics():
    return DatadogSingleton()
