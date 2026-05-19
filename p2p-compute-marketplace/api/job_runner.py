from __future__ import annotations

import asyncio
import hashlib
import logging
import os
import subprocess
import sys
import time

import httpx

from api.heartbeat import update_telemetry
from api.job_history import complete_job, record_job

try:
    import psutil
except Exception:  # pragma: no cover
    psutil = None

logger = logging.getLogger(__name__)


def _compute_hash(payload: str, tokens: int) -> str:
    return hashlib.sha256(f"{payload}{tokens}".encode("utf-8")).hexdigest()


async def get_expected_hash(task: dict) -> str:
    payload = str(task.get("payload", ""))
    tokens = int(task.get("tokens", 0))
    return _compute_hash(payload, tokens)


async def _run_docker_compute(payload: str, tokens: int) -> tuple[str, str]:
    """Run real compute in Docker container"""
    try:
        # Create Python script that does real work
        script = f"""
import hashlib
import time

# Real CPU workload: compute SHA-256 hashes
payload = {repr(payload)}
tokens = {tokens}

result = payload
for i in range(min(tokens, 1000)):
    result = hashlib.sha256(result.encode()).hexdigest()

print(result)
"""
        
        # Run in Docker with Python alpine image
        proc = await asyncio.create_subprocess_exec(
            "docker", "run", "--rm", "-i", "python:3.11-alpine",
            "python", "-c", script,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=30)
        
        if proc.returncode != 0:
            raise RuntimeError(f"Docker execution failed: {stderr.decode()}")
        
        output = stdout.decode().strip()
        return output, "docker"
        
    except (FileNotFoundError, asyncio.TimeoutError, RuntimeError):
        # Docker not available or too slow, fall back to subprocess
        return await _run_subprocess_compute(payload, tokens)


async def _run_subprocess_compute(payload: str, tokens: int) -> tuple[str, str]:
    """Run real CPU workload in subprocess (fallback if Docker unavailable)"""
    script = f"""
import hashlib

payload = {repr(payload)}
tokens = {tokens}

# Real CPU workload: iterative SHA-256 hashing
result = payload
for i in range(min(tokens, 1000)):
    result = hashlib.sha256(result.encode()).hexdigest()

print(result)
"""

    # Use sys.executable so this works on Windows, macOS, Linux
    python_exe = sys.executable or "python"
    proc = await asyncio.create_subprocess_exec(
        python_exe, "-c", script,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )

    stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=30)

    if proc.returncode != 0:
        raise RuntimeError(f"Subprocess execution failed: {stderr.decode()}")

    output = stdout.decode().strip()
    return output, "subprocess"


async def _run_remote_compute(provider_endpoint: str, task: dict) -> tuple[str, str]:
    """
    Dispatch a job to a remote provider node.
    Returns (compute_output, execution_method).
    """
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            f"{provider_endpoint.rstrip('/')}/job",
            json=task,
        )
        if resp.status_code != 200:
            raise RuntimeError(
                f"Remote provider {provider_endpoint} returned {resp.status_code}: {resp.text[:200]}"
            )
        data = resp.json()
        output = data.get("compute_output", data.get("output", ""))
        node_id = data.get("node_id", "unknown")
        method = data.get("execution_method", "remote")
        return output, f"remote:{node_id}:{method}"


async def run_job(task: dict) -> dict:
    start = time.perf_counter()

    job_id = str(task.get("job_id", "") or task.get("type", "job") + "_" + str(int(time.time())))
    tokens = int(task.get("tokens", 0))
    payload = str(task.get("payload", ""))
    provider_endpoint = str(task.get("provider_endpoint", "")).strip()
    task_type = str(task.get("type", "compute"))

    # Record job in DB before execution
    record_job(
        job_id=job_id,
        consumer=task.get("consumer", ""),
        provider=provider_endpoint or "local",
        task_type=task_type,
        tokens=tokens,
        status="pending",
    )

    try:
        if provider_endpoint:
            # Remote execution: dispatch to a provider node
            logger.info(f"Dispatching job to remote provider: {provider_endpoint}")
            compute_output, exec_method = await _run_remote_compute(provider_endpoint, task)
        else:
            # Local real compute execution (Docker/subprocess)
            compute_output, exec_method = await _run_docker_compute(payload, tokens)

        # Hash the actual compute output for verification
        result_hash = hashlib.sha256(compute_output.encode()).hexdigest()
        duration_ms = int((time.perf_counter() - start) * 1000)

        cpu = float(psutil.cpu_percent(interval=None)) if psutil else 0.0
        memory = float(psutil.virtual_memory().percent) if psutil else 0.0
        update_telemetry(cpu=cpu, memory=memory, success=True)

        # Mark job as completed in DB
        complete_job(job_id, result_hash=result_hash, duration_ms=duration_ms, status="completed")

        return {
            "job_id": job_id,
            "result_hash": result_hash,
            "output": compute_output[:200],
            "tokens_processed": tokens,
            "duration_ms": duration_ms,
            "execution_method": exec_method,
            "compute_output": compute_output,
        }
    except Exception as exc:
        cpu = float(psutil.cpu_percent(interval=None)) if psutil else 0.0
        memory = float(psutil.virtual_memory().percent) if psutil else 0.0
        update_telemetry(cpu=cpu, memory=memory, success=False)

        # Mark job as failed in DB
        duration_ms = int((time.perf_counter() - start) * 1000)
        complete_job(job_id, result_hash="", duration_ms=duration_ms, status="failed")

        # Re-raise with a cleaner message
        raise RuntimeError(f"Job execution failed: {exc}") from exc
