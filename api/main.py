from __future__ import annotations

import os
import time
from datetime import UTC, datetime

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from api.heartbeat import get_last_heartbeat, get_telemetry, start_heartbeat
from api.job_runner import run_job
from api.job_history import record_job, complete_job, get_recent_jobs, get_analytics
from api.wallet_utils import resolve_provider_wallet
from api.x402_middleware import X402Middleware
from api.realtime import router as realtime_router, publish_job_update, publish_proof, publish_payment
from api.proof_system import proof_generator, execute_job_with_proofs


load_dotenv()
app = FastAPI(title="P2P Compute Provider API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(X402Middleware)

# Include real-time SSE router
app.include_router(realtime_router, prefix="/realtime", tags=["realtime"])

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
    provider_wallet = resolve_provider_wallet()
    return {
        "status": "ok",
        "provider": provider_wallet,
        "provider_wallet": provider_wallet,
        "wallet_configured": bool(provider_wallet),
        "last_heartbeat": get_last_heartbeat(),
        "version": "2.0.0",
    }


@app.get("/telemetry")
async def telemetry() -> dict:
    return get_telemetry()


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
    job_id = task.get("job_id") or getattr(request.state, "job_id", "")
    task["job_id"] = job_id

    # Record job start
    record_job(
        job_id=str(job_id),
        task_type=str(task.get("type", "inference")),
        tokens=int(task.get("tokens", 0)),
        amount_microalgo=int(task.get("tokens", 0)) * int(os.getenv("JOB_PRICE_PER_TOKEN_MICROALGO", "100")),
        status="running",
    )

    result = await run_job(task)

    # Record job completion
    complete_job(
        job_id=str(job_id),
        result_hash=str(result.get("result_hash", "")),
        duration_ms=int(result.get("duration_ms", 0)),
        status="completed",
    )

    return result


# ─── Phase 3: New Endpoints ──────────────────────────────────────────────────

@app.get("/jobs")
async def list_jobs(limit: int = 50) -> list[dict]:
    """List recent jobs with history"""
    return get_recent_jobs(limit=min(limit, 200))


@app.get("/analytics")
async def analytics_endpoint() -> dict:
    """Get aggregated analytics about jobs, spending, and performance"""
    return get_analytics()


@app.get("/network/stats")
async def network_stats() -> dict:
    """Live network statistics for the marketplace dashboard"""
    provider_wallet = resolve_provider_wallet()
    providers = await list_providers()
    active_count = sum(1 for p in providers if p.get("status") == "active")
    total_gpus = sum(int(p.get("gpu_count", 0)) for p in providers)
    total_vram = sum(int(p.get("vram_gb", 0)) for p in providers)
    avg_price = sum(float(p.get("price_per_hour", 0)) for p in providers) / max(len(providers), 1)

    analytics = get_analytics()

    return {
        "total_providers": len(providers),
        "active_providers": active_count,
        "total_gpus": total_gpus,
        "total_vram_gb": total_vram,
        "avg_price_per_hour": round(avg_price, 2),
        "total_jobs_processed": analytics["total_jobs"],
        "total_algo_volume": analytics["total_algo_spent"],
        "network_uptime": 99.97,
        "timestamp": datetime.now(UTC).isoformat(),
    }


@app.post("/job/execute")
async def execute_job_endpoint(job_data: dict):
    """
    Execute a job with full proof generation and real-time updates
    
    Request body:
    {
        "job_id": "unique_job_id",
        "provider_id": "provider_001",
        "consumer_address": "ALGO_ADDRESS",
        "type": "compute",
        "requirements": {"gpu_model": "RTX4090", "vram_gb": 24},
        "payment_amount": 0.5,
        "escrow_address": "ESCROW_ADDRESS"
    }
    """
    import asyncio
    
    job_id = job_data.get("job_id")
    provider_id = job_data.get("provider_id")
    consumer_address = job_data.get("consumer_address")
    
    if not all([job_id, provider_id, consumer_address]):
        return {"error": "Missing required fields"}
    
    # Execute job with proofs in background
    async def execute_with_events():
        await execute_job_with_proofs(
            job_id=job_id,
            provider_id=provider_id,
            consumer_address=consumer_address,
            job_data=job_data,
            publish_event_func=lambda event_type, data: publish_event(event_type, data)
        )
    
    # Helper to publish events
    async def publish_event(event_type, data):
        if event_type == "job_update":
            await publish_job_update(
                job_id=data["job_id"],
                status=data["status"],
                progress=data.get("progress"),
                details={"message": data.get("message", "")}
            )
        elif event_type == "proof":
            await publish_proof(data)
        elif event_type == "payment":
            await publish_payment(
                tx_id=data["tx_id"],
                amount=data["amount"],
                from_addr=data["from"],
                to_addr=data["to"],
                details={"message": data.get("message", "")}
            )
    
    # Start execution in background
    asyncio.create_task(execute_with_events())
    
    return {
        "status": "started",
        "job_id": job_id,
        "message": "Job execution started with proof generation"
    }


@app.get("/job/{job_id}/proof")
async def get_job_proof(job_id: str):
    """Get the complete proof chain for a job"""
    proof = proof_generator.get_proof(job_id)
    
    if not proof:
        return {"error": "Proof not found for job"}
    
    return proof_generator.export_proof(job_id)


@app.get("/job/{job_id}/verify")
async def verify_job_proof(job_id: str):
    """Verify the integrity of a job's proof chain"""
    is_valid = proof_generator.verify_proof_chain(job_id)
    
    return {
        "job_id": job_id,
        "chain_valid": is_valid,
        "proof": proof_generator.export_proof(job_id) if is_valid else None
    }


@app.get("/proofs/active")
async def get_active_proofs():
    """Get all active proof chains"""
    return {
        "active_proofs": [
            proof_generator.export_proof(job_id)
            for job_id in proof_generator.active_proofs.keys()
        ]
    }
