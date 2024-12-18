from typing import Literal

from artemislib.env import DATADOG_ENABLED, APPLICATION
from artemislib.metrics.base import MetricsConfig, MetricsProvider, DefaultMetricsProvider
from artemislib.metrics.provider.datadog import DatadogMetricsProvider

MetricsProviderName = Literal["Datadog", "Default"]

DEFAULT_PROVIDER: MetricsProviderName = "Datadog"
DEFAULT_CONFIG: MetricsConfig = {"namespace": APPLICATION, "flush_to_log": False}


class MetricsFactory:
    """
    Factory class for creating and managing MetricsProvider instances.
    """

    _instances: dict[str, MetricsProvider] = {"Default": DefaultMetricsProvider()}

    @classmethod
    def create_metrics_provider(cls, provider: MetricsProviderName, config: MetricsConfig = DEFAULT_CONFIG):
        if provider == "Datadog" and DATADOG_ENABLED:
            cls._instances[provider] = DatadogMetricsProvider(config)
            return cls._instances[provider]
        return cls._instances["Default"]

    @classmethod
    def get_metrics_provider(cls, provider) -> MetricsProvider:
        if provider in cls._instances:
            return cls._instances[provider]

        return cls.create_metrics_provider(provider)


def get_metrics(provider: MetricsProviderName = DEFAULT_PROVIDER):
    return MetricsFactory.get_metrics_provider(provider)
