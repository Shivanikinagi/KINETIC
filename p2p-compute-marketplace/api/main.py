from __future__ import annotations

import os
import time
import uuid
from datetime import UTC, datetime
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware

from api.db import db_ping, get_database_url
from api.auth import router as auth_router
from api.heartbeat import get_last_heartbeat, get_telemetry, start_heartbeat
from api.hub import router as hub_router
from api.job_runner import run_job
from api.observability import configure_structlog, install_exception_handlers, request_context_middleware
from api.orgs import get_marketplace_org_providers, router as orgs_router
from api.rate_limit import ApiKeyRateLimitMiddleware
from api.roadmap_store import RoadmapValidationError, get_roadmap, update_roadmap
from api.wallet_utils import resolve_provider_wallet
from api.x402_middleware import X402Middleware
from api.job_history import get_analytics, get_job, get_recent_jobs, mark_stale_pending_jobs
from fastapi.responses import FileResponse

try:
    from api.realtime import router as realtime_router
except Exception:  # pragma: no cover
    realtime_router = None


load_dotenv()
configure_structlog()
app = FastAPI(title="P2P Compute Provider API", version="1.0.0")
install_exception_handlers(app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(X402Middleware)
app.add_middleware(ApiKeyRateLimitMiddleware)

app.middleware("http")(request_context_middleware())

app.include_router(orgs_router, prefix="/orgs", tags=["organisations"])
app.include_router(hub_router, prefix="/hub", tags=["hub"])
app.include_router(auth_router)
if realtime_router is not None:
    app.include_router(realtime_router, tags=["realtime"])

start_heartbeat(app)


# ── Scheduler Startup ────────────────────────────────────────────────────────

import asyncio
from api.scheduler import scheduler


@app.on_event("startup")
async def startup_scheduler():
    """Start scheduler background tasks on application startup."""
    asyncio.create_task(scheduler.health_check_loop())

    # If the server previously crashed mid-request, jobs can remain stuck in 'pending'.
    # Mark older pending jobs as failed so the Activity feed stays sane.
    try:
        mark_stale_pending_jobs(max_age_seconds=int(os.getenv("JOB_PENDING_STALE_SECONDS", "600")))
    except Exception:
        pass


@app.get("/health")
async def health() -> dict:
    provider_wallet = resolve_provider_wallet()
    database_url = get_database_url()
    db_ok = await db_ping() if database_url else False
    return {
        "status": "ok",
        "provider": provider_wallet,
        "provider_wallet": provider_wallet,
        "wallet_configured": bool(provider_wallet),
        "db_configured": bool(database_url),
        "db_ok": bool(db_ok),
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
    """List all available compute providers from on-chain registry"""
    import base64
    from algosdk.v2client.indexer import IndexerClient
    from algosdk.abi.method import Method
    from algosdk.encoding import encode_address
    
    provider_wallet = resolve_provider_wallet()
    providers = []
    
    # Get registry app ID from environment
    registry_app_id = int(os.getenv("REGISTRY_APP_ID", "0") or "0")
    
    if registry_app_id > 0:
        try:
            # Connect to Algorand Indexer
            indexer_url = os.getenv("INDEXER_URL", "https://testnet-idx.algonode.cloud")
            indexer_client = IndexerClient(indexer_token="", indexer_address=indexer_url)
            
            # Get all boxes from registry contract
            boxes_response = indexer_client.application_boxes(registry_app_id)
            boxes = boxes_response.get("boxes", [])
            
            # Decode each provider
            for box in boxes:
                try:
                    box_name_b64 = box.get("name", "")
                    raw_name = base64.b64decode(box_name_b64)
                    
                    # Check if this is a provider box (starts with "provider" prefix)
                    prefix = b"provider"
                    if not raw_name.startswith(prefix):
                        continue
                    
                    # Extract provider address from box name
                    key = raw_name[len(prefix):]
                    if len(key) != 32:
                        continue
                    
                    provider_address = encode_address(key)
                    
                    # Get box value
                    box_response = indexer_client.application_box_by_name(
                        registry_app_id,
                        base64.b64decode(box_name_b64)
                    )
                    box_value_b64 = box_response.get("value", "")
                    box_value = base64.b64decode(box_value_b64)
                    
                    # Decode provider info using ABI
                    method = Method.from_signature(
                        "get_provider(address)(uint64,byte[],uint64,byte[],uint64,uint64,uint64,byte[],byte[])"
                    )
                    decoded = method.returns.type.decode(box_value)
                    
                    # Extract fields
                    vram_gb = int(decoded[0])
                    gpu_model = bytes(decoded[1]).decode("utf-8", errors="ignore").rstrip("\x00")
                    price_per_hour = int(decoded[2]) / 1_000_000  # Convert microALGO to ALGO
                    endpoint = bytes(decoded[3]).decode("utf-8", errors="ignore").rstrip("\x00")
                    uptime_score = int(decoded[4])
                    active = int(decoded[5])
                    badge_app_id = int(decoded[6])
                    org_name = bytes(decoded[7]).decode("utf-8", errors="ignore").rstrip("\x00") if len(decoded) > 7 else ""
                    logo_url = bytes(decoded[8]).decode("utf-8", errors="ignore").rstrip("\x00") if len(decoded) > 8 else ""
                    
                    # Skip inactive providers
                    if active != 1:
                        continue
                    
                    # Build provider object
                    provider = {
                        "id": provider_address[:16],  # Use first 16 chars of address as ID
                        "name": org_name or f"Provider-{provider_address[:8]}",
                        "gpu_model": gpu_model or "Unknown",
                        "gpu_count": 1,  # Default to 1, can be enhanced later
                        "vram_gb": vram_gb,
                        "price_per_hour": price_per_hour,
                        "uptime": uptime_score,
                        "status": "active",
                        "region": "Global",  # Can be enhanced with geo-location
                        "payment_address": provider_address,
                        "verified_member": badge_app_id > 0,
                        "campus_badge": "ARC3_SBT" if badge_app_id > 0 else "NONE",
                        "endpoint": endpoint or os.getenv("PROVIDER_ENDPOINT", "http://localhost:8000"),
                        "payment_mode": "x402_m2m",
                        "dispatch_mode": "agent_to_agent",
                    }
                    
                    if org_name:
                        provider["org_name"] = org_name
                    if logo_url:
                        provider["logo_url"] = logo_url
                    
                    providers.append(provider)
                    
                except Exception as e:
                    continue
                    
        except Exception:
            # On-chain query failed; do not fall back to mock data.
            pass
    
    # Add org providers if available
    providers.extend(get_marketplace_org_providers())

    # Add locally registered providers
    try:
        _ensure_local_provider_db()
        conn = sqlite3.connect(LOCAL_PROVIDER_DB)
        conn.row_factory = sqlite3.Row
        rows = conn.execute("SELECT * FROM local_providers WHERE status='active' ORDER BY created_at DESC").fetchall()
        for row in rows:
            providers.append({
                "id": row["id"],
                "name": row["org_name"] or f"Provider-{row['id'][-8:]}",
                "gpu_model": row["gpu_model"],
                "gpu_count": int(row["gpu_count"] or 1),
                "vram_gb": int(row["vram_gb"]),
                "price_per_hour": float(row["price_per_hour"]),
                "uptime": 99.9,
                "status": "active",
                "region": "Global",
                "payment_address": row["provider_address"] or row["id"],
                "verified_member": True,
                "endpoint": row["endpoint"] or os.getenv("PROVIDER_ENDPOINT", "http://localhost:8000"),
                "payment_mode": "x402_m2m",
                "dispatch_mode": "agent_to_agent",
                "org_name": row["org_name"] or "",
                "logo_url": row["logo_url"] or "",
            })
        conn.close()
    except Exception:
        pass

    # Sort by verification status and uptime
    providers.sort(
        key=lambda p: (
            0 if p.get("org_verified") or p.get("verified_member") else 1,
            -float(p.get("uptime", 0.0)),
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


@app.get("/provider/dashboard")
async def provider_dashboard():
    """Serve the provider dashboard HTML"""
    import pathlib
    dashboard_path = pathlib.Path(__file__).parent.parent / "web" / "provider-dashboard.html"
    if not dashboard_path.exists():
        raise HTTPException(status_code=404, detail="Dashboard not found")
    return FileResponse(dashboard_path)


import sqlite3
from pathlib import Path

LOCAL_PROVIDER_DB = Path(__file__).resolve().parents[1] / "data" / "local_providers.db"

def _ensure_local_provider_db():
    LOCAL_PROVIDER_DB.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(LOCAL_PROVIDER_DB)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS local_providers (
            id TEXT PRIMARY KEY,
            gpu_model TEXT NOT NULL,
            vram_gb INTEGER NOT NULL,
            gpu_count INTEGER NOT NULL DEFAULT 1,
            price_per_hour REAL NOT NULL,
            endpoint TEXT NOT NULL,
            org_name TEXT NOT NULL DEFAULT '',
            logo_url TEXT NOT NULL DEFAULT '',
            provider_address TEXT NOT NULL DEFAULT '',
            status TEXT NOT NULL DEFAULT 'active',
            created_at TEXT NOT NULL
        )
    """)
    conn.commit()
    conn.close()

@app.post("/provider/register")
async def register_provider(payload: dict) -> dict:
    """
    Register a new provider. Attempts on-chain first, falls back to local registry.
    """
    from algosdk.v2client.algod import AlgodClient
    from algosdk.mnemonic import to_private_key
    from algosdk.account import address_from_private_key

    required = ["gpu_model", "vram_gb", "price_per_hour", "endpoint"]
    for field in required:
        if field not in payload or payload[field] in (None, ""):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Missing required field: {field}")

    vram_gb = int(payload["vram_gb"])
    gpu_model = str(payload["gpu_model"])
    price_per_hour_algo = float(payload["price_per_hour"])
    endpoint = str(payload["endpoint"])
    org_name = str(payload.get("org_name", ""))
    logo_url = str(payload.get("logo_url", ""))
    gpu_count = int(payload.get("gpu_count", 1))
    provider_address = ""

    # Attempt on-chain registration if configured
    registry_app_id = int(os.getenv("REGISTRY_APP_ID", "0") or "0")
    mnemonic_provided = bool(payload.get("provider_mnemonic", "").strip())

    tx_id = None
    explorer_url = None
    on_chain_status = "local_only"
    on_chain_error: str | None = None

    if registry_app_id > 0 and mnemonic_provided:
        # Validate mnemonic word count
        mnemonic_words = str(payload.get("provider_mnemonic", "")).strip().split()
        if len(mnemonic_words) != 25:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Mnemonic must be exactly 25 words. You provided {len(mnemonic_words)}. Generate a valid mnemonic from Pera Wallet or algosdk.account.generate_account()."
            )
        try:
            algod_url = os.getenv("ALGOD_URL", "https://testnet-api.algonode.cloud")
            algod_token = os.getenv("ALGOD_TOKEN", "")
            algod_client = AlgodClient(algod_token=algod_token, algod_address=algod_url)
            provider_private_key = to_private_key(payload["provider_mnemonic"])
            provider_address = address_from_private_key(provider_private_key)

            from algosdk.abi.method import Method
            from algosdk.atomic_transaction_composer import AtomicTransactionComposer, AccountTransactionSigner, TransactionWithSigner
            from algosdk.transaction import PaymentTxn
            from algosdk.logic import get_application_address
            from algosdk.encoding import decode_address

            signer = AccountTransactionSigner(provider_private_key)
            composer = AtomicTransactionComposer()
            sp = algod_client.suggested_params()
            app_address = get_application_address(registry_app_id)
            box_mbr = 2500 + 400 * 240

            pay_txn = PaymentTxn(sender=provider_address, sp=sp, receiver=app_address, amt=box_mbr)
            composer.add_transaction(TransactionWithSigner(pay_txn, signer))

            method = Method.from_signature("register_provider(uint64,byte[],uint64,byte[],byte[],byte[])void")
            provider_key = decode_address(provider_address)
            box_key = b"provider" + provider_key
            price_per_hour_microalgo = int(price_per_hour_algo * 1_000_000)

            composer.add_method_call(
                app_id=registry_app_id,
                method=method,
                sender=provider_address,
                sp=algod_client.suggested_params(),
                signer=signer,
                method_args=[vram_gb, gpu_model.encode("utf-8"), price_per_hour_microalgo, endpoint.encode("utf-8"), org_name.encode("utf-8"), logo_url.encode("utf-8")],
                boxes=[(0, box_key)],
            )
            result = composer.execute(algod_client, 4)
            tx_id = result.tx_ids[-1]
            explorer_url = f"https://testnet.algoexplorer.io/tx/{tx_id}"
            on_chain_status = "success"
        except Exception as exc:
            # Keep local registration but report the on-chain failure.
            on_chain_status = "failed"
            on_chain_error = str(exc)

    # Always store locally so the provider appears in listings immediately
    _ensure_local_provider_db()
    conn = sqlite3.connect(LOCAL_PROVIDER_DB)
    provider_id = f"local_{uuid.uuid4().hex[:12]}"
    now = datetime.now(UTC).isoformat()
    conn.execute(
        "INSERT INTO local_providers (id, gpu_model, vram_gb, gpu_count, price_per_hour, endpoint, org_name, logo_url, provider_address, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (provider_id, gpu_model, vram_gb, gpu_count, price_per_hour_algo, endpoint, org_name, logo_url, provider_address or "", "active", now)
    )
    conn.commit()
    conn.close()

    return {
        "status": "success",
        "message": "Provider registered",
        "provider_id": provider_id,
        "provider_address": provider_address or None,
        "on_chain_status": on_chain_status,
        "on_chain_error": on_chain_error,
        "tx_id": tx_id,
        "explorer_url": explorer_url,
        "details": {
            "gpu_model": gpu_model,
            "vram_gb": vram_gb,
            "gpu_count": gpu_count,
            "price_per_hour": price_per_hour_algo,
            "endpoint": endpoint,
            "org_name": org_name,
        }
    }


@app.post("/job")
async def submit_job(task: dict, request: Request) -> dict:
    task["job_id"] = task.get("job_id") or getattr(request.state, "job_id", "")
    result = await run_job(task)
    if result.get("status") == "failed":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=result.get("error", "Job execution failed"),
        )
    return result


# ── Provider Node Management ────────────────────────────────────────────────

from api.scheduler import scheduler


@app.post("/providers/heartbeat")
async def provider_heartbeat(payload: dict) -> dict:
    """
    Accept a heartbeat from a remote provider node.
    Provider nodes should POST here every 30s to remain discoverable.
    """
    endpoint = str(payload.get("endpoint", "")).strip().rstrip("/")
    if not endpoint:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing 'endpoint' field",
        )

    scheduler.register_provider(endpoint, {
        "vram_gb": int(payload.get("vram_gb", 0)),
        "gpu_model": str(payload.get("gpu_model", "unknown")),
        "gpu_available": bool(payload.get("gpu_available", False)),
        "node_id": str(payload.get("node_id", "")),
    })

    return {"status": "ok", "registered": endpoint}


@app.get("/providers/nodes")
async def list_provider_nodes() -> dict:
    """List all registered provider nodes with their health status."""
    return {
        "providers": scheduler.get_provider_states(),
        "stats": scheduler.get_stats(),
    }


@app.get("/scheduler/stats")
async def scheduler_stats() -> dict:
    """Get scheduler queue and provider statistics."""
    return scheduler.get_stats()


@app.get("/analytics")
async def analytics() -> dict:
    """Return real marketplace analytics from job history database."""
    return get_analytics()


@app.get("/jobs")
async def list_jobs(limit: int = 20) -> list[dict]:
    """Return real job history from database."""
    return get_recent_jobs(limit=limit)


@app.get("/jobs/{job_id}")
async def get_job_detail(job_id: str) -> dict:
    """Return a single job by ID."""
    job = get_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@app.get("/activity")
async def activity(limit: int = 20) -> dict:
    """Return recent job events formatted for the activity feed."""
    jobs = get_recent_jobs(limit=limit)
    events = []
    for job in jobs:
        ts_raw = job.get("completed_at") or job.get("created_at")
        ts = datetime.fromtimestamp(ts_raw, UTC).isoformat() if ts_raw else None
        tx_url = job.get("explorer_url") or ""
        if not tx_url and job.get("tx_id"):
            tx_url = f"https://testnet.algoexplorer.io/tx/{job['tx_id']}"
        events.append({
            "job_id": job.get("job_id"),
            "task_type": job.get("task_type"),
            "status": job.get("status"),
            "timestamp": ts,
            "result_hash": job.get("result_hash"),
            "tx_url": tx_url,
        })
    return {"events": events}


@app.get("/network/stats")
async def network_stats() -> dict:
    """Return aggregate network statistics from providers."""
    providers = await list_providers()
    total_gpus = sum(p.get("gpu_count", 1) for p in providers)
    total_vram = sum(p.get("vram_gb", 0) for p in providers)
    avg_uptime = (
        sum(p.get("uptime", 0) for p in providers) / len(providers)
        if providers else 0
    )
    return {
        "total_providers": len(providers),
        "total_gpus": total_gpus,
        "total_vram_gb": total_vram,
        "network_uptime": round(avg_uptime, 2),
    }

