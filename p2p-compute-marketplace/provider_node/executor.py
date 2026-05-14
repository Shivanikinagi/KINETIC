"""
Workload Execution Engine for KINETIC Provider Nodes.

Handles the actual computation:
  - SHA-256 deterministic hash chains (verifiable by any node)
  - Python script execution (subprocess sandbox)
  - GPU workloads (PyTorch CUDA when available)

All execution methods return a standard result dict:
  { "output": str, "result_hash": str, "method": str }
"""

from __future__ import annotations

import hashlib
import os
import subprocess
import time
from typing import Any


def execute_workload(task: dict[str, Any]) -> dict[str, Any]:
    """
    Route a task to the appropriate execution backend.

    Supported task types:
      - sha256_compute : deterministic hash chain (default, always verifiable)
      - python_exec    : run an arbitrary Python script in subprocess
      - gpu_matmul     : GPU matrix multiplication (requires CUDA)
      - inference       : GPU tensor computation or SHA-256 fallback

    Returns:
      { "output", "result_hash", "method", "duration_ms" }
    """
    task_type = str(task.get("type", "inference"))
    payload = str(task.get("payload", ""))
    tokens = int(task.get("tokens", 0))

    start = time.perf_counter()

    if task_type == "python_exec":
        result = _python_exec(task.get("script", "print('hello')"))
    elif task_type == "gpu_matmul":
        result = _gpu_matmul(tokens)
    elif task_type in ("inference", "gpu_inference"):
        result = _gpu_inference(payload, tokens)
    else:
        # Default to SHA-256 chain — always verifiable
        result = _sha256_chain(payload, tokens)

    duration_ms = int((time.perf_counter() - start) * 1000)
    result["duration_ms"] = duration_ms
    return result


# ── Deterministic SHA-256 chain ──────────────────────────────────────────────

def _sha256_chain(payload: str, tokens: int) -> dict[str, Any]:
    """
    Compute an iterative SHA-256 chain.  This is the canonical verifiable
    workload: any node can recompute the same chain from (payload, tokens)
    and compare the result_hash.
    """
    result = payload
    for _ in range(min(tokens, 1000)):
        result = hashlib.sha256(result.encode()).hexdigest()
    result_hash = hashlib.sha256(result.encode()).hexdigest()
    return {"output": result, "result_hash": result_hash, "method": "cpu_sha256"}


# ── Python subprocess execution ──────────────────────────────────────────────

def _python_exec(script: str) -> dict[str, Any]:
    """Run a Python script in a subprocess with a 30-second timeout."""
    try:
        proc = subprocess.run(
            ["python", "-c", script],
            capture_output=True,
            text=True,
            timeout=30,
        )
        output = proc.stdout.strip()
        if proc.returncode != 0:
            output = f"ERROR: {proc.stderr.strip()}"
        result_hash = hashlib.sha256(output.encode()).hexdigest()
        return {"output": output, "result_hash": result_hash, "method": "subprocess"}
    except subprocess.TimeoutExpired:
        return {"output": "TIMEOUT", "result_hash": "", "method": "subprocess_timeout"}
    except Exception as exc:
        return {"output": str(exc), "result_hash": "", "method": "subprocess_error"}


# ── GPU workloads (CUDA) ─────────────────────────────────────────────────────

def _check_gpu() -> bool:
    """Check if CUDA GPU is available."""
    try:
        import torch
        return torch.cuda.is_available()
    except ImportError:
        return False


def _gpu_matmul(size: int) -> dict[str, Any]:
    """Run a GPU matrix multiplication benchmark."""
    if not _check_gpu():
        return _sha256_chain("gpu_matmul_fallback", max(size, 100))

    import torch

    size = max(64, min(size, 4096))  # Clamp to reasonable range
    a = torch.randn(size, size, device="cuda")
    b = torch.randn(size, size, device="cuda")
    torch.cuda.synchronize()

    c = torch.matmul(a, b)
    torch.cuda.synchronize()

    checksum = float(c.sum().item())
    output = f"matmul_{size}x{size}_sum={checksum:.6f}"
    result_hash = hashlib.sha256(output.encode()).hexdigest()
    return {"output": output, "result_hash": result_hash, "method": "gpu_cuda"}


def _gpu_inference(payload: str, tokens: int) -> dict[str, Any]:
    """
    Simulate a transformer-style forward pass on GPU.
    Falls back to SHA-256 chain if no GPU is available.
    """
    if not _check_gpu():
        return _sha256_chain(payload, tokens)

    import torch

    try:
        seq_len = max(1, min(tokens, 2048))
        hidden = 768
        x = torch.randn(1, seq_len, hidden, device="cuda")
        w = torch.randn(hidden, hidden, device="cuda")
        torch.cuda.synchronize()

        out = torch.matmul(x, w)
        result_val = float(out.mean().item())
        torch.cuda.synchronize()

        output = f"inference_result={result_val:.8f}_tokens={seq_len}"
        result_hash = hashlib.sha256(output.encode()).hexdigest()
        return {"output": output, "result_hash": result_hash, "method": "gpu_inference"}
    except Exception:
        return _sha256_chain(payload, tokens)


# ── GPU info utility ─────────────────────────────────────────────────────────

def get_gpu_info() -> dict[str, Any]:
    """Return GPU hardware info if available."""
    info: dict[str, Any] = {"gpu_available": False}
    try:
        import torch

        if torch.cuda.is_available():
            props = torch.cuda.get_device_properties(0)
            info.update({
                "gpu_available": True,
                "gpu_name": torch.cuda.get_device_name(0),
                "gpu_count": torch.cuda.device_count(),
                "vram_bytes": props.total_mem,
                "vram_gb": round(props.total_mem / (1024 ** 3), 1),
                "cuda_version": torch.version.cuda or "unknown",
                "compute_capability": f"{props.major}.{props.minor}",
            })
    except ImportError:
        pass
    return info
