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
            created_at REAL,
            completed_at REAL
        )
        """
    )
    conn.commit()
    return conn


def record_job(
    job_id: str,
    consumer: str = "",
    provider: str = "",
    task_type: str = "inference",
    tokens: int = 0,
    amount_microalgo: int = 0,
    status: str = "pending",
) -> dict[str, Any]:
    conn = _ensure_db()
    now = time.time()
    conn.execute(
        """
        INSERT OR REPLACE INTO jobs
            (job_id, consumer, provider, task_type, tokens, amount_microalgo, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (job_id, consumer, provider, task_type, tokens, amount_microalgo, status, now),
    )
    conn.commit()
    conn.close()
    return {"job_id": job_id, "status": status, "created_at": now}


def complete_job(
    job_id: str,
    result_hash: str = "",
    duration_ms: int = 0,
    status: str = "completed",
) -> None:
    conn = _ensure_db()
    now = time.time()
    conn.execute(
        "UPDATE jobs SET status=?, result_hash=?, duration_ms=?, completed_at=? WHERE job_id=?",
        (status, result_hash, duration_ms, now, job_id),
    )
    conn.commit()
    conn.close()


def get_recent_jobs(limit: int = 50) -> list[dict[str, Any]]:
    conn = _ensure_db()
    rows = conn.execute(
        "SELECT * FROM jobs ORDER BY created_at DESC LIMIT ?", (limit,)
    ).fetchall()
    conn.close()
    columns = [
        "job_id", "consumer", "provider", "task_type", "tokens",
        "amount_microalgo", "result_hash", "status", "duration_ms",
        "created_at", "completed_at",
    ]
    return [dict(zip(columns, row)) for row in rows]


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
