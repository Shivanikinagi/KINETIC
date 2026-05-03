from __future__ import annotations

import json
import os
import sqlite3
import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from algosdk import account, mnemonic
from algosdk.abi.method import Method
from algosdk.atomic_transaction_composer import AccountTransactionSigner, AtomicTransactionComposer
from algosdk.encoding import is_valid_address
from algosdk.v2client.algod import AlgodClient
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from agent.job_matcher import score_providers
from api.job_history import complete_job, record_job
from api.job_runner import run_job
from api.wallet_utils import resolve_provider_wallet

try:
    from api.realtime import publish_job_update, publish_provider_update
except Exception:  # pragma: no cover

    async def publish_job_update(*args, **kwargs):
        return None

    async def publish_provider_update(*args, **kwargs):
        return None


router = APIRouter()

DB_PATH = Path(__file__).resolve().parents[1] / "data" / "orgs.db"
VERIFICATION_THRESHOLD = 50


class Resource(BaseModel):
    res_id: str
    org_id: str
    name: str
    gpu_model: str
    gpu_count: int
    vram_gb: int
    price_per_hour: float
    uptime: float
    status: str
    jobs_running: int
    earnings: float
    region: str
    endpoint: str
    created_at: datetime


class Organisation(BaseModel):
    org_id: str
    org_name: str
    description: str
    logo_url: str
    owner_wallet: str
    verified: bool
    jobs_completed: int
    total_earned: float
    total_spent: float
    created_at: datetime
    resources: list[Resource]


class OrganisationRegisterRequest(BaseModel):
    org_name: str = Field(min_length=2, max_length=80)
    description: str = Field(default="", max_length=600)
    logo_url: str = Field(default="", max_length=500)
    owner_wallet: str = Field(min_length=58, max_length=58)


class OrganisationUpdateRequest(BaseModel):
    org_name: str | None = Field(default=None, min_length=2, max_length=80)
    description: str | None = Field(default=None, max_length=600)
    logo_url: str | None = Field(default=None, max_length=500)


class ResourceCreateRequest(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    gpu_model: str = Field(min_length=2, max_length=80)
    gpu_count: int = Field(default=1, ge=1, le=512)
    vram_gb: int = Field(default=24, ge=1, le=4096)
    price_per_hour: float = Field(default=0.5, gt=0)
    uptime: float = Field(default=99.0, ge=0, le=100)
    status: str = Field(default="active", max_length=20)
    region: str = Field(default="Global", max_length=80)
    endpoint: str = Field(default="", max_length=200)


class RentRequest(BaseModel):
    task_type: str = Field(default="inference", max_length=64)
    tokens: int = Field(default=100, ge=1, le=250_000)
    payload: str = Field(default="org-job")
    required_vram: int = Field(default=8, ge=1, le=4096)
    provider_id: str | None = Field(default=None)


class OrganisationJob(BaseModel):
    job_id: str
    org_id: str
    role: str
    resource_id: str | None
    task_type: str
    tokens: int
    cost_algo: float
    status: str
    counterparty: str | None
    created_at: datetime
    completed_at: datetime | None
    details: dict[str, Any] = Field(default_factory=dict)


def _utc_now() -> datetime:
    return datetime.now(UTC)


def _as_datetime(value: str | None) -> datetime:
    if not value:
        return _utc_now()
    return datetime.fromisoformat(value)


def _ensure_db() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS organisations (
            org_id TEXT PRIMARY KEY,
            org_name TEXT NOT NULL,
            description TEXT NOT NULL DEFAULT '',
            logo_url TEXT NOT NULL DEFAULT '',
            owner_wallet TEXT NOT NULL,
            verified INTEGER NOT NULL DEFAULT 0,
            jobs_completed INTEGER NOT NULL DEFAULT 0,
            total_earned REAL NOT NULL DEFAULT 0,
            total_spent REAL NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS resources (
            res_id TEXT PRIMARY KEY,
            org_id TEXT NOT NULL,
            name TEXT NOT NULL,
            gpu_model TEXT NOT NULL,
            gpu_count INTEGER NOT NULL,
            vram_gb INTEGER NOT NULL,
            price_per_hour REAL NOT NULL,
            uptime REAL NOT NULL,
            status TEXT NOT NULL,
            jobs_running INTEGER NOT NULL DEFAULT 0,
            earnings REAL NOT NULL DEFAULT 0,
            region TEXT NOT NULL DEFAULT 'Global',
            endpoint TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL,
            FOREIGN KEY(org_id) REFERENCES organisations(org_id) ON DELETE CASCADE
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS org_jobs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            job_id TEXT NOT NULL,
            org_id TEXT NOT NULL,
            role TEXT NOT NULL,
            resource_id TEXT,
            task_type TEXT NOT NULL,
            tokens INTEGER NOT NULL,
            cost_algo REAL NOT NULL,
            status TEXT NOT NULL,
            counterparty TEXT,
            created_at TEXT NOT NULL,
            completed_at TEXT,
            details_json TEXT NOT NULL DEFAULT '{}',
            FOREIGN KEY(org_id) REFERENCES organisations(org_id) ON DELETE CASCADE
        )
        """
    )
    conn.execute("CREATE INDEX IF NOT EXISTS idx_org_jobs_org_id ON org_jobs(org_id)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_resources_org_id ON resources(org_id)")
    conn.commit()
    conn.close()


def _connect() -> sqlite3.Connection:
    _ensure_db()
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _algod_client() -> AlgodClient:
    return AlgodClient(
        algod_token=os.getenv("ALGOD_TOKEN", ""),
        algod_address=os.getenv("ALGOD_URL", "https://testnet-api.algonode.cloud"),
    )


def _admin_signing_account() -> tuple[str, str] | None:
    phrase = os.getenv("ADMIN_MNEMONIC", "").strip()
    if not phrase:
        return None
    try:
        private_key = mnemonic.to_private_key(phrase)
        address = account.address_from_private_key(private_key)
        return private_key, address
    except Exception:
        return None


def _call_org_registry_method(
    method_signature: str,
    method_args: list[Any],
    org_id: str | None = None,
) -> str | None:
    app_id = int(os.getenv("ORG_REGISTRY_APP_ID", "0") or "0")
    signer_account = _admin_signing_account()
    if app_id <= 0 or signer_account is None:
        return None

    private_key, sender = signer_account

    try:
        algod = _algod_client()
        signer = AccountTransactionSigner(private_key)
        atc = AtomicTransactionComposer()

        call_kwargs: dict[str, Any] = {
            "app_id": app_id,
            "method": Method.from_signature(method_signature),
            "sender": sender,
            "sp": algod.suggested_params(),
            "signer": signer,
            "method_args": method_args,
        }
        if org_id:
            call_kwargs["boxes"] = [(0, b"org" + org_id.encode("utf-8"))]

        atc.add_method_call(**call_kwargs)
        result = atc.execute(algod, 4)
        return result.tx_ids[0] if result.tx_ids else None
    except Exception:
        return None


def _row_to_resource(row: sqlite3.Row) -> Resource:
    return Resource(
        res_id=row["res_id"],
        org_id=row["org_id"],
        name=row["name"],
        gpu_model=row["gpu_model"],
        gpu_count=int(row["gpu_count"]),
        vram_gb=int(row["vram_gb"]),
        price_per_hour=float(row["price_per_hour"]),
        uptime=float(row["uptime"]),
        status=row["status"],
        jobs_running=int(row["jobs_running"]),
        earnings=float(row["earnings"]),
        region=row["region"],
        endpoint=row["endpoint"],
        created_at=_as_datetime(row["created_at"]),
    )


def _resources_for_org(conn: sqlite3.Connection, org_id: str) -> list[Resource]:
    rows = conn.execute(
        "SELECT * FROM resources WHERE org_id=? ORDER BY created_at DESC",
        (org_id,),
    ).fetchall()
    return [_row_to_resource(row) for row in rows]


def _row_to_org(conn: sqlite3.Connection, row: sqlite3.Row) -> Organisation:
    return Organisation(
        org_id=row["org_id"],
        org_name=row["org_name"],
        description=row["description"],
        logo_url=row["logo_url"],
        owner_wallet=row["owner_wallet"],
        verified=bool(row["verified"]),
        jobs_completed=int(row["jobs_completed"]),
        total_earned=float(row["total_earned"]),
        total_spent=float(row["total_spent"]),
        created_at=_as_datetime(row["created_at"]),
        resources=_resources_for_org(conn, row["org_id"]),
    )


def _get_org_or_404(conn: sqlite3.Connection, org_id: str) -> sqlite3.Row:
    row = conn.execute("SELECT * FROM organisations WHERE org_id=?", (org_id,)).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Organisation not found")
    return row


def _estimate_cost_algo(tokens: int, provider: dict[str, Any]) -> float:
    price_per_hour = float(provider.get("price_per_hour", 0.5))
    minimum_billable_hours = 1.0 / 60.0
    billable_hours = max(tokens / 3600.0, minimum_billable_hours)
    return round(price_per_hour * billable_hours, 6)


def _insert_org_job(
    conn: sqlite3.Connection,
    *,
    job_id: str,
    org_id: str,
    role: str,
    resource_id: str | None,
    task_type: str,
    tokens: int,
    cost_algo: float,
    status: str,
    counterparty: str | None,
    details: dict[str, Any],
) -> None:
    conn.execute(
        """
        INSERT INTO org_jobs
            (job_id, org_id, role, resource_id, task_type, tokens, cost_algo, status, counterparty, created_at, details_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            job_id,
            org_id,
            role,
            resource_id,
            task_type,
            tokens,
            cost_algo,
            status,
            counterparty,
            _utc_now().isoformat(),
            json.dumps(details),
        ),
    )


def _mark_org_job_complete(conn: sqlite3.Connection, org_id: str, job_id: str, status: str = "completed") -> None:
    conn.execute(
        """
        UPDATE org_jobs
        SET status=?, completed_at=?
        WHERE org_id=? AND job_id=?
        """,
        (status, _utc_now().isoformat(), org_id, job_id),
    )


def _update_org_totals(
    conn: sqlite3.Connection,
    org_id: str,
    *,
    earned_delta: float = 0.0,
    spent_delta: float = 0.0,
    jobs_delta: int = 0,
) -> None:
    conn.execute(
        """
        UPDATE organisations
        SET total_earned=total_earned+?,
            total_spent=total_spent+?,
            jobs_completed=jobs_completed+?
        WHERE org_id=?
        """,
        (earned_delta, spent_delta, jobs_delta, org_id),
    )


def _auto_verify_org(conn: sqlite3.Connection, org_id: str) -> str | None:
    row = conn.execute(
        "SELECT verified, jobs_completed FROM organisations WHERE org_id=?",
        (org_id,),
    ).fetchone()
    if row is None:
        return None

    is_verified = bool(row["verified"])
    completed_jobs = int(row["jobs_completed"])
    if is_verified or completed_jobs < VERIFICATION_THRESHOLD:
        return None

    conn.execute("UPDATE organisations SET verified=1 WHERE org_id=?", (org_id,))
    return _call_org_registry_method(
        "verify_org(byte[],uint64)void",
        [org_id.encode("utf-8"), completed_jobs],
        org_id=org_id,
    )


def _base_provider_catalog() -> list[dict[str, Any]]:
    provider_wallet = resolve_provider_wallet()
    default_endpoint = os.getenv("PROVIDER_ENDPOINT", "http://localhost:8000")

    providers = [
        {
            "id": "provider_001",
            "name": "ARES CLUSTER-04",
            "gpu_model": "RTX 4090",
            "gpu_count": 8,
            "vram_gb": 192,
            "price_per_hour": 1.42,
            "uptime": 99.98,
            "uptime_score": 99,
            "status": "active",
            "payment_address": provider_wallet,
            "endpoint": default_endpoint,
        },
        {
            "id": "provider_002",
            "name": "NEBULA-X CORE",
            "gpu_model": "H100 NVLINK",
            "gpu_count": 1,
            "vram_gb": 80,
            "price_per_hour": 4.85,
            "uptime": 100.0,
            "uptime_score": 100,
            "status": "active",
            "payment_address": provider_wallet,
            "endpoint": default_endpoint,
        },
        {
            "id": "provider_003",
            "name": "QUANTUM STORAGE",
            "gpu_model": "RTX 3090",
            "gpu_count": 4,
            "vram_gb": 96,
            "price_per_hour": 0.65,
            "uptime": 99.95,
            "uptime_score": 99,
            "status": "active",
            "payment_address": provider_wallet,
            "endpoint": default_endpoint,
        },
    ]

    return providers


def get_marketplace_org_providers() -> list[dict[str, Any]]:
    conn = _connect()
    rows = conn.execute(
        """
        SELECT
            r.res_id,
            r.org_id,
            r.name,
            r.gpu_model,
            r.gpu_count,
            r.vram_gb,
            r.price_per_hour,
            r.uptime,
            r.status,
            r.region,
            r.endpoint,
            o.org_name,
            o.logo_url,
            o.owner_wallet,
            o.verified
        FROM resources r
        JOIN organisations o ON o.org_id = r.org_id
        WHERE r.status != 'removed'
        ORDER BY o.verified DESC, r.uptime DESC
        """
    ).fetchall()
    conn.close()

    providers: list[dict[str, Any]] = []
    for row in rows:
        org_verified = bool(row["verified"])
        providers.append(
            {
                "id": row["res_id"],
                "name": row["name"],
                "gpu_model": row["gpu_model"],
                "gpu_count": int(row["gpu_count"]),
                "vram_gb": int(row["vram_gb"]),
                "price_per_hour": float(row["price_per_hour"]),
                "uptime": float(row["uptime"]),
                "uptime_score": int(float(row["uptime"])),
                "status": row["status"],
                "region": row["region"],
                "payment_address": row["owner_wallet"],
                "endpoint": row["endpoint"] or os.getenv("PROVIDER_ENDPOINT", "http://localhost:8000"),
                "payment_mode": "x402_m2m",
                "dispatch_mode": "agent_to_agent",
                "verified_member": org_verified,
                "campus_badge": "ORG_VERIFIED" if org_verified else "ORG",
                "org_name": row["org_name"],
                "org_verified": org_verified,
                "org_logo_url": row["logo_url"],
                "org_id": row["org_id"],
                "resource_id": row["res_id"],
            }
        )

    return providers


def _marketplace_provider_pool() -> list[dict[str, Any]]:
    return _base_provider_catalog() + get_marketplace_org_providers()


def _org_job_rows_to_models(rows: list[sqlite3.Row]) -> list[OrganisationJob]:
    jobs: list[OrganisationJob] = []
    for row in rows:
        raw_details = row["details_json"] or "{}"
        try:
            details = json.loads(raw_details)
        except json.JSONDecodeError:
            details = {}

        jobs.append(
            OrganisationJob(
                job_id=row["job_id"],
                org_id=row["org_id"],
                role=row["role"],
                resource_id=row["resource_id"],
                task_type=row["task_type"],
                tokens=int(row["tokens"]),
                cost_algo=float(row["cost_algo"]),
                status=row["status"],
                counterparty=row["counterparty"],
                created_at=_as_datetime(row["created_at"]),
                completed_at=_as_datetime(row["completed_at"]) if row["completed_at"] else None,
                details=details,
            )
        )
    return jobs


def _build_dashboard(org_id: str) -> dict[str, Any]:
    conn = _connect()
    org_row = _get_org_or_404(conn, org_id)
    resources = _resources_for_org(conn, org_id)
    jobs_rows = conn.execute(
        "SELECT * FROM org_jobs WHERE org_id=? ORDER BY created_at DESC",
        (org_id,),
    ).fetchall()
    conn.close()

    jobs = _org_job_rows_to_models(jobs_rows)
    consumed = [job for job in jobs if job.role == "consumer"]
    provided = [job for job in jobs if job.role == "provider"]
    avg_uptime = round(sum(resource.uptime for resource in resources) / max(len(resources), 1), 2)
    verification_progress = min(int(org_row["jobs_completed"]), VERIFICATION_THRESHOLD)

    return {
        "org_id": org_id,
        "org_name": org_row["org_name"],
        "verified": bool(org_row["verified"]),
        "verification_threshold": VERIFICATION_THRESHOLD,
        "verification_progress": verification_progress,
        "jobs_completed": int(org_row["jobs_completed"]),
        "total_earned": float(org_row["total_earned"]),
        "total_spent": float(org_row["total_spent"]),
        "net_algo": round(float(org_row["total_earned"]) - float(org_row["total_spent"]), 6),
        "resources_listed": len(resources),
        "resources_active": sum(1 for resource in resources if resource.status == "active"),
        "resource_uptime_avg": avg_uptime,
        "jobs_provided": len(provided),
        "jobs_consumed": len(consumed),
        "recent_jobs": [job.model_dump() for job in jobs[:20]],
    }


@router.post("/register")
async def register_org(payload: OrganisationRegisterRequest) -> dict[str, Any]:
    if not is_valid_address(payload.owner_wallet):
        raise HTTPException(status_code=422, detail="owner_wallet must be a valid Algorand address")

    org_id = str(uuid.uuid4())
    created_at = _utc_now().isoformat()

    conn = _connect()
    conn.execute(
        """
        INSERT INTO organisations
            (org_id, org_name, description, logo_url, owner_wallet, verified, jobs_completed, total_earned, total_spent, created_at)
        VALUES (?, ?, ?, ?, ?, 0, 0, 0, 0, ?)
        """,
        (
            org_id,
            payload.org_name,
            payload.description,
            payload.logo_url,
            payload.owner_wallet,
            created_at,
        ),
    )
    row = _get_org_or_404(conn, org_id)
    organisation = _row_to_org(conn, row)
    conn.commit()
    conn.close()

    on_chain_tx_id = _call_org_registry_method(
        "register_org(byte[],byte[],byte[],byte[],byte[],uint64)void",
        [
            org_id.encode("utf-8"),
            payload.org_name.encode("utf-8"),
            payload.owner_wallet.encode("utf-8"),
            payload.logo_url.encode("utf-8"),
            payload.description.encode("utf-8"),
            int(_utc_now().timestamp()),
        ],
        org_id=org_id,
    )

    return {"organisation": organisation.model_dump(), "on_chain_tx_id": on_chain_tx_id}


@router.get("")
async def list_orgs() -> list[Organisation]:
    conn = _connect()
    rows = conn.execute("SELECT * FROM organisations ORDER BY created_at DESC").fetchall()
    organisations = [_row_to_org(conn, row) for row in rows]
    conn.close()
    return organisations


@router.get("/{org_id}")
async def get_org(org_id: str) -> Organisation:
    conn = _connect()
    row = _get_org_or_404(conn, org_id)
    organisation = _row_to_org(conn, row)
    conn.close()
    return organisation


@router.patch("/{org_id}")
async def update_org(org_id: str, payload: OrganisationUpdateRequest) -> dict[str, Any]:
    updates = payload.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No update fields supplied")

    conn = _connect()
    _get_org_or_404(conn, org_id)

    set_parts = []
    values: list[Any] = []
    for field_name, value in updates.items():
        set_parts.append(f"{field_name}=?")
        values.append(value)

    conn.execute(
        f"UPDATE organisations SET {', '.join(set_parts)} WHERE org_id=?",
        (*values, org_id),
    )
    row = _get_org_or_404(conn, org_id)
    organisation = _row_to_org(conn, row)
    conn.commit()
    conn.close()

    on_chain_tx_id = _call_org_registry_method(
        "update_org(byte[],byte[],byte[],byte[])void",
        [
            org_id.encode("utf-8"),
            organisation.org_name.encode("utf-8"),
            organisation.logo_url.encode("utf-8"),
            organisation.description.encode("utf-8"),
        ],
        org_id=org_id,
    )

    return {"organisation": organisation.model_dump(), "on_chain_tx_id": on_chain_tx_id}


@router.post("/{org_id}/resources")
async def add_resource(org_id: str, payload: ResourceCreateRequest) -> Resource:
    conn = _connect()
    _get_org_or_404(conn, org_id)

    res_id = str(uuid.uuid4())
    conn.execute(
        """
        INSERT INTO resources
            (res_id, org_id, name, gpu_model, gpu_count, vram_gb, price_per_hour, uptime, status, jobs_running, earnings, region, endpoint, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?)
        """,
        (
            res_id,
            org_id,
            payload.name,
            payload.gpu_model,
            payload.gpu_count,
            payload.vram_gb,
            payload.price_per_hour,
            payload.uptime,
            payload.status,
            payload.region,
            payload.endpoint,
            _utc_now().isoformat(),
        ),
    )
    row = conn.execute("SELECT * FROM resources WHERE res_id=?", (res_id,)).fetchone()
    conn.commit()
    conn.close()

    await publish_provider_update(
        provider_id=res_id,
        status="listed",
        details={"org_id": org_id, "resource_name": payload.name},
    )

    if row is None:
        raise HTTPException(status_code=500, detail="Failed to create resource")
    return _row_to_resource(row)


@router.delete("/{org_id}/resources/{res_id}")
async def remove_resource(org_id: str, res_id: str) -> dict[str, Any]:
    conn = _connect()
    _get_org_or_404(conn, org_id)
    result = conn.execute("DELETE FROM resources WHERE org_id=? AND res_id=?", (org_id, res_id))
    conn.commit()
    conn.close()

    if result.rowcount <= 0:
        raise HTTPException(status_code=404, detail="Resource not found")

    await publish_provider_update(
        provider_id=res_id,
        status="removed",
        details={"org_id": org_id},
    )

    return {"deleted": True, "res_id": res_id}


@router.get("/{org_id}/resources")
async def list_org_resources(org_id: str) -> list[Resource]:
    conn = _connect()
    _get_org_or_404(conn, org_id)
    resources = _resources_for_org(conn, org_id)
    conn.close()
    return resources


@router.get("/{org_id}/jobs")
async def list_org_jobs(org_id: str) -> list[OrganisationJob]:
    conn = _connect()
    _get_org_or_404(conn, org_id)
    rows = conn.execute(
        "SELECT * FROM org_jobs WHERE org_id=? ORDER BY created_at DESC",
        (org_id,),
    ).fetchall()
    conn.close()
    return _org_job_rows_to_models(rows)


@router.get("/{org_id}/dashboard")
async def org_dashboard(org_id: str) -> dict[str, Any]:
    return _build_dashboard(org_id)


@router.post("/{org_id}/rent")
async def rent_compute(org_id: str, payload: RentRequest) -> dict[str, Any]:
    conn = _connect()
    consumer_org = _get_org_or_404(conn, org_id)
    conn.close()

    provider_pool = _marketplace_provider_pool()
    if not provider_pool:
        raise HTTPException(status_code=404, detail="No providers available")

    if payload.provider_id:
        provider = next((item for item in provider_pool if item.get("id") == payload.provider_id), None)
        if provider is None:
            raise HTTPException(status_code=404, detail="Requested provider not found")
    else:
        ranked = score_providers(
            {
                "required_vram": payload.required_vram,
                "tokens": payload.tokens,
            },
            provider_pool,
        )
        if not ranked:
            raise HTTPException(status_code=404, detail="No provider can satisfy this request")
        provider = ranked[0]

    job_id = f"org-{org_id[:8]}-{uuid.uuid4().hex[:12]}"
    estimated_cost_algo = _estimate_cost_algo(payload.tokens, provider)
    estimated_cost_microalgo = int(estimated_cost_algo * 1_000_000)

    resource_id = provider.get("resource_id")
    provider_org_id = provider.get("org_id")
    counterparty = provider_org_id or str(provider.get("id", ""))

    conn = _connect()
    if resource_id:
        conn.execute(
            "UPDATE resources SET jobs_running=jobs_running+1 WHERE res_id=?",
            (resource_id,),
        )

    _insert_org_job(
        conn,
        job_id=job_id,
        org_id=org_id,
        role="consumer",
        resource_id=resource_id,
        task_type=payload.task_type,
        tokens=payload.tokens,
        cost_algo=estimated_cost_algo,
        status="pending",
        counterparty=counterparty,
        details={"provider_name": provider.get("name", ""), "provider_id": provider.get("id", "")},
    )

    if provider_org_id:
        _insert_org_job(
            conn,
            job_id=job_id,
            org_id=provider_org_id,
            role="provider",
            resource_id=resource_id,
            task_type=payload.task_type,
            tokens=payload.tokens,
            cost_algo=estimated_cost_algo,
            status="pending",
            counterparty=org_id,
            details={"consumer_org_id": org_id},
        )

    conn.commit()
    conn.close()

    record_job(
        job_id=job_id,
        consumer=consumer_org["owner_wallet"],
        provider=str(provider.get("payment_address", "")),
        task_type=payload.task_type,
        tokens=payload.tokens,
        amount_microalgo=estimated_cost_microalgo,
        status="pending",
    )

    await publish_job_update(job_id=job_id, status="pending", progress=5, details={"org_id": org_id})

    try:
        job_result = await run_job(
            {
                "job_id": job_id,
                "type": payload.task_type,
                "tokens": payload.tokens,
                "payload": payload.payload,
            }
        )
    except Exception as exc:
        conn = _connect()
        _mark_org_job_complete(conn, org_id, job_id, status="failed")
        if provider_org_id:
            _mark_org_job_complete(conn, provider_org_id, job_id, status="failed")
        if resource_id:
            conn.execute(
                "UPDATE resources SET jobs_running=CASE WHEN jobs_running > 0 THEN jobs_running - 1 ELSE 0 END WHERE res_id=?",
                (resource_id,),
            )
        conn.commit()
        conn.close()

        complete_job(job_id, result_hash="", duration_ms=0, status="failed")
        await publish_job_update(job_id=job_id, status="failed", progress=100, details={"error": str(exc)})
        raise HTTPException(status_code=500, detail=f"Job execution failed: {exc}")

    complete_job(
        job_id,
        result_hash=str(job_result.get("result_hash", "")),
        duration_ms=int(job_result.get("duration_ms", 0)),
        status="completed",
    )

    conn = _connect()
    _mark_org_job_complete(conn, org_id, job_id, status="completed")
    _update_org_totals(conn, org_id, spent_delta=estimated_cost_algo, jobs_delta=1)

    verification_txs: dict[str, str | None] = {org_id: _auto_verify_org(conn, org_id)}

    if provider_org_id:
        _mark_org_job_complete(conn, provider_org_id, job_id, status="completed")
        _update_org_totals(conn, provider_org_id, earned_delta=estimated_cost_algo, jobs_delta=1)
        verification_txs[provider_org_id] = _auto_verify_org(conn, provider_org_id)

    if resource_id:
        conn.execute(
            """
            UPDATE resources
            SET jobs_running=CASE WHEN jobs_running > 0 THEN jobs_running - 1 ELSE 0 END,
                earnings=earnings+?
            WHERE res_id=?
            """,
            (estimated_cost_algo, resource_id),
        )

    conn.commit()
    conn.close()

    await publish_job_update(job_id=job_id, status="completed", progress=100, details={"org_id": org_id})

    return {
        "job_id": job_id,
        "provider": {
            "id": provider.get("id"),
            "name": provider.get("name"),
            "org_id": provider_org_id,
        },
        "cost_breakdown": {
            "tokens": payload.tokens,
            "rate_per_hour_algo": float(provider.get("price_per_hour", 0.0)),
            "estimated_cost_algo": estimated_cost_algo,
            "estimated_cost_microalgo": estimated_cost_microalgo,
            "payment_contract": "escrow_existing",
        },
        "result": job_result,
        "verification_txs": verification_txs,
        "dashboard": _build_dashboard(org_id),
    }


_ensure_db()
