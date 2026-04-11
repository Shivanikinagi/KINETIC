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
