from __future__ import annotations

import asyncio
import time
from datetime import UTC, datetime

import psutil
from fastapi import FastAPI


_last_heartbeat: float = 0.0
node_telemetry: dict[str, float | int] = {
    "cpu_percent": 0.0,
    "memory_percent": 0.0,
    "jobs_completed": 0,
    "jobs_failed": 0,
}


def get_last_heartbeat() -> float:
    return _last_heartbeat


def get_telemetry() -> dict[str, float | int]:
    return dict(node_telemetry)


def update_telemetry(cpu: float, memory: float, success: bool) -> None:
    node_telemetry["cpu_percent"] = cpu
    node_telemetry["memory_percent"] = memory
    if success:
        node_telemetry["jobs_completed"] = int(node_telemetry["jobs_completed"]) + 1
    else:
        node_telemetry["jobs_failed"] = int(node_telemetry["jobs_failed"]) + 1


async def _heartbeat_loop() -> None:
    global _last_heartbeat
    while True:
        _last_heartbeat = time.time()
        cpu = psutil.cpu_percent(interval=None)
        memory = psutil.virtual_memory().percent
        node_telemetry["cpu_percent"] = cpu
        node_telemetry["memory_percent"] = memory
        print(f"PROVIDER ALIVE {datetime.now(UTC).isoformat()}")
        await asyncio.sleep(30)


def start_heartbeat(app: FastAPI) -> None:
    @app.on_event("startup")
    async def _startup() -> None:
        asyncio.create_task(_heartbeat_loop())
