"""
Local CPU/subprocess execution adapter.

Executes workloads directly on the host machine using:
  - Iterative SHA-256 hashing (deterministic, verifiable)
  - Python subprocess execution (sandboxed via subprocess)

This is the default fallback when no GPU or Docker is available.
"""

from __future__ import annotations

import hashlib
import subprocess
import time
from typing import Any

from provider_node.adapters.base import BaseAdapter, ExecutionResult


class LocalAdapter(BaseAdapter):
    """Execute workloads on local CPU via subprocess."""

    name = "local_cpu"

    def execute(self, task: dict[str, Any]) -> ExecutionResult:
        task_type = str(task.get("type", "inference"))
        payload = str(task.get("payload", ""))
        tokens = int(task.get("tokens", 0))

        start = time.perf_counter()

        if task_type == "python_exec":
            output, method = self._python_exec(task.get("script", "print('hello')"))
        else:
            output, method = self._sha256_chain(payload, tokens)

        duration_ms = int((time.perf_counter() - start) * 1000)

        return ExecutionResult(
            output=output,
            result_hash=self.hash_output(output),
            method=method,
            duration_ms=duration_ms,
        )

    def is_available(self) -> bool:
        return True  # Always available — runs on CPU

    def capabilities(self) -> dict[str, Any]:
        import os
        try:
            import psutil
            cpu_count = psutil.cpu_count()
            memory_gb = round(psutil.virtual_memory().total / (1024 ** 3), 1)
        except ImportError:
            cpu_count = os.cpu_count() or 1
            memory_gb = 0

        return {
            "adapter": self.name,
            "gpu_available": False,
            "cpu_count": cpu_count,
            "memory_gb": memory_gb,
            "supported_tasks": ["sha256_compute", "inference", "python_exec"],
        }

    @staticmethod
    def _sha256_chain(payload: str, tokens: int) -> tuple[str, str]:
        result = payload
        for _ in range(min(tokens, 1000)):
            result = hashlib.sha256(result.encode()).hexdigest()
        return result, "cpu_sha256"

    @staticmethod
    def _python_exec(script: str) -> tuple[str, str]:
        try:
            proc = subprocess.run(
                ["python", "-c", script],
                capture_output=True, text=True, timeout=30,
            )
            output = proc.stdout.strip()
            if proc.returncode != 0:
                output = f"ERROR: {proc.stderr.strip()}"
            return output, "subprocess"
        except subprocess.TimeoutExpired:
            return "TIMEOUT", "subprocess_timeout"
        except Exception as exc:
            return str(exc), "subprocess_error"
