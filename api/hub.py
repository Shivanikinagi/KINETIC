from __future__ import annotations

import hashlib
import json
import math
import os
import secrets
import sqlite3
import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import httpx
from fastapi import APIRouter, Header, HTTPException, Query
from pydantic import BaseModel, Field

from api.job_history import complete_job, get_recent_jobs, record_job
from api.job_runner import run_job
from api.orgs import get_marketplace_org_providers


router = APIRouter()

DB_PATH = Path(__file__).resolve().parents[1] / "data" / "hub.db"


class ProviderReviewRequest(BaseModel):
    reviewer_id: str = Field(min_length=2, max_length=120)
    rating: int = Field(ge=1, le=5)
    comment: str = Field(default="", max_length=1000)


class TemplateCreateRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    description: str = Field(default="", max_length=1000)
    use_case: str = Field(default="custom", max_length=64)
    params_schema: dict[str, Any] = Field(default_factory=dict)
    required_vram: int = Field(default=8, ge=1, le=4096)
    base_tokens: int = Field(default=500, ge=1, le=500_000)
    created_by: str = Field(default="community", max_length=120)


class TemplateDeployRequest(BaseModel):
    consumer_id: str = Field(min_length=2, max_length=120)
    params: dict[str, Any] = Field(default_factory=dict)
    provider_id: str | None = Field(default=None)


class WebhookCreateRequest(BaseModel):
    url: str = Field(min_length=8, max_length=500)
    event_types: list[str] = Field(default_factory=lambda: ["job.completed", "job.failed"])


def _utc_now() -> datetime:
    return datetime.now(UTC)


def _connect() -> sqlite3.Connection:
    _ensure_db()
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _ensure_db() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS provider_reviews (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            provider_id TEXT NOT NULL,
            reviewer_id TEXT NOT NULL,
            rating INTEGER NOT NULL,
            comment TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL
        )
        """
    )
    conn.execute("CREATE INDEX IF NOT EXISTS idx_provider_reviews_provider_id ON provider_reviews(provider_id)")

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS provider_metrics (
            provider_id TEXT PRIMARY KEY,
            reputation_score REAL NOT NULL DEFAULT 0,
            jobs_completed INTEGER NOT NULL DEFAULT 0,
            success_rate REAL NOT NULL DEFAULT 0,
            avg_completion_ms REAL NOT NULL DEFAULT 0,
            benchmark_score REAL NOT NULL DEFAULT 0,
            review_avg REAL NOT NULL DEFAULT 0,
            review_count INTEGER NOT NULL DEFAULT 0,
            uptime_30d REAL NOT NULL DEFAULT 0,
            uptime_90d REAL NOT NULL DEFAULT 0,
            last_updated TEXT NOT NULL
        )
        """
    )

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS provider_uptime_samples (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            provider_id TEXT NOT NULL,
            sampled_at TEXT NOT NULL,
            uptime REAL NOT NULL
        )
        """
    )
    conn.execute("CREATE INDEX IF NOT EXISTS idx_uptime_provider_time ON provider_uptime_samples(provider_id, sampled_at)")

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS templates (
            template_id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT NOT NULL,
            use_case TEXT NOT NULL,
            params_json TEXT NOT NULL,
            required_vram INTEGER NOT NULL,
            base_tokens INTEGER NOT NULL,
            created_by TEXT NOT NULL,
            is_builtin INTEGER NOT NULL DEFAULT 0,
            usage_count INTEGER NOT NULL DEFAULT 0,
            rating REAL NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL
        )
        """
    )

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS template_deployments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            deployment_id TEXT NOT NULL,
            template_id TEXT NOT NULL,
            consumer_id TEXT NOT NULL,
            provider_id TEXT NOT NULL,
            params_json TEXT NOT NULL,
            estimated_cost_algo REAL NOT NULL,
            status TEXT NOT NULL,
            result_hash TEXT NOT NULL DEFAULT '',
            duration_ms INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            completed_at TEXT
        )
        """
    )
    conn.execute("CREATE INDEX IF NOT EXISTS idx_deployments_consumer ON template_deployments(consumer_id, created_at)")

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS consumer_saved_providers (
            consumer_id TEXT NOT NULL,
            provider_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            PRIMARY KEY (consumer_id, provider_id)
        )
        """
    )

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS consumer_favorite_templates (
            consumer_id TEXT NOT NULL,
            template_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            PRIMARY KEY (consumer_id, template_id)
        )
        """
    )

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS consumer_api_keys (
            key_id TEXT PRIMARY KEY,
            consumer_id TEXT NOT NULL,
            key_hash TEXT NOT NULL,
            prefix TEXT NOT NULL,
            revoked INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL
        )
        """
    )

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS consumer_webhooks (
            webhook_id TEXT PRIMARY KEY,
            consumer_id TEXT NOT NULL,
            url TEXT NOT NULL,
            event_types TEXT NOT NULL,
            active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL
        )
        """
    )

    conn.commit()
    conn.close()

    _seed_builtin_templates()


def _seed_builtin_templates() -> None:
    conn = sqlite3.connect(DB_PATH)
    count = conn.execute("SELECT COUNT(*) FROM templates").fetchone()[0]
    if int(count) > 0:
        conn.close()
        return

    now = _utc_now().isoformat()
    builtins = [
        {
            "template_id": "tpl_finetune_llm",
            "name": "Fine-tune an LLM",
            "description": "Runs supervised fine-tuning over uploaded dataset shards.",
            "use_case": "llm",
            "params_json": json.dumps({"epochs": 1, "learning_rate": 0.0002, "tokens": 1600}),
            "required_vram": 48,
            "base_tokens": 1600,
            "created_by": "kinetic-core",
        },
        {
            "template_id": "tpl_sd_batch",
            "name": "Run Stable Diffusion Batch",
            "description": "Generates image batches from prompt packs.",
            "use_case": "inference",
            "params_json": json.dumps({"images": 32, "steps": 30, "tokens": 900}),
            "required_vram": 24,
            "base_tokens": 900,
            "created_by": "kinetic-core",
        },
        {
            "template_id": "tpl_img_classifier",
            "name": "Train Image Classifier",
            "description": "Training pipeline for image classification model families.",
            "use_case": "training",
            "params_json": json.dumps({"epochs": 3, "batch_size": 16, "tokens": 1200}),
            "required_vram": 16,
            "base_tokens": 1200,
            "created_by": "kinetic-core",
        },
        {
            "template_id": "tpl_render_3d",
            "name": "Render 3D Scene",
            "description": "Offline frame rendering for animation scenes.",
            "use_case": "rendering",
            "params_json": json.dumps({"frames": 240, "resolution": "1080p", "tokens": 1000}),
            "required_vram": 12,
            "base_tokens": 1000,
            "created_by": "kinetic-core",
        },
        {
            "template_id": "tpl_python_pipeline",
            "name": "Run Python Data Pipeline",
            "description": "Batch ETL or ML preprocessing workflow.",
            "use_case": "data",
            "params_json": json.dumps({"workers": 4, "tokens": 600}),
            "required_vram": 8,
            "base_tokens": 600,
            "created_by": "kinetic-core",
        },
    ]

    for tpl in builtins:
        conn.execute(
            """
            INSERT INTO templates
                (template_id, name, description, use_case, params_json, required_vram, base_tokens, created_by, is_builtin, usage_count, rating, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 0, 0, ?)
            """,
            (
                tpl["template_id"],
                tpl["name"],
                tpl["description"],
                tpl["use_case"],
                tpl["params_json"],
                tpl["required_vram"],
                tpl["base_tokens"],
                tpl["created_by"],
                now,
            ),
        )

    conn.commit()
    conn.close()


def _base_provider_catalog() -> list[dict[str, Any]]:
    provider_wallet = os.getenv("PROVIDER_WALLET", "")
    default_endpoint = os.getenv("PROVIDER_ENDPOINT", "http://localhost:8000")
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
            "payment_address": provider_wallet,
            "verified_member": True,
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
            "status": "active",
            "region": "EU-West (Frankfurt)",
            "payment_address": provider_wallet,
            "verified_member": True,
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
            "status": "active",
            "region": "Asia-East (Tokyo)",
            "payment_address": provider_wallet,
            "verified_member": True,
            "endpoint": default_endpoint,
        },
    ]


def _provider_pool() -> list[dict[str, Any]]:
    providers = _base_provider_catalog() + get_marketplace_org_providers()
    for provider in providers:
        provider.setdefault("verified_member", True)
        provider.setdefault("status", "active")
        provider.setdefault("uptime", 99.0)
        provider.setdefault("gpu_count", 1)
        provider.setdefault("region", "Global")
        provider.setdefault("endpoint", os.getenv("PROVIDER_ENDPOINT", "http://localhost:8000"))
    return providers


def _provider_map() -> dict[str, dict[str, Any]]:
    return {str(provider.get("id")): provider for provider in _provider_pool()}


def _estimate_cost(provider: dict[str, Any], tokens: int) -> float:
    price_per_hour = float(provider.get("price_per_hour", 0.5))
    billable_hours = max(1.0 / 60.0, float(tokens) / 3600.0)
    return round(price_per_hour * billable_hours, 6)


def _metric_row_to_dict(row: sqlite3.Row | None) -> dict[str, Any]:
    if row is None:
        return {
            "reputation_score": 0.0,
            "jobs_completed": 0,
            "success_rate": 0.0,
            "avg_completion_ms": 0.0,
            "benchmark_score": 0.0,
            "review_avg": 0.0,
            "review_count": 0,
            "uptime_30d": 0.0,
            "uptime_90d": 0.0,
            "last_updated": _utc_now().isoformat(),
        }
    return {
        "reputation_score": float(row["reputation_score"]),
        "jobs_completed": int(row["jobs_completed"]),
        "success_rate": float(row["success_rate"]),
        "avg_completion_ms": float(row["avg_completion_ms"]),
        "benchmark_score": float(row["benchmark_score"]),
        "review_avg": float(row["review_avg"]),
        "review_count": int(row["review_count"]),
        "uptime_30d": float(row["uptime_30d"]),
        "uptime_90d": float(row["uptime_90d"]),
        "last_updated": row["last_updated"],
    }


def refresh_provider_metrics() -> dict[str, Any]:
    conn = _connect()
    providers = _provider_pool()
    recent_jobs = get_recent_jobs(limit=1000)
    now_iso = _utc_now().isoformat()

    refreshed = 0
    for provider in providers:
        provider_id = str(provider.get("id"))
        provider_wallet = str(provider.get("payment_address", ""))

        provider_jobs = [
            job
            for job in recent_jobs
            if str(job.get("provider", "")) in {provider_id, provider_wallet}
        ]
        completed_jobs = [job for job in provider_jobs if str(job.get("status")) == "completed"]
        success_rate = (len(completed_jobs) / len(provider_jobs) * 100.0) if provider_jobs else 0.0
        avg_completion_ms = (
            sum(int(job.get("duration_ms", 0) or 0) for job in completed_jobs) / len(completed_jobs)
            if completed_jobs
            else 0.0
        )

        review_row = conn.execute(
            "SELECT COALESCE(AVG(rating), 0) AS review_avg, COUNT(*) AS review_count FROM provider_reviews WHERE provider_id=?",
            (provider_id,),
        ).fetchone()
        review_avg = float(review_row["review_avg"]) if review_row else 0.0
        review_count = int(review_row["review_count"]) if review_row else 0

        current_uptime = float(provider.get("uptime", 0.0))
        conn.execute(
            "INSERT INTO provider_uptime_samples (provider_id, sampled_at, uptime) VALUES (?, ?, ?)",
            (provider_id, now_iso, current_uptime),
        )

        samples_30 = conn.execute(
            """
            SELECT COALESCE(AVG(uptime), 0) AS avg_uptime
            FROM provider_uptime_samples
            WHERE provider_id=? AND sampled_at >= datetime('now', '-30 day')
            """,
            (provider_id,),
        ).fetchone()
        samples_90 = conn.execute(
            """
            SELECT COALESCE(AVG(uptime), 0) AS avg_uptime
            FROM provider_uptime_samples
            WHERE provider_id=? AND sampled_at >= datetime('now', '-90 day')
            """,
            (provider_id,),
        ).fetchone()
        uptime_30d = float(samples_30["avg_uptime"]) if samples_30 else current_uptime
        uptime_90d = float(samples_90["avg_uptime"]) if samples_90 else current_uptime

        benchmark_score = min(100.0, float(provider.get("vram_gb", 0)) / 2.0 + float(provider.get("gpu_count", 1)) * 3.0)
        review_norm = (review_avg / 5.0) * 100.0 if review_count else 0.0
        reputation = (
            0.35 * current_uptime
            + 0.25 * success_rate
            + 0.20 * benchmark_score
            + 0.20 * review_norm
        )

        conn.execute(
            """
            INSERT INTO provider_metrics
                (provider_id, reputation_score, jobs_completed, success_rate, avg_completion_ms, benchmark_score, review_avg, review_count, uptime_30d, uptime_90d, last_updated)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(provider_id) DO UPDATE SET
                reputation_score=excluded.reputation_score,
                jobs_completed=excluded.jobs_completed,
                success_rate=excluded.success_rate,
                avg_completion_ms=excluded.avg_completion_ms,
                benchmark_score=excluded.benchmark_score,
                review_avg=excluded.review_avg,
                review_count=excluded.review_count,
                uptime_30d=excluded.uptime_30d,
                uptime_90d=excluded.uptime_90d,
                last_updated=excluded.last_updated
            """,
            (
                provider_id,
                round(reputation, 2),
                len(completed_jobs),
                round(success_rate, 2),
                round(avg_completion_ms, 2),
                round(benchmark_score, 2),
                round(review_avg, 2),
                review_count,
                round(uptime_30d, 2),
                round(uptime_90d, 2),
                now_iso,
            ),
        )
        refreshed += 1

    conn.execute("DELETE FROM provider_uptime_samples WHERE sampled_at < datetime('now', '-120 day')")
    conn.commit()
    conn.close()
    return {"refreshed": refreshed, "updated_at": now_iso}


def _get_metric_for_provider(conn: sqlite3.Connection, provider_id: str) -> dict[str, Any]:
    row = conn.execute("SELECT * FROM provider_metrics WHERE provider_id=?", (provider_id,)).fetchone()
    return _metric_row_to_dict(row)


def _select_provider_for_template(
    providers: list[dict[str, Any]],
    conn: sqlite3.Connection,
    *,
    required_vram: int,
    provider_id: str | None,
) -> dict[str, Any]:
    eligible = [provider for provider in providers if int(provider.get("vram_gb", 0)) >= required_vram and str(provider.get("status", "")) == "active"]
    if provider_id:
        selected = next((provider for provider in eligible if str(provider.get("id")) == provider_id), None)
        if selected is None:
            raise HTTPException(status_code=404, detail="Requested provider unavailable for this template")
        return selected

    if not eligible:
        raise HTTPException(status_code=404, detail="No provider can satisfy required_vram")

    def score(provider: dict[str, Any]) -> tuple[float, float, float]:
        metrics = _get_metric_for_provider(conn, str(provider.get("id")))
        return (
            float(metrics.get("reputation_score", 0.0)),
            float(provider.get("uptime", 0.0)),
            -float(provider.get("price_per_hour", 0.0)),
        )

    return sorted(eligible, key=score, reverse=True)[0]


def _daily_spend_series(rows: list[sqlite3.Row]) -> list[dict[str, Any]]:
    buckets: dict[str, float] = {}
    for row in rows:
        created_at = str(row["created_at"])
        day = created_at[:10]
        buckets[day] = buckets.get(day, 0.0) + float(row["estimated_cost_algo"])
    return [{"day": day, "spent_algo": round(amount, 6)} for day, amount in sorted(buckets.items())]


async def _dispatch_webhooks(consumer_id: str, event_type: str, payload: dict[str, Any]) -> None:
    conn = _connect()
    rows = conn.execute(
        "SELECT url, event_types FROM consumer_webhooks WHERE consumer_id=? AND active=1",
        (consumer_id,),
    ).fetchall()
    conn.close()

    targets = []
    for row in rows:
        try:
            subscribed = json.loads(row["event_types"])
        except json.JSONDecodeError:
            subscribed = []
        if event_type in subscribed:
            targets.append(row["url"])

    if not targets:
        return

    timeout = httpx.Timeout(3.0)
    async with httpx.AsyncClient(timeout=timeout) as client:
        for url in targets:
            try:
                await client.post(url, json={"event": event_type, "payload": payload})
            except Exception:
                continue


def _hash_api_key(raw_key: str) -> str:
    return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()


def _resolve_api_key(x_api_key: str | None) -> dict[str, Any] | None:
    if not x_api_key:
        return None
    conn = _connect()
    row = conn.execute(
        "SELECT * FROM consumer_api_keys WHERE key_hash=? AND revoked=0",
        (_hash_api_key(x_api_key),),
    ).fetchone()
    conn.close()
    if row is None:
        return None
    return {"key_id": row["key_id"], "consumer_id": row["consumer_id"]}


@router.post("/trust/refresh")
async def refresh_trust_metrics() -> dict[str, Any]:
    return refresh_provider_metrics()


@router.get("/explore")
async def explore_providers(
    q: str | None = Query(default=None),
    use_case: str | None = Query(default=None),
    gpu_model: str | None = Query(default=None),
    min_uptime: float = Query(default=0.0),
    min_vram: int = Query(default=0),
    max_price: float = Query(default=10_000.0),
    verified_only: bool = Query(default=False),
    sort_by: str = Query(default="reputation"),
) -> dict[str, Any]:
    refresh_provider_metrics()
    conn = _connect()
    providers = _provider_pool()

    search = (q or "").strip().lower()
    use_case_l = (use_case or "").strip().lower()
    gpu_l = (gpu_model or "").strip().lower()

    results: list[dict[str, Any]] = []
    for provider in providers:
        metric = _get_metric_for_provider(conn, str(provider.get("id")))
        model = str(provider.get("gpu_model", "")).lower()
        name = str(provider.get("name", "")).lower()
        derived_use_case = "llm" if "h100" in model or "4090" in model else "inference"

        if search and search not in model and search not in name and search not in str(provider.get("org_name", "")).lower():
            continue
        if use_case_l and use_case_l not in derived_use_case and use_case_l not in model:
            continue
        if gpu_l and gpu_l not in model:
            continue
        if float(provider.get("uptime", 0.0)) < min_uptime:
            continue
        if int(provider.get("vram_gb", 0)) < min_vram:
            continue
        if float(provider.get("price_per_hour", 0.0)) > max_price:
            continue
        if verified_only and not bool(provider.get("verified_member", False)):
            continue

        results.append(
            {
                **provider,
                "use_case": derived_use_case,
                "trust": metric,
            }
        )

    def sort_key(item: dict[str, Any]) -> Any:
        trust = item.get("trust", {})
        if sort_by == "price":
            return float(item.get("price_per_hour", 0.0))
        if sort_by == "availability":
            return 1 if str(item.get("status")) == "active" else 0
        if sort_by == "uptime":
            return float(item.get("uptime", 0.0))
        if sort_by == "rating":
            return float(trust.get("review_avg", 0.0))
        return float(trust.get("reputation_score", 0.0))

    reverse = sort_by != "price"
    results = sorted(results, key=sort_key, reverse=reverse)
    conn.close()

    return {
        "count": len(results),
        "providers": results,
        "filters": {
            "q": q,
            "use_case": use_case,
            "gpu_model": gpu_model,
            "min_uptime": min_uptime,
            "min_vram": min_vram,
            "max_price": max_price,
            "verified_only": verified_only,
            "sort_by": sort_by,
        },
    }


@router.get("/providers/{provider_id}/profile")
async def provider_profile(provider_id: str) -> dict[str, Any]:
    refresh_provider_metrics()
    providers = _provider_map()
    provider = providers.get(provider_id)
    if provider is None:
        raise HTTPException(status_code=404, detail="Provider not found")

    conn = _connect()
    metric = _get_metric_for_provider(conn, provider_id)

    reviews_rows = conn.execute(
        "SELECT reviewer_id, rating, comment, created_at FROM provider_reviews WHERE provider_id=? ORDER BY created_at DESC LIMIT 100",
        (provider_id,),
    ).fetchall()
    reviews = [
        {
            "reviewer_id": row["reviewer_id"],
            "rating": int(row["rating"]),
            "comment": row["comment"],
            "created_at": row["created_at"],
        }
        for row in reviews_rows
    ]

    samples_90 = conn.execute(
        """
        SELECT sampled_at, uptime
        FROM provider_uptime_samples
        WHERE provider_id=? AND sampled_at >= datetime('now', '-90 day')
        ORDER BY sampled_at ASC
        LIMIT 400
        """,
        (provider_id,),
    ).fetchall()
    conn.close()

    if samples_90:
        uptime_history = [{"timestamp": row["sampled_at"], "uptime": float(row["uptime"])} for row in samples_90]
    else:
        base = float(provider.get("uptime", 0.0))
        uptime_history = []
        for day in range(1, 31):
            wobble = math.sin(day / 3.0) * 0.4
            uptime_history.append({"timestamp": f"day-{day}", "uptime": round(max(0.0, min(100.0, base + wobble)), 2)})

    return {
        "provider": provider,
        "trust": metric,
        "reviews": reviews,
        "uptime_history": uptime_history,
    }


@router.post("/providers/{provider_id}/reviews")
async def add_provider_review(provider_id: str, payload: ProviderReviewRequest) -> dict[str, Any]:
    providers = _provider_map()
    if provider_id not in providers:
        raise HTTPException(status_code=404, detail="Provider not found")

    conn = _connect()
    conn.execute(
        "INSERT INTO provider_reviews (provider_id, reviewer_id, rating, comment, created_at) VALUES (?, ?, ?, ?, ?)",
        (provider_id, payload.reviewer_id, payload.rating, payload.comment, _utc_now().isoformat()),
    )
    conn.commit()
    conn.close()
    refresh_provider_metrics()

    return {"ok": True, "provider_id": provider_id}


@router.get("/providers/{provider_id}/reviews")
async def list_provider_reviews(provider_id: str) -> dict[str, Any]:
    conn = _connect()
    rows = conn.execute(
        "SELECT reviewer_id, rating, comment, created_at FROM provider_reviews WHERE provider_id=? ORDER BY created_at DESC",
        (provider_id,),
    ).fetchall()
    conn.close()
    return {
        "provider_id": provider_id,
        "reviews": [
            {
                "reviewer_id": row["reviewer_id"],
                "rating": int(row["rating"]),
                "comment": row["comment"],
                "created_at": row["created_at"],
            }
            for row in rows
        ],
    }


@router.get("/templates")
async def list_templates(q: str | None = Query(default=None), use_case: str | None = Query(default=None)) -> dict[str, Any]:
    conn = _connect()
    rows = conn.execute("SELECT * FROM templates ORDER BY is_builtin DESC, usage_count DESC, created_at DESC").fetchall()
    conn.close()

    search = (q or "").strip().lower()
    use_case_l = (use_case or "").strip().lower()
    templates: list[dict[str, Any]] = []
    for row in rows:
        name = str(row["name"])
        description = str(row["description"])
        row_use_case = str(row["use_case"])
        if search and search not in name.lower() and search not in description.lower():
            continue
        if use_case_l and use_case_l != row_use_case.lower():
            continue
        templates.append(
            {
                "template_id": row["template_id"],
                "name": name,
                "description": description,
                "use_case": row_use_case,
                "params_schema": json.loads(row["params_json"]),
                "required_vram": int(row["required_vram"]),
                "base_tokens": int(row["base_tokens"]),
                "created_by": row["created_by"],
                "is_builtin": bool(row["is_builtin"]),
                "usage_count": int(row["usage_count"]),
                "rating": float(row["rating"]),
                "created_at": row["created_at"],
            }
        )

    return {"count": len(templates), "templates": templates}


@router.post("/templates")
async def create_template(payload: TemplateCreateRequest) -> dict[str, Any]:
    template_id = f"tpl_{uuid.uuid4().hex[:12]}"
    now = _utc_now().isoformat()

    conn = _connect()
    conn.execute(
        """
        INSERT INTO templates
            (template_id, name, description, use_case, params_json, required_vram, base_tokens, created_by, is_builtin, usage_count, rating, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, ?)
        """,
        (
            template_id,
            payload.name,
            payload.description,
            payload.use_case,
            json.dumps(payload.params_schema),
            payload.required_vram,
            payload.base_tokens,
            payload.created_by,
            now,
        ),
    )
    conn.commit()
    conn.close()

    return {"template_id": template_id, "created_at": now}


@router.post("/templates/{template_id}/deploy")
async def deploy_template(template_id: str, payload: TemplateDeployRequest) -> dict[str, Any]:
    refresh_provider_metrics()
    conn = _connect()
    row = conn.execute("SELECT * FROM templates WHERE template_id=?", (template_id,)).fetchone()
    if row is None:
        conn.close()
        raise HTTPException(status_code=404, detail="Template not found")

    providers = _provider_pool()
    selected = _select_provider_for_template(
        providers,
        conn,
        required_vram=int(row["required_vram"]),
        provider_id=payload.provider_id,
    )

    default_params = json.loads(row["params_json"])
    merged_params = {**default_params, **payload.params}
    tokens = int(merged_params.get("tokens", row["base_tokens"]))

    estimated_cost_algo = _estimate_cost(selected, tokens)
    deployment_id = f"dep_{uuid.uuid4().hex[:12]}"
    created_at = _utc_now().isoformat()

    conn.execute(
        """
        INSERT INTO template_deployments
            (deployment_id, template_id, consumer_id, provider_id, params_json, estimated_cost_algo, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 'running', ?)
        """,
        (
            deployment_id,
            template_id,
            payload.consumer_id,
            str(selected.get("id")),
            json.dumps(merged_params),
            estimated_cost_algo,
            created_at,
        ),
    )
    conn.execute("UPDATE templates SET usage_count = usage_count + 1 WHERE template_id=?", (template_id,))
    conn.commit()
    conn.close()

    record_job(
        job_id=deployment_id,
        consumer=payload.consumer_id,
        provider=str(selected.get("id")),
        task_type=str(row["use_case"]),
        tokens=tokens,
        amount_microalgo=int(estimated_cost_algo * 1_000_000),
        status="pending",
    )

    result = await run_job(
        {
            "job_id": deployment_id,
            "type": str(row["use_case"]),
            "tokens": tokens,
            "payload": json.dumps(merged_params, sort_keys=True),
        }
    )

    result_hash = str(result.get("result_hash", ""))
    duration_ms = int(result.get("duration_ms", 0))

    conn = _connect()
    conn.execute(
        """
        UPDATE template_deployments
        SET status='completed', result_hash=?, duration_ms=?, completed_at=?
        WHERE deployment_id=?
        """,
        (result_hash, duration_ms, _utc_now().isoformat(), deployment_id),
    )
    conn.commit()
    conn.close()

    complete_job(deployment_id, result_hash=result_hash, duration_ms=duration_ms, status="completed")
    await _dispatch_webhooks(
        payload.consumer_id,
        "job.completed",
        {
            "deployment_id": deployment_id,
            "template_id": template_id,
            "provider_id": selected.get("id"),
            "result_hash": result_hash,
        },
    )

    return {
        "deployment_id": deployment_id,
        "template_id": template_id,
        "provider": {
            "id": selected.get("id"),
            "name": selected.get("name"),
        },
        "estimated_cost_algo": estimated_cost_algo,
        "job_result": result,
    }


@router.get("/consumers/{consumer_id}/dashboard")
async def consumer_dashboard(consumer_id: str) -> dict[str, Any]:
    conn = _connect()
    rows = conn.execute(
        "SELECT * FROM template_deployments WHERE consumer_id=? ORDER BY created_at DESC",
        (consumer_id,),
    ).fetchall()
    saved_rows = conn.execute(
        "SELECT provider_id FROM consumer_saved_providers WHERE consumer_id=? ORDER BY created_at DESC",
        (consumer_id,),
    ).fetchall()
    fav_rows = conn.execute(
        "SELECT template_id FROM consumer_favorite_templates WHERE consumer_id=? ORDER BY created_at DESC",
        (consumer_id,),
    ).fetchall()
    conn.close()

    total_spent = sum(float(row["estimated_cost_algo"]) for row in rows)
    completed = [row for row in rows if str(row["status"]) == "completed"]
    avg_duration = sum(int(row["duration_ms"] or 0) for row in completed) / len(completed) if completed else 0.0

    return {
        "consumer_id": consumer_id,
        "summary": {
            "jobs_total": len(rows),
            "jobs_completed": len(completed),
            "spending_total_algo": round(total_spent, 6),
            "average_duration_ms": round(avg_duration, 2),
        },
        "spending_by_day": _daily_spend_series(rows),
        "saved_providers": [row["provider_id"] for row in saved_rows],
        "favorite_templates": [row["template_id"] for row in fav_rows],
        "jobs": [
            {
                "deployment_id": row["deployment_id"],
                "template_id": row["template_id"],
                "provider_id": row["provider_id"],
                "estimated_cost_algo": float(row["estimated_cost_algo"]),
                "status": row["status"],
                "result_hash": row["result_hash"],
                "duration_ms": int(row["duration_ms"] or 0),
                "created_at": row["created_at"],
                "completed_at": row["completed_at"],
            }
            for row in rows
        ],
    }


@router.post("/consumers/{consumer_id}/saved-providers/{provider_id}")
async def save_provider(consumer_id: str, provider_id: str) -> dict[str, Any]:
    if provider_id not in _provider_map():
        raise HTTPException(status_code=404, detail="Provider not found")

    conn = _connect()
    conn.execute(
        "INSERT OR REPLACE INTO consumer_saved_providers (consumer_id, provider_id, created_at) VALUES (?, ?, ?)",
        (consumer_id, provider_id, _utc_now().isoformat()),
    )
    conn.commit()
    conn.close()
    return {"saved": True, "consumer_id": consumer_id, "provider_id": provider_id}


@router.delete("/consumers/{consumer_id}/saved-providers/{provider_id}")
async def unsave_provider(consumer_id: str, provider_id: str) -> dict[str, Any]:
    conn = _connect()
    conn.execute(
        "DELETE FROM consumer_saved_providers WHERE consumer_id=? AND provider_id=?",
        (consumer_id, provider_id),
    )
    conn.commit()
    conn.close()
    return {"saved": False, "consumer_id": consumer_id, "provider_id": provider_id}


@router.post("/consumers/{consumer_id}/favorite-templates/{template_id}")
async def favorite_template(consumer_id: str, template_id: str) -> dict[str, Any]:
    conn = _connect()
    exists = conn.execute("SELECT template_id FROM templates WHERE template_id=?", (template_id,)).fetchone()
    if exists is None:
        conn.close()
        raise HTTPException(status_code=404, detail="Template not found")

    conn.execute(
        "INSERT OR REPLACE INTO consumer_favorite_templates (consumer_id, template_id, created_at) VALUES (?, ?, ?)",
        (consumer_id, template_id, _utc_now().isoformat()),
    )
    conn.commit()
    conn.close()
    return {"favorited": True, "consumer_id": consumer_id, "template_id": template_id}


@router.delete("/consumers/{consumer_id}/favorite-templates/{template_id}")
async def unfavorite_template(consumer_id: str, template_id: str) -> dict[str, Any]:
    conn = _connect()
    conn.execute(
        "DELETE FROM consumer_favorite_templates WHERE consumer_id=? AND template_id=?",
        (consumer_id, template_id),
    )
    conn.commit()
    conn.close()
    return {"favorited": False, "consumer_id": consumer_id, "template_id": template_id}


@router.get("/consumers/{consumer_id}/compare")
async def compare_providers(
    consumer_id: str,
    provider_ids: str = Query(..., description="Comma separated provider IDs"),
    tokens: int = Query(default=1000, ge=1, le=500_000),
    required_vram: int = Query(default=8, ge=1, le=4096),
) -> dict[str, Any]:
    refresh_provider_metrics()
    conn = _connect()
    providers = _provider_map()

    requested = [item.strip() for item in provider_ids.split(",") if item.strip()]
    if not requested:
        conn.close()
        raise HTTPException(status_code=422, detail="provider_ids cannot be empty")

    comparison: list[dict[str, Any]] = []
    for provider_id in requested[:3]:
        provider = providers.get(provider_id)
        if provider is None:
            continue
        if int(provider.get("vram_gb", 0)) < required_vram:
            continue

        metric = _get_metric_for_provider(conn, provider_id)
        comparison.append(
            {
                "provider": provider,
                "trust": metric,
                "estimated_cost_algo": _estimate_cost(provider, tokens),
                "estimated_completion_ms": int(max(500, tokens * 0.9)),
            }
        )

    conn.close()
    if not comparison:
        raise HTTPException(status_code=404, detail="No comparable providers found")

    best = sorted(
        comparison,
        key=lambda item: (
            float(item["trust"].get("reputation_score", 0.0)),
            -float(item.get("estimated_cost_algo", 0.0)),
        ),
        reverse=True,
    )[0]

    return {
        "consumer_id": consumer_id,
        "tokens": tokens,
        "required_vram": required_vram,
        "providers": comparison,
        "recommended": best,
    }


@router.post("/consumers/{consumer_id}/api-keys")
async def create_api_key(consumer_id: str) -> dict[str, Any]:
    raw_key = f"kh_{secrets.token_urlsafe(24)}"
    key_id = f"key_{uuid.uuid4().hex[:10]}"
    conn = _connect()
    conn.execute(
        "INSERT INTO consumer_api_keys (key_id, consumer_id, key_hash, prefix, revoked, created_at) VALUES (?, ?, ?, ?, 0, ?)",
        (
            key_id,
            consumer_id,
            _hash_api_key(raw_key),
            raw_key[:10],
            _utc_now().isoformat(),
        ),
    )
    conn.commit()
    conn.close()
    return {
        "key_id": key_id,
        "api_key": raw_key,
        "prefix": raw_key[:10],
        "warning": "Store this key now. It will not be shown again.",
    }


@router.get("/consumers/{consumer_id}/api-keys")
async def list_api_keys(consumer_id: str) -> dict[str, Any]:
    conn = _connect()
    rows = conn.execute(
        "SELECT key_id, prefix, revoked, created_at FROM consumer_api_keys WHERE consumer_id=? ORDER BY created_at DESC",
        (consumer_id,),
    ).fetchall()
    conn.close()
    return {
        "consumer_id": consumer_id,
        "keys": [
            {
                "key_id": row["key_id"],
                "prefix": row["prefix"],
                "revoked": bool(row["revoked"]),
                "created_at": row["created_at"],
            }
            for row in rows
        ],
    }


@router.post("/consumers/{consumer_id}/api-keys/{key_id}/revoke")
async def revoke_api_key(consumer_id: str, key_id: str) -> dict[str, Any]:
    conn = _connect()
    result = conn.execute(
        "UPDATE consumer_api_keys SET revoked=1 WHERE consumer_id=? AND key_id=?",
        (consumer_id, key_id),
    )
    conn.commit()
    conn.close()
    if result.rowcount <= 0:
        raise HTTPException(status_code=404, detail="API key not found")
    return {"revoked": True, "key_id": key_id}


@router.post("/consumers/{consumer_id}/webhooks")
async def register_webhook(consumer_id: str, payload: WebhookCreateRequest) -> dict[str, Any]:
    webhook_id = f"wh_{uuid.uuid4().hex[:10]}"
    conn = _connect()
    conn.execute(
        "INSERT INTO consumer_webhooks (webhook_id, consumer_id, url, event_types, active, created_at) VALUES (?, ?, ?, ?, 1, ?)",
        (webhook_id, consumer_id, payload.url, json.dumps(payload.event_types), _utc_now().isoformat()),
    )
    conn.commit()
    conn.close()
    return {"webhook_id": webhook_id, "active": True}


@router.get("/consumers/{consumer_id}/webhooks")
async def list_webhooks(consumer_id: str) -> dict[str, Any]:
    conn = _connect()
    rows = conn.execute(
        "SELECT webhook_id, url, event_types, active, created_at FROM consumer_webhooks WHERE consumer_id=? ORDER BY created_at DESC",
        (consumer_id,),
    ).fetchall()
    conn.close()
    return {
        "consumer_id": consumer_id,
        "webhooks": [
            {
                "webhook_id": row["webhook_id"],
                "url": row["url"],
                "event_types": json.loads(row["event_types"]),
                "active": bool(row["active"]),
                "created_at": row["created_at"],
            }
            for row in rows
        ],
    }


@router.delete("/consumers/{consumer_id}/webhooks/{webhook_id}")
async def delete_webhook(consumer_id: str, webhook_id: str) -> dict[str, Any]:
    conn = _connect()
    result = conn.execute(
        "DELETE FROM consumer_webhooks WHERE consumer_id=? AND webhook_id=?",
        (consumer_id, webhook_id),
    )
    conn.commit()
    conn.close()
    if result.rowcount <= 0:
        raise HTTPException(status_code=404, detail="Webhook not found")
    return {"deleted": True, "webhook_id": webhook_id}


@router.post("/consumer/jobs")
async def submit_consumer_job_with_api_key(
    payload: dict[str, Any],
    x_api_key: str | None = Header(default=None),
) -> dict[str, Any]:
    key = _resolve_api_key(x_api_key)
    if key is None:
        raise HTTPException(status_code=401, detail="Invalid API key")

    template_id = str(payload.get("template_id", "")).strip()
    if not template_id:
        raise HTTPException(status_code=422, detail="template_id is required")

    deploy_payload = TemplateDeployRequest(
        consumer_id=str(key["consumer_id"]),
        params=dict(payload.get("params", {})),
        provider_id=payload.get("provider_id"),
    )
    result = await deploy_template(template_id, deploy_payload)
    return {"api_key_id": key["key_id"], **result}


_ensure_db()