"""
Docker-based sandboxed execution for KINETIC provider nodes.

Runs untrusted workloads in isolated Docker containers with:
  - No network access (--network none)
  - Read-only filesystem (--read-only)
  - Memory and CPU limits
  - Execution timeout
  - Optional GPU passthrough (--gpus all)
"""

from __future__ import annotations

import asyncio
import hashlib
import os
import tempfile
from typing import Any


class DockerWorker:
    """Execute workloads inside isolated Docker containers."""

    CPU_IMAGE = "python:3.11-alpine"
    GPU_IMAGE = "nvidia/cuda:12.2.0-runtime-ubuntu22.04"
    TIMEOUT = 60
    MEM_LIMIT = "512m"
    CPU_LIMIT = "1.0"

    @classmethod
    async def execute(
        cls,
        script: str,
        *,
        gpu: bool = False,
        timeout: int | None = None,
        mem_limit: str | None = None,
    ) -> dict[str, Any]:
        """
        Run a Python script inside a Docker container.

        Args:
            script:    Python source code to execute
            gpu:       Whether to attach GPU (--gpus all)
            timeout:   Override default timeout in seconds
            mem_limit: Override default memory limit (e.g. "1g")

        Returns:
            { "output", "result_hash", "method", "exit_code" }
        """
        timeout = timeout or cls.TIMEOUT
        mem_limit = mem_limit or cls.MEM_LIMIT
        image = cls.GPU_IMAGE if gpu else cls.CPU_IMAGE

        # Write script to a temp file that gets mounted into the container
        tmp_dir = os.path.join(os.path.dirname(__file__), ".tmp")
        os.makedirs(tmp_dir, exist_ok=True)
        script_path = os.path.join(tmp_dir, f"task_{os.getpid()}.py")

        try:
            with open(script_path, "w", encoding="utf-8") as f:
                f.write(script)

            cmd = [
                "docker", "run", "--rm",
                "--memory", mem_limit,
                "--cpus", cls.CPU_LIMIT,
                "--network", "none",        # No network access
                "--read-only",              # Read-only root filesystem
                "--tmpfs", "/tmp:size=64m", # Small writable /tmp
                "-v", f"{os.path.abspath(script_path)}:/task.py:ro",
            ]

            if gpu:
                cmd.extend(["--gpus", "all"])

            cmd.extend([image, "python", "/task.py"])

            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )

            try:
                stdout, stderr = await asyncio.wait_for(
                    proc.communicate(), timeout=timeout
                )
            except asyncio.TimeoutError:
                proc.kill()
                await proc.wait()
                return {
                    "output": "TIMEOUT",
                    "result_hash": "",
                    "method": "docker_timeout",
                    "exit_code": -1,
                }

            output = stdout.decode("utf-8", errors="replace").strip()
            result_hash = hashlib.sha256(output.encode()).hexdigest()

            return {
                "output": output,
                "result_hash": result_hash,
                "method": "docker_gpu" if gpu else "docker_cpu",
                "exit_code": proc.returncode or 0,
                "stderr": stderr.decode("utf-8", errors="replace").strip()[:500],
            }

        except FileNotFoundError:
            return {
                "output": "Docker not available",
                "result_hash": "",
                "method": "docker_unavailable",
                "exit_code": -1,
            }
        finally:
            # Clean up temp script
            if os.path.exists(script_path):
                os.unlink(script_path)

    @classmethod
    async def is_available(cls) -> bool:
        """Check whether Docker is installed and the daemon is running."""
        try:
            proc = await asyncio.create_subprocess_exec(
                "docker", "info",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            await asyncio.wait_for(proc.communicate(), timeout=5)
            return proc.returncode == 0
        except (FileNotFoundError, asyncio.TimeoutError):
            return False

    @classmethod
    async def gpu_available(cls) -> bool:
        """Check whether nvidia-docker / GPU runtime is available."""
        try:
            proc = await asyncio.create_subprocess_exec(
                "docker", "run", "--rm", "--gpus", "all",
                "nvidia/cuda:12.2.0-base-ubuntu22.04",
                "nvidia-smi", "--query-gpu=name", "--format=csv,noheader",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=30)
            return proc.returncode == 0 and len(stdout.strip()) > 0
        except (FileNotFoundError, asyncio.TimeoutError):
            return False
