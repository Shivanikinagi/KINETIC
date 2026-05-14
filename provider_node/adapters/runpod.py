"""
RunPod serverless adapter (future scaling).

Dispatches workloads to RunPod's serverless GPU infrastructure.
This adapter enables scaling beyond free Colab GPUs to on-demand
cloud GPU capacity.

Pricing: ~$0.0002/s for serverless GPU (as of 2026)
Docs:    https://docs.runpod.io/serverless/overview

NOTE: This is a scaffold for future integration. Requires a RunPod
API key and a deployed serverless endpoint.
"""

from __future__ import annotations

import hashlib
import os
import time
from typing import Any

import requests

from provider_node.adapters.base import BaseAdapter, ExecutionResult


class RunPodAdapter(BaseAdapter):
    """Dispatch workloads to RunPod serverless GPU endpoints."""

    name = "runpod"

    def __init__(self):
        self.api_key = os.getenv("RUNPOD_API_KEY", "")
        self.endpoint_id = os.getenv("RUNPOD_ENDPOINT_ID", "")
        self.base_url = "https://api.runpod.ai/v2"

    def execute(self, task: dict[str, Any]) -> ExecutionResult:
        if not self.is_available():
            # Fallback to local SHA-256
            return self._local_fallback(task)

        start = time.perf_counter()

        try:
            # Submit job to RunPod serverless
            resp = requests.post(
                f"{self.base_url}/{self.endpoint_id}/runsync",
                headers={"Authorization": f"Bearer {self.api_key}"},
                json={"input": task},
                timeout=120,
            )

            if resp.status_code != 200:
                raise RuntimeError(f"RunPod returned {resp.status_code}: {resp.text[:200]}")

            data = resp.json()
            output_data = data.get("output", {})
            output = str(output_data.get("result", ""))
            method = f"runpod:{self.endpoint_id}"

        except Exception as exc:
            output = f"RunPod error: {exc}"
            method = "runpod_error"

        duration_ms = int((time.perf_counter() - start) * 1000)

        return ExecutionResult(
            output=output,
            result_hash=self.hash_output(output),
            method=method,
            duration_ms=duration_ms,
        )

    def is_available(self) -> bool:
        return bool(self.api_key) and bool(self.endpoint_id)

    def capabilities(self) -> dict[str, Any]:
        return {
            "adapter": self.name,
            "configured": self.is_available(),
            "endpoint_id": self.endpoint_id,
            "pricing": "$0.0002/s serverless GPU",
            "supported_tasks": [
                "sha256_compute", "inference", "gpu_inference",
                "gpu_matmul", "training", "python_exec",
            ],
            "note": "Requires RUNPOD_API_KEY and RUNPOD_ENDPOINT_ID env vars",
        }

    def _local_fallback(self, task: dict[str, Any]) -> ExecutionResult:
        payload = str(task.get("payload", ""))
        tokens = int(task.get("tokens", 0))
        start = time.perf_counter()
        result = payload
        for _ in range(min(tokens, 1000)):
            result = hashlib.sha256(result.encode()).hexdigest()
        duration_ms = int((time.perf_counter() - start) * 1000)
        return ExecutionResult(
            output=result,
            result_hash=self.hash_output(result),
            method="runpod_fallback_cpu",
            duration_ms=duration_ms,
        )
