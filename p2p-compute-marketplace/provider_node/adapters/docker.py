"""
Docker container execution adapter.

Runs workloads in isolated Docker containers with security hardening:
  - No network access (--network none)
  - Read-only filesystem (--read-only)
  - Memory and CPU limits
  - Optional GPU passthrough (--gpus all)
"""

from __future__ import annotations

import asyncio
import hashlib
import os
import subprocess
import tempfile
import time
from typing import Any

from provider_node.adapters.base import BaseAdapter, ExecutionResult


class DockerAdapter(BaseAdapter):
    """Execute workloads in sandboxed Docker containers."""

    name = "docker"

    CPU_IMAGE = "python:3.11-alpine"
    GPU_IMAGE = "nvidia/cuda:12.2.0-runtime-ubuntu22.04"
    TIMEOUT = 60
    MEM_LIMIT = "512m"
    CPU_LIMIT = "1.0"

    def __init__(self, gpu: bool = False):
        self.gpu = gpu

    def execute(self, task: dict[str, Any]) -> ExecutionResult:
        payload = str(task.get("payload", ""))
        tokens = int(task.get("tokens", 0))
        task_type = str(task.get("type", "inference"))

        # Build the script to run inside the container
        if task_type == "python_exec":
            script = task.get("script", "print('hello')")
        else:
            script = self._build_sha256_script(payload, tokens)

        start = time.perf_counter()
        output, exit_code = self._run_container(script)
        duration_ms = int((time.perf_counter() - start) * 1000)

        method = "docker_gpu" if self.gpu else "docker_cpu"
        if exit_code != 0:
            method = f"{method}_error"

        return ExecutionResult(
            output=output,
            result_hash=self.hash_output(output),
            method=method,
            duration_ms=duration_ms,
            metadata={"exit_code": exit_code},
        )

    def is_available(self) -> bool:
        try:
            result = subprocess.run(
                ["docker", "info"],
                capture_output=True, timeout=5,
            )
            return result.returncode == 0
        except (FileNotFoundError, subprocess.TimeoutExpired):
            return False

    def capabilities(self) -> dict[str, Any]:
        gpu_available = False
        if self.gpu:
            try:
                result = subprocess.run(
                    ["docker", "run", "--rm", "--gpus", "all",
                     "nvidia/cuda:12.2.0-base-ubuntu22.04",
                     "nvidia-smi", "--query-gpu=name", "--format=csv,noheader"],
                    capture_output=True, text=True, timeout=30,
                )
                gpu_available = result.returncode == 0 and len(result.stdout.strip()) > 0
            except (FileNotFoundError, subprocess.TimeoutExpired):
                pass

        return {
            "adapter": self.name,
            "docker_available": self.is_available(),
            "gpu_available": gpu_available,
            "image": self.GPU_IMAGE if self.gpu else self.CPU_IMAGE,
            "sandbox": {
                "network": "none",
                "filesystem": "read-only",
                "memory_limit": self.MEM_LIMIT,
                "cpu_limit": self.CPU_LIMIT,
            },
            "supported_tasks": ["sha256_compute", "inference", "python_exec"],
        }

    def _run_container(self, script: str) -> tuple[str, int]:
        """Run a Python script inside a Docker container."""
        tmp_dir = os.path.join(os.path.dirname(__file__), "..", ".tmp")
        os.makedirs(tmp_dir, exist_ok=True)
        script_path = os.path.join(tmp_dir, f"task_{os.getpid()}.py")

        try:
            with open(script_path, "w", encoding="utf-8") as f:
                f.write(script)

            image = self.GPU_IMAGE if self.gpu else self.CPU_IMAGE
            cmd = [
                "docker", "run", "--rm",
                "--memory", self.MEM_LIMIT,
                "--cpus", self.CPU_LIMIT,
                "--network", "none",
                "--read-only",
                "--tmpfs", "/tmp:size=64m",
                "-v", f"{os.path.abspath(script_path)}:/task.py:ro",
            ]
            if self.gpu:
                cmd.extend(["--gpus", "all"])
            cmd.extend([image, "python", "/task.py"])

            result = subprocess.run(
                cmd, capture_output=True, text=True, timeout=self.TIMEOUT,
            )
            output = result.stdout.strip()
            return output, result.returncode or 0

        except subprocess.TimeoutExpired:
            return "TIMEOUT", -1
        except FileNotFoundError:
            return "Docker not available", -1
        finally:
            if os.path.exists(script_path):
                os.unlink(script_path)

    @staticmethod
    def _build_sha256_script(payload: str, tokens: int) -> str:
        return f"""
import hashlib
payload = {repr(payload)}
tokens = {tokens}
result = payload
for _ in range(min(tokens, 1000)):
    result = hashlib.sha256(result.encode()).hexdigest()
print(result)
"""
