from abc import ABC, abstractmethod
from typing import Callable, TypedDict, Optional, Any


class MetricsConfig(TypedDict):
    """
    Configurations for a Metric Provider
    """

    namespace: str
    flush_to_log: bool


class MetricsProvider(ABC):
    """
    Abstract base class for metrics providers.

    Defines an interface that all concrete metrics providers must implement.
    """

    @abstractmethod
    def add_metric(self, name: str, value: float, **tags: Any) -> None:
        """
        Add a Metric to the provider

        Args:
            name (str): Name of the metric to publish
            value (float): Value of the metric
            tags (Any): Additional Tags for the metric

        Raises:
            NotImplementedError
        """
        raise NotImplementedError

    @abstractmethod
    def log_metrics(
        self,
        lambda_handler: Optional[Callable] = None,
        capture_cold_start_metric: bool = False,
        raise_on_empty_metrics: bool = False,
    ) -> Callable:
        """
        Decorator to publish metrics at the end of a Lambda execution

        Args:
            lambda_handler (Optional[Callable]): The Lambda handler function
            capture_cold_start_metric (bool, optional): Whether to capture cold start metric
            raise_on_empty_metrics (bool, optional): Whether to raise an exception if no metrics are collected

        Raises:
            NotImplementedError
        """
        raise NotImplementedError


class DefaultMetricsProvider(MetricsProvider):
    """
    Default Implementation of MetricsProvider. Used as a default when no specific provider is enabled.
    """

    def __init__(self) -> None:
        pass

    def add_metric(self, name: str, value: float, **tags) -> None:
        pass

    def log_metrics(
        self,
        lambda_handler: Optional[Callable] = None,
        capture_cold_start_metric: bool = False,
        raise_on_empty_metrics: bool = False,
        default_dimensions: Optional[dict[str, str]] = None,
    ) -> Callable:
        def decorator(func):
            return func  # Return function unchanged

        return decorator if lambda_handler is None else decorator(lambda_handler)
