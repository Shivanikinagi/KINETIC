"""Job history store and analytics — in-memory with optional SQLite persistence."""
from __future__ import annotations

import json
import sqlite3
import time
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

DB_PATH = Path(__file__).resolve().parents[1] / "data" / "jobs.db"


def _ensure_db() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS jobs (
            job_id TEXT PRIMARY KEY,
            consumer TEXT,
            provider TEXT,
            task_type TEXT,
            tokens INTEGER,
            amount_microalgo INTEGER,
            result_hash TEXT,
            status TEXT DEFAULT 'pending',
            duration_ms INTEGER DEFAULT 0,
            tx_id TEXT,
            explorer_url TEXT,
            created_at REAL,
            completed_at REAL,
            progress INTEGER DEFAULT 0,
            gpu_utilization REAL DEFAULT 0,
            vram_usage REAL DEFAULT 0,
            vram_total REAL DEFAULT 0,
            escrow_status TEXT DEFAULT 'locked',
            cost_algo REAL DEFAULT 0
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS job_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            job_id TEXT NOT NULL,
            log_line TEXT NOT NULL,
            created_at REAL NOT NULL
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS provider_reviews (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            provider_id TEXT NOT NULL,
            reviewer TEXT NOT NULL,
            rating INTEGER NOT NULL DEFAULT 5,
            comment TEXT NOT NULL DEFAULT '',
            created_at REAL NOT NULL
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tx_id TEXT NOT NULL,
            job_id TEXT,
            kind TEXT NOT NULL DEFAULT '',
            from_addr TEXT NOT NULL DEFAULT '',
            to_addr TEXT NOT NULL DEFAULT '',
            amount_microalgo INTEGER NOT NULL DEFAULT 0,
            status TEXT NOT NULL DEFAULT 'pending',
            created_at REAL NOT NULL
        )
        """
    )
    conn.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_job_logs_job_id ON job_logs (job_id)
        """
    )
    conn.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_provider_reviews_provider ON provider_reviews (provider_id)
        """
    )
    conn.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_transactions_job_id ON transactions (job_id)
        """
    )
    conn.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_transactions_from_addr ON transactions (from_addr)
        """
    )

    # Migration for existing tables: add new columns if they don't exist
    new_columns = [
        ("tx_id", "TEXT"),
        ("explorer_url", "TEXT"),
        ("progress", "INTEGER DEFAULT 0"),
        ("gpu_utilization", "REAL DEFAULT 0"),
        ("vram_usage", "REAL DEFAULT 0"),
        ("vram_total", "REAL DEFAULT 0"),
        ("escrow_status", "TEXT DEFAULT 'locked'"),
        ("cost_algo", "REAL DEFAULT 0"),
    ]
    for col, dtype in new_columns:
        try:
            conn.execute(f"ALTER TABLE jobs ADD COLUMN {col} {dtype}")
        except sqlite3.OperationalError:
            pass

    # Backfill missing timestamps from older databases.
    try:
        conn.execute(
            "UPDATE jobs SET created_at = COALESCE(created_at, completed_at) WHERE created_at IS NULL"
        )
        conn.execute(
            "UPDATE jobs SET completed_at = COALESCE(completed_at, created_at) WHERE completed_at IS NULL AND status IN ('completed','failed')"
        )
    except sqlite3.OperationalError:
        pass
    conn.commit()
    return conn


def mark_stale_pending_jobs(*, max_age_seconds: int = 600) -> int:
    """Mark jobs stuck in 'pending' as 'failed' after crashes/restarts."""
    conn = _ensure_db()
    now = time.time()
    cutoff = now - float(max_age_seconds)
    try:
        cur = conn.execute(
            """
            UPDATE jobs
            SET status='failed', completed_at=?, duration_ms=COALESCE(duration_ms, 0)
            WHERE status='pending' AND created_at IS NOT NULL AND created_at < ?
            """,
            (now, cutoff),
        )
        affected = int(cur.rowcount or 0)
    finally:
        conn.commit()
        conn.close()
    return affected


def record_job(
    job_id: str,
    consumer: str = "",
    provider: str = "",
    task_type: str = "inference",
    tokens: int = 0,
    amount_microalgo: int = 0,
    status: str = "pending",
    tx_id: str = "",
    explorer_url: str = "",
    progress: int = 0,
    escrow_status: str = "locked",
    cost_algo: float = 0.0,
) -> dict[str, Any]:
    conn = _ensure_db()
    now = time.time()
    conn.execute(
        """
        INSERT OR REPLACE INTO jobs
            (job_id, consumer, provider, task_type, tokens, amount_microalgo, status, tx_id, explorer_url, created_at, progress, escrow_status, cost_algo)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (job_id, consumer, provider, task_type, tokens, amount_microalgo, status, tx_id, explorer_url, now, progress, escrow_status, cost_algo),
    )
    conn.commit()
    conn.close()
    return {"job_id": job_id, "status": status, "created_at": now}


def complete_job(
    job_id: str,
    result_hash: str = "",
    duration_ms: int = 0,
    status: str = "completed",
    tx_id: str = "",
    explorer_url: str = "",
) -> None:
    conn = _ensure_db()
    now = time.time()
    conn.execute(
        "UPDATE jobs SET status=?, result_hash=?, duration_ms=?, completed_at=?, tx_id=?, explorer_url=? WHERE job_id=?",
        (status, result_hash, duration_ms, now, tx_id, explorer_url, job_id),
    )
    conn.commit()
    conn.close()


def get_recent_jobs(limit: int = 50) -> list[dict[str, Any]]:
    conn = _ensure_db()
    conn.row_factory = sqlite3.Row
    rows = conn.execute(
        "SELECT job_id, consumer, provider, task_type, tokens, amount_microalgo, result_hash, status, duration_ms, created_at, completed_at, tx_id, explorer_url, progress, gpu_utilization, vram_usage, vram_total, escrow_status, cost_algo FROM jobs ORDER BY created_at DESC LIMIT ?",
        (limit,),
    ).fetchall()
    conn.close()
    return [dict(row) for row in rows]


def get_job(job_id: str) -> dict[str, Any] | None:
    conn = _ensure_db()
    row = conn.execute(
        "SELECT job_id, consumer, provider, task_type, tokens, amount_microalgo, result_hash, status, duration_ms, created_at, completed_at, tx_id, explorer_url, progress, gpu_utilization, vram_usage, vram_total, escrow_status, cost_algo FROM jobs WHERE job_id=?",
        (job_id,)
    ).fetchone()
    conn.close()
    if row is None:
        return None
    columns = [
        "job_id", "consumer", "provider", "task_type", "tokens",
        "amount_microalgo", "result_hash", "status", "duration_ms",
        "created_at", "completed_at", "tx_id", "explorer_url",
        "progress", "gpu_utilization", "vram_usage", "vram_total",
        "escrow_status", "cost_algo",
    ]
    result = dict(zip(columns, row))
    # Enrich with logs
    result["logs"] = get_job_logs(job_id)
    # Provide sensible defaults
    if result["progress"] is None:
        result["progress"] = 100 if result["status"] in ("completed", "failed") else 0
    if result["gpu_utilization"] is None:
        result["gpu_utilization"] = 0.0
    if result["vram_usage"] is None:
        result["vram_usage"] = 0.0
    if result["vram_total"] is None:
        result["vram_total"] = 0.0
    if result["escrow_status"] is None:
        result["escrow_status"] = "locked"
    if result["cost_algo"] is None:
        result["cost_algo"] = (result.get("amount_microalgo") or 0) / 1_000_000.0
    if result["provider"] is None:
        result["provider"] = "local"
    return result


def add_job_log(job_id: str, log_line: str) -> None:
    conn = _ensure_db()
    now = time.time()
    conn.execute(
        "INSERT INTO job_logs (job_id, log_line, created_at) VALUES (?, ?, ?)",
        (job_id, log_line, now),
    )
    conn.commit()
    conn.close()


def get_job_logs(job_id: str) -> list[str]:
    conn = _ensure_db()
    rows = conn.execute(
        "SELECT log_line FROM job_logs WHERE job_id=? ORDER BY created_at ASC",
        (job_id,),
    ).fetchall()
    conn.close()
    return [r[0] for r in rows]


def update_job_progress(job_id: str, progress: int) -> None:
    conn = _ensure_db()
    conn.execute(
        "UPDATE jobs SET progress=? WHERE job_id=?",
        (max(0, min(100, progress)), job_id),
    )
    conn.commit()
    conn.close()


def update_job_gpu_metrics(
    job_id: str,
    gpu_util: float | None = None,
    vram_usage: float | None = None,
    vram_total: float | None = None,
) -> None:
    conn = _ensure_db()
    if gpu_util is not None:
        conn.execute("UPDATE jobs SET gpu_utilization=? WHERE job_id=?", (gpu_util, job_id))
    if vram_usage is not None:
        conn.execute("UPDATE jobs SET vram_usage=? WHERE job_id=?", (vram_usage, job_id))
    if vram_total is not None:
        conn.execute("UPDATE jobs SET vram_total=? WHERE job_id=?", (vram_total, job_id))
    conn.commit()
    conn.close()


def update_job_escrow(job_id: str, escrow_status: str) -> None:
    conn = _ensure_db()
    conn.execute("UPDATE jobs SET escrow_status=? WHERE job_id=?", (escrow_status, job_id))
    conn.commit()
    conn.close()


def get_analytics() -> dict[str, Any]:
    conn = _ensure_db()
    total = conn.execute("SELECT COUNT(*) FROM jobs").fetchone()[0]
    completed = conn.execute("SELECT COUNT(*) FROM jobs WHERE status='completed'").fetchone()[0]
    failed = conn.execute("SELECT COUNT(*) FROM jobs WHERE status='failed'").fetchone()[0]
    total_tokens = conn.execute("SELECT COALESCE(SUM(tokens), 0) FROM jobs WHERE status='completed'").fetchone()[0]
    total_algo = conn.execute("SELECT COALESCE(SUM(amount_microalgo), 0) FROM jobs WHERE status='completed'").fetchone()[0]
    avg_duration = conn.execute("SELECT COALESCE(AVG(duration_ms), 0) FROM jobs WHERE status='completed'").fetchone()[0]

    # Jobs per hour (last 24h)
    cutoff = time.time() - 86400
    jobs_24h = conn.execute("SELECT COUNT(*) FROM jobs WHERE created_at > ?", (cutoff,)).fetchone()[0]

    conn.close()
    return {
        "total_jobs": total,
        "completed_jobs": completed,
        "failed_jobs": failed,
        "pending_jobs": total - completed - failed,
        "total_tokens_processed": total_tokens,
        "total_algo_spent_microalgo": total_algo,
        "total_algo_spent": total_algo / 1_000_000,
        "avg_duration_ms": round(avg_duration, 2),
        "jobs_last_24h": jobs_24h,
        "success_rate": round((completed / total * 100) if total > 0 else 0, 2),
        "timestamp": datetime.now(UTC).isoformat(),
    }


# ── Provider reputation helpers ──────────────────────────────────────────────

def add_provider_review(provider_id: str, reviewer: str, rating: int, comment: str = "") -> dict[str, Any]:
    conn = _ensure_db()
    now = time.time()
    conn.execute(
        "INSERT INTO provider_reviews (provider_id, reviewer, rating, comment, created_at) VALUES (?, ?, ?, ?, ?)",
        (provider_id, reviewer, max(1, min(5, rating)), comment, now),
    )
    conn.commit()
    conn.close()
    return {"provider_id": provider_id, "rating": rating, "reviewer": reviewer}


def get_provider_reviews(provider_id: str) -> list[dict[str, Any]]:
    conn = _ensure_db()
    conn.row_factory = sqlite3.Row
    rows = conn.execute(
        "SELECT reviewer, rating, comment, created_at FROM provider_reviews WHERE provider_id=? ORDER BY created_at DESC",
        (provider_id,),
    ).fetchall()
    conn.close()
    return [dict(row) for row in rows]


def get_provider_reputation(provider_id: str) -> dict[str, Any]:
    conn = _ensure_db()
    total_jobs = conn.execute("SELECT COUNT(*) FROM jobs WHERE provider=?", (provider_id,)).fetchone()[0]
    completed_jobs = conn.execute("SELECT COUNT(*) FROM jobs WHERE provider=? AND status='completed'", (provider_id,)).fetchone()[0]
    failed_jobs = conn.execute("SELECT COUNT(*) FROM jobs WHERE provider=? AND status='failed'", (provider_id,)).fetchone()[0]
    avg_rating = conn.execute(
        "SELECT COALESCE(AVG(rating), 0) FROM provider_reviews WHERE provider_id=?", (provider_id,)
    ).fetchone()[0]
    review_count = conn.execute("SELECT COUNT(*) FROM provider_reviews WHERE provider_id=?", (provider_id,)).fetchone()[0]
    conn.close()
    return {
        "provider_id": provider_id,
        "reputation_score": round(float(avg_rating) * 20, 1) if review_count else 100.0,
        "completed_jobs": completed_jobs,
        "failed_jobs": failed_jobs,
        "avg_rating": round(float(avg_rating), 2) if review_count else None,
        "review_count": review_count,
        "verification_status": True,
        "badges": ["verified"],
    }


# ── Wallet / escrow helpers ──────────────────────────────────────────────────

def add_transaction(
    tx_id: str,
    job_id: str | None = None,
    kind: str = "",
    from_addr: str = "",
    to_addr: str = "",
    amount_microalgo: int = 0,
    status: str = "pending",
) -> None:
    conn = _ensure_db()
    now = time.time()
    conn.execute(
        "INSERT INTO transactions (tx_id, job_id, kind, from_addr, to_addr, amount_microalgo, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        (tx_id, job_id or "", kind, from_addr, to_addr, amount_microalgo, status, now),
    )
    conn.commit()
    conn.close()


def get_wallet_transactions(address: str) -> list[dict[str, Any]]:
    conn = _ensure_db()
    conn.row_factory = sqlite3.Row
    rows = conn.execute(
        "SELECT tx_id, job_id, kind, from_addr, to_addr, amount_microalgo, status, created_at FROM transactions WHERE from_addr=? OR to_addr=? ORDER BY created_at DESC",
        (address, address),
    ).fetchall()
    conn.close()
    return [dict(row) for row in rows]


def get_wallet_stats(address: str) -> dict[str, Any]:
    conn = _ensure_db()
    total_spent = conn.execute(
        "SELECT COALESCE(SUM(amount_microalgo), 0) FROM transactions WHERE from_addr=? AND kind='spend'",
        (address,),
    ).fetchone()[0]
    jobs_completed = conn.execute(
        "SELECT COUNT(*) FROM jobs WHERE consumer=? AND status='completed'", (address,)
    ).fetchone()[0]
    fav_provider_row = conn.execute(
        """
        SELECT provider, COUNT(*) as cnt FROM jobs
        WHERE consumer=? AND status='completed'
        GROUP BY provider ORDER BY cnt DESC LIMIT 1
        """,
        (address,),
    ).fetchone()
    conn.close()
    return {
        "address": address,
        "total_spent_algo": total_spent / 1_000_000,
        "jobs_completed": jobs_completed,
        "favorite_provider": fav_provider_row[0] if fav_provider_row else None,
    }


def get_escrow_status(job_id: str) -> dict[str, Any]:
    conn = _ensure_db()
    row = conn.execute(
        "SELECT job_id, escrow_status, cost_algo, amount_microalgo, provider, consumer, status FROM jobs WHERE job_id=?",
        (job_id,),
    ).fetchone()
    conn.close()
    if not row:
        return {"error": "Job not found"}
    return {
        "job_id": row[0],
        "escrow_status": row[1] or "locked",
        "cost_algo": row[2] or (row[3] / 1_000_000.0),
        "amount_microalgo": row[3],
        "provider": row[4],
        "consumer": row[5],
        "job_status": row[6],
    }


# ── Analytics helpers ────────────────────────────────────────────────────────

def get_gpu_usage_hourly() -> list[dict[str, Any]]:
    """Return dummy hourly GPU utilization data for charts (last 24h)."""
    now = time.time()
    hourly = []
    for i in range(24):
        hour_ts = now - (23 - i) * 3600
        hourly.append({
            "hour": datetime.fromtimestamp(hour_ts, UTC).strftime("%Y-%m-%d %H:00"),
            "gpu_utilization": round(30 + (i % 7) * 10 + (i % 3) * 5, 1),
            "vram_usage_gb": round(4 + (i % 5) * 0.8, 1),
        })
    return hourly


def get_revenue_data() -> dict[str, Any]:
    conn = _ensure_db()
    provider_payouts = conn.execute(
        "SELECT provider, COALESCE(SUM(amount_microalgo), 0) FROM jobs WHERE status='completed' GROUP BY provider"
    ).fetchall()
    consumer_spending = conn.execute(
        "SELECT consumer, COALESCE(SUM(amount_microalgo), 0) FROM jobs WHERE status='completed' GROUP BY consumer"
    ).fetchall()
    conn.close()
    return {
        "provider_payouts": [
            {"provider": p[0], "amount_microalgo": p[1], "amount_algo": p[1] / 1_000_000}
            for p in provider_payouts
        ],
        "consumer_spending": [
            {"consumer": c[0], "amount_microalgo": c[1], "amount_algo": c[1] / 1_000_000}
            for c in consumer_spending
        ],
    }


def get_marketplace_stats() -> dict[str, Any]:
    conn = _ensure_db()
    active_providers = conn.execute(
        "SELECT COUNT(DISTINCT provider) FROM jobs WHERE status='completed' OR status='pending'"
    ).fetchone()[0]
    total_jobs = conn.execute("SELECT COUNT(*) FROM jobs").fetchone()[0]
    jobs_per_day = conn.execute(
        "SELECT DATE(created_at, 'unixepoch') as day, COUNT(*) FROM jobs GROUP BY day ORDER BY day DESC LIMIT 30"
    ).fetchall()
    avg_price = conn.execute(
        "SELECT COALESCE(AVG(cost_algo), 0) FROM jobs WHERE status='completed'"
    ).fetchone()[0]
    conn.close()
    return {
        "active_providers": active_providers,
        "total_jobs": total_jobs,
        "jobs_per_day": [
            {"date": d[0], "count": d[1]} for d in jobs_per_day
        ],
        "avg_price_algo": round(float(avg_price), 6) if avg_price else 0.0,
    }


def get_model_usage_analytics() -> list[dict[str, Any]]:
    # Use hub_data models and job counts per task_type as a proxy
    conn = _ensure_db()
    rows = conn.execute(
        "SELECT task_type, COUNT(*) as runs FROM jobs GROUP BY task_type ORDER BY runs DESC"
    ).fetchall()
    conn.close()
    return [
        {"model_type": r[0], "inference_runs": r[1]}
        for r in rows
    ]


# ── Seed helpers ─────────────────────────────────────────────────────────────

def seed_demo_data() -> None:
    """Seed demo providers, jobs, and models if databases are empty."""
    conn = _ensure_db()
    job_count = conn.execute("SELECT COUNT(*) FROM jobs").fetchone()[0]
    if job_count == 0:
        now = time.time()
        demo_jobs = [
            (
                "demo_job_1", "consumer_A", "provider_alpha", "inference",
                512, 100_000, "abc123", "completed", 1200, "tx1", "", now - 3600, now - 2400,
                100, 78.5, 6.2, 12.0, "released", 0.1,
            ),
            (
                "demo_job_2", "consumer_B", "provider_beta", "training",
                1024, 250_000, "def456", "completed", 3500, "tx2", "", now - 7200, now - 3600,
                100, 92.0, 10.5, 16.0, "released", 0.25,
            ),
            (
                "demo_job_3", "consumer_A", "provider_alpha", "inference",
                256, 50_000, "", "failed", 800, "", "", now - 1800, now - 1000,
                45, 40.0, 3.0, 8.0, "refunded", 0.05,
            ),
        ]
        conn.executemany(
            """
            INSERT OR IGNORE INTO jobs
            (job_id, consumer, provider, task_type, tokens, amount_microalgo, result_hash, status, duration_ms, tx_id, explorer_url, created_at, completed_at, progress, gpu_utilization, vram_usage, vram_total, escrow_status, cost_algo)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            demo_jobs,
        )
        for jid, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _ in demo_jobs:
            conn.execute(
                "INSERT OR IGNORE INTO job_logs (job_id, log_line, created_at) VALUES (?, ?, ?)",
                (jid, "Job queued", now - 3600),
            )
            conn.execute(
                "INSERT OR IGNORE INTO job_logs (job_id, log_line, created_at) VALUES (?, ?, ?)",
                (jid, "Execution started", now - 3500),
            )
        conn.commit()
    conn.close()

    # Seed hub models if empty (handled in hub_data, but we can add job-like seeding here)
    from api.hub_data import _ensure_db as hub_ensure_db, list_models, create_model
    hub_ensure_db()
    if not list_models():
        create_model(
            name="kinetic-bert-base",
            description="Base BERT model fine-tuned for P2P compute tasks.",
            tags=["nlp", "bert", "base"],
            readme="# Kinetic BERT\n\nFine-tuned for decentralized inference.",
            owner="kinetic-team",
            license="Apache-2.0",
            compute_req="8GB VRAM",
        )
        create_model(
            name="kinetic-diffusion-v1",
            description="Lightweight diffusion model for image generation.",
            tags=["image", "diffusion", "lightweight"],
            readme="# Kinetic Diffusion\n\nFast image generation on consumer GPUs.",
            owner="kinetic-team",
            license="MIT",
            compute_req="12GB VRAM",
        )
