"""
GPU execution adapter (PyTorch CUDA).

Runs workloads on local GPU using PyTorch:
  - Matrix multiplication benchmarks
  - Transformer-style inference simulation
  - Falls back to CPU SHA-256 if no GPU available
"""

from __future__ import annotations

import hashlib
import time
from typing import Any

from provider_node.adapters.base import BaseAdapter, ExecutionResult


class GPUAdapter(BaseAdapter):
    """Execute workloads on local GPU via PyTorch CUDA."""

    name = "gpu_cuda"

    def execute(self, task: dict[str, Any]) -> ExecutionResult:
        task_type = str(task.get("type", "inference"))
        payload = str(task.get("payload", ""))
        tokens = int(task.get("tokens", 0))

        start = time.perf_counter()

        if task_type == "gpu_matmul":
            output, method = self._gpu_matmul(tokens)
        elif task_type in ("inference", "gpu_inference"):
            output, method = self._gpu_inference(payload, tokens)
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
        try:
            import torch
            return torch.cuda.is_available()
        except ImportError:
            return False

    def capabilities(self) -> dict[str, Any]:
        info: dict[str, Any] = {
            "adapter": self.name,
            "gpu_available": False,
        }
        try:
            import torch
            if torch.cuda.is_available():
                props = torch.cuda.get_device_properties(0)
                info.update({
                    "gpu_available": True,
                    "gpu_name": torch.cuda.get_device_name(0),
                    "gpu_count": torch.cuda.device_count(),
                    "vram_gb": round(props.total_mem / (1024 ** 3), 1),
                    "cuda_version": torch.version.cuda or "unknown",
                    "compute_capability": f"{props.major}.{props.minor}",
                    "supported_tasks": [
                        "sha256_compute", "inference", "gpu_inference",
                        "gpu_matmul", "python_exec",
                    ],
                })
        except ImportError:
            pass
        return info

    @staticmethod
    def _sha256_chain(payload: str, tokens: int) -> tuple[str, str]:
        result = payload
        for _ in range(min(tokens, 1000)):
            result = hashlib.sha256(result.encode()).hexdigest()
        return result, "cpu_sha256"

    @staticmethod
    def _gpu_matmul(size: int) -> tuple[str, str]:
        import torch
        size = max(64, min(size, 4096))
        a = torch.randn(size, size, device="cuda")
        b = torch.randn(size, size, device="cuda")
        torch.cuda.synchronize()
        c = torch.matmul(a, b)
        torch.cuda.synchronize()
        checksum = float(c.sum().item())
        return f"matmul_{size}x{size}_sum={checksum:.6f}", "gpu_cuda"

    @staticmethod
    def _gpu_inference(payload: str, tokens: int) -> tuple[str, str]:
        try:
            import torch
            seq_len = max(1, min(tokens, 2048))
            hidden = 768
            x = torch.randn(1, seq_len, hidden, device="cuda")
            w = torch.randn(hidden, hidden, device="cuda")
            torch.cuda.synchronize()
            out = torch.matmul(x, w)
            result_val = float(out.mean().item())
            torch.cuda.synchronize()
            return f"inference_result={result_val:.8f}_tokens={seq_len}", "gpu_inference"
        except Exception:
            result = payload
            for _ in range(min(tokens, 1000)):
                result = hashlib.sha256(result.encode()).hexdigest()
            return result, "cpu_sha256_fallback"
