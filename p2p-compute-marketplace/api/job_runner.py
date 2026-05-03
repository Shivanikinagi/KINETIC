from __future__ import annotations

import asyncio
import hashlib
import time

from api.heartbeat import update_telemetry

try:
    import psutil
except Exception:  # pragma: no cover
    psutil = None


def _compute_hash(payload: str, tokens: int) -> str:
    return hashlib.sha256(f"{payload}{tokens}".encode("utf-8")).hexdigest()


async def get_expected_hash(task: dict) -> str:
    payload = str(task.get("payload", ""))
    tokens = int(task.get("tokens", 0))
    return _compute_hash(payload, tokens)


async def run_job(task: dict) -> dict:
    start = time.perf_counter()

    tokens = int(task.get("tokens", 0))
    payload = str(task.get("payload", ""))
    task_type = str(task.get("type", "inference"))

    try:
        await asyncio.sleep(max(0.5, tokens / 2000))

        result_hash = _compute_hash(payload, tokens)
        duration_ms = int((time.perf_counter() - start) * 1000)

        cpu = float(psutil.cpu_percent(interval=None)) if psutil else 0.0
        memory = float(psutil.virtual_memory().percent) if psutil else 0.0
        update_telemetry(cpu=cpu, memory=memory, success=True)

        return {
            "job_id": str(task.get("job_id", "")),
            "result_hash": result_hash,
            "output": f"Simulated compute result for {task_type}",
            "tokens_processed": tokens,
            "duration_ms": duration_ms,
        }
    except Exception:
        cpu = float(psutil.cpu_percent(interval=None)) if psutil else 0.0
        memory = float(psutil.virtual_memory().percent) if psutil else 0.0
        update_telemetry(cpu=cpu, memory=memory, success=False)
        raise
