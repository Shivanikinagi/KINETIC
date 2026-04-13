from __future__ import annotations

import os
import time
from datetime import UTC, datetime

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from api.heartbeat import get_last_heartbeat, get_telemetry, start_heartbeat
from api.job_runner import run_job
from api.x402_middleware import X402Middleware


load_dotenv()
app = FastAPI(title="P2P Compute Provider API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(X402Middleware)

start_heartbeat(app)


@app.middleware("http")
async def request_logger(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    elapsed_ms = int((time.perf_counter() - start) * 1000)
    print(
        f"[{datetime.now(UTC).isoformat()}] {request.method} {request.url.path} "
        f"{response.status_code} {elapsed_ms}ms"
    )
    return response


@app.get("/health")
async def health() -> dict:
    return {
        "status": "ok",
        "provider": os.getenv("PROVIDER_WALLET", ""),
        "last_heartbeat": get_last_heartbeat(),
        "version": "1.0.0",
    }


@app.get("/telemetry")
async def telemetry() -> dict:
    return get_telemetry()


@app.get("/providers")
async def list_providers() -> list[dict]:
    """List all available compute providers"""
    # Mock data for now - in production this would query the registry contract
    return [
        {
            "id": "provider_001",
            "name": "ARES CLUSTER-04",
            "gpu_model": "RTX 4090",
            "gpu_count": 8,
            "vram_gb": 192,
            "price_per_hour": 1.42,
            "uptime": 99.98,
            "status": "active",
            "region": "US-East (Virginia)",
        },
        {
            "id": "provider_002",
            "name": "NEBULA-X CORE",
            "gpu_model": "H100 NVLINK",
            "gpu_count": 1,
            "vram_gb": 80,
            "price_per_hour": 4.85,
            "uptime": 100.00,
            "status": "active",
            "region": "EU-West (Frankfurt)",
        },
        {
            "id": "provider_003",
            "name": "QUANTUM STORAGE",
            "gpu_model": "RTX 3090",
            "gpu_count": 4,
            "vram_gb": 96,
            "price_per_hour": 0.65,
            "uptime": 99.95,
            "status": "active",
            "region": "Asia-East (Tokyo)",
        },
        {
            "id": "provider_004",
            "name": "Quantum-Node-08",
            "gpu_model": "RTX 4090",
            "gpu_count": 2,
            "vram_gb": 48,
            "price_per_hour": 0.85,
            "uptime": 99.98,
            "status": "active",
            "region": "US-East (Virginia)",
        },
        {
            "id": "provider_005",
            "name": "Hyper-Grid-Cluster",
            "gpu_model": "H100 PCIe",
            "gpu_count": 1,
            "vram_gb": 80,
            "price_per_hour": 3.10,
            "uptime": 100.00,
            "status": "active",
            "region": "EU-West (Frankfurt)",
        },
        {
            "id": "provider_006",
            "name": "Shadow-Vault-TX",
            "gpu_model": "RTX 3090 Ti",
            "gpu_count": 1,
            "vram_gb": 24,
            "price_per_hour": 0.35,
            "uptime": 98.4,
            "status": "reserved",
            "region": "Asia-East (Tokyo)",
        },
        {
            "id": "provider_007",
            "name": "Fast-Track-L40",
            "gpu_model": "L40S Ada",
            "gpu_count": 1,
            "vram_gb": 48,
            "price_per_hour": 0.92,
            "uptime": 99.1,
            "status": "active",
            "region": "US-West (Oregon)",
        },
    ]


@app.get("/providers/me")
async def provider_info() -> dict:
    return {
        "vram_gb": int(os.getenv("PROVIDER_VRAM_GB", "8")),
        "gpu_model": os.getenv("PROVIDER_GPU_MODEL", "RTX3090"),
        "price_per_hour": int(os.getenv("JOB_PRICE_PER_TOKEN_MICROALGO", "100")),
        "endpoint": os.getenv("PROVIDER_ENDPOINT", ""),
        "uptime_score": 100,
    }


@app.post("/job")
async def submit_job(task: dict, request: Request) -> dict:
    task["job_id"] = task.get("job_id") or getattr(request.state, "job_id", "")
    return await run_job(task)
