"""
Base adapter interface for KINETIC provider execution backends.

All adapters must implement the `execute()` method, which takes a task
dict and returns a standardized result dict.
"""

from __future__ import annotations

import hashlib
import time
from abc import ABC, abstractmethod
from typing import Any


class ExecutionResult:
    """Standardized result from any execution adapter."""

    __slots__ = ("output", "result_hash", "method", "duration_ms", "metadata")

    def __init__(
        self,
        output: str,
        result_hash: str,
        method: str,
        duration_ms: int = 0,
        metadata: dict[str, Any] | None = None,
    ):
        self.output = output
        self.result_hash = result_hash
        self.method = method
        self.duration_ms = duration_ms
        self.metadata = metadata or {}

    def to_dict(self) -> dict[str, Any]:
        return {
            "output": self.output,
            "result_hash": self.result_hash,
            "method": self.method,
            "duration_ms": self.duration_ms,
            "metadata": self.metadata,
        }


class BaseAdapter(ABC):
    """
    Abstract base class for execution adapters.

    Every adapter must implement:
      - execute(task) -> ExecutionResult
      - is_available() -> bool
      - capabilities() -> dict
    """

    name: str = "base"

    @abstractmethod
    def execute(self, task: dict[str, Any]) -> ExecutionResult:
        """
        Execute a compute workload.

        Args:
            task: Dict with keys: type, payload, tokens, and optional extras.

        Returns:
            ExecutionResult with output, result_hash, method, duration_ms.
        """
        ...

    @abstractmethod
    def is_available(self) -> bool:
        """Check if this adapter is currently available."""
        ...

    @abstractmethod
    def capabilities(self) -> dict[str, Any]:
        """Return capability metadata for provider registration."""
        ...

    @staticmethod
    def hash_output(output: str) -> str:
        """Generate SHA-256 hash of the output string."""
        return hashlib.sha256(output.encode()).hexdigest()

    @staticmethod
    def timed_execute(func, *args, **kwargs) -> tuple[Any, int]:
        """Execute a function and return (result, duration_ms)."""
        start = time.perf_counter()
        result = func(*args, **kwargs)
        duration_ms = int((time.perf_counter() - start) * 1000)
        return result, duration_ms
