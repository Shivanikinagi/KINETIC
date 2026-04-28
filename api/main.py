from __future__ import annotations

import os
import time
import uuid
from datetime import UTC, datetime
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware

from api.heartbeat import get_last_heartbeat, get_telemetry, start_heartbeat
from api.hub import router as hub_router
from api.job_runner import run_job
from api.orgs import get_marketplace_org_providers, router as orgs_router
from api.roadmap_store import RoadmapValidationError, get_roadmap, update_roadmap
from api.wallet_utils import resolve_provider_wallet
from api.x402_middleware import X402Middleware

try:
    from api.realtime import router as realtime_router
except Exception:  # pragma: no cover
    realtime_router = None


load_dotenv()
app = FastAPI(title="P2P Compute Provider API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(X402Middleware)

app.include_router(orgs_router, prefix="/orgs", tags=["organisations"])
app.include_router(hub_router, prefix="/hub", tags=["hub"])
if realtime_router is not None:
    app.include_router(realtime_router, tags=["realtime"])

start_heartbeat(app)


@app.middleware("http")
async def request_logger(request: Request, call_next):
    request_id = request.headers.get("x-request-id") or str(uuid.uuid4())
    request.state.request_id = request_id
    start = time.perf_counter()
    response = await call_next(request)
    elapsed_ms = int((time.perf_counter() - start) * 1000)
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    print(
        f"[{datetime.now(UTC).isoformat()}] req={request_id} "
        f"{request.method} {request.url.path} {response.status_code} {elapsed_ms}ms"
    )
    return response


@app.get("/health")
async def health() -> dict:
    provider_wallet = resolve_provider_wallet()
    return {
        "status": "ok",
        "provider": provider_wallet,
        "provider_wallet": provider_wallet,
        "wallet_configured": bool(provider_wallet),
        "last_heartbeat": get_last_heartbeat(),
        "version": "1.0.0",
    }


@app.get("/telemetry")
async def telemetry() -> dict:
    return get_telemetry()


@app.get("/roadmap")
async def roadmap() -> dict:
    return get_roadmap()


def _check_roadmap_admin_key(authorization: str | None, x_admin_key: str | None) -> None:
    configured_key = os.getenv("ROADMAP_ADMIN_KEY", "").strip()
    if not configured_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Roadmap admin key is not configured.",
        )

    bearer_token = ""
    if authorization:
        parts = authorization.split(" ", 1)
        if len(parts) == 2 and parts[0].lower() == "bearer":
            bearer_token = parts[1].strip()

    provided = (x_admin_key or "").strip() or bearer_token
    if provided != configured_key:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")


@app.put("/roadmap")
async def set_roadmap(
    payload: dict[str, Any],
    response: Response,
    authorization: str | None = Header(default=None),
    x_admin_key: str | None = Header(default=None),
) -> dict:
    _check_roadmap_admin_key(authorization, x_admin_key)

    try:
        updated = update_roadmap(payload)
    except RoadmapValidationError as error:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(error))

    response.status_code = status.HTTP_200_OK
    return updated


@app.get("/providers")
async def list_providers() -> list[dict]:
    """List all available compute providers"""
    provider_wallet = resolve_provider_wallet()
    # Mock data for now - in production this would query the registry contract
    providers = [
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
            "payment_address": provider_wallet,
            "verified_member": True,
            "campus_badge": "ARC3_SBT",
            "org_name": "Ares Compute Ltd",
            "logo_url": "https://upload.wikimedia.org/wikipedia/commons/e/e8/Tesla_logo.png",
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
            "payment_address": provider_wallet,
            "verified_member": True,
            "campus_badge": "ARC3_SBT",
            "org_name": "Nebula AI Labs",
            "logo_url": "https://upload.wikimedia.org/wikipedia/commons/a/a7/React-icon.svg",
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
            "payment_address": provider_wallet,
            "verified_member": True,
            "campus_badge": "ARC3_SBT",
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
            "payment_address": provider_wallet,
            "verified_member": True,
            "campus_badge": "ARC3_SBT",
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
            "payment_address": provider_wallet,
            "verified_member": True,
            "campus_badge": "ARC3_SBT",
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
            "payment_address": provider_wallet,
            "verified_member": False,
            "campus_badge": "NONE",
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
            "payment_address": provider_wallet,
            "verified_member": True,
            "campus_badge": "ARC3_SBT",
        },
    ]

    default_endpoint = os.getenv("PROVIDER_ENDPOINT", "http://localhost:8000")
    for provider in providers:
        provider.setdefault("endpoint", default_endpoint)
        provider.setdefault("payment_mode", "x402_m2m")
        provider.setdefault("dispatch_mode", "agent_to_agent")

    providers.extend(get_marketplace_org_providers())
    providers.sort(
        key=lambda provider: (
            0 if provider.get("org_verified") else 1,
            -float(provider.get("uptime", 0.0)),
        )
    )

    return providers


@app.get("/providers/me")
async def provider_info() -> dict:
    provider_wallet = resolve_provider_wallet()
    return {
        "vram_gb": int(os.getenv("PROVIDER_VRAM_GB", "8")),
        "gpu_model": os.getenv("PROVIDER_GPU_MODEL", "RTX3090"),
        "price_per_hour": int(os.getenv("JOB_PRICE_PER_TOKEN_MICROALGO", "100")),
        "endpoint": os.getenv("PROVIDER_ENDPOINT", ""),
        "uptime_score": 100,
        "payment_address": provider_wallet,
        "wallet": provider_wallet,
        "verified_member": True,
        "campus_badge": "ARC3_SBT",
    }


@app.post("/job")
async def submit_job(task: dict, request: Request) -> dict:
    task["job_id"] = task.get("job_id") or getattr(request.state, "job_id", "")
    return await run_job(task)
