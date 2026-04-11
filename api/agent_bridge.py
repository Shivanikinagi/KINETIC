from __future__ import annotations

import asyncio
import json
import os
import sqlite3
from pathlib import Path

from fastapi import FastAPI


app = FastAPI(title="Agent Bridge API", version="1.0.0")
ROOT = Path(__file__).resolve().parents[1]
AGENT_LOG = ROOT / "agent" / "agent.log"
SPEND_DB = ROOT / "agent" / "spend_log.db"


def _tail_lines(path: Path, limit: int) -> list[str]:
    if not path.exists():
        return []
    lines = path.read_text(encoding="utf-8", errors="ignore").splitlines()
    return lines[-limit:]


def _parse_logs(limit: int = 50) -> list[dict]:
    entries: list[dict] = []
    for line in _tail_lines(AGENT_LOG, limit):
        try:
            entries.append(json.loads(line))
        except json.JSONDecodeError:
            continue
    return entries


def _status_summary() -> dict:
    logs = _parse_logs(500)
    status = "idle"
    if logs and "starting job dispatch" in logs[-1].get("message", "").lower():
        status = "running"

    verifications_passed = sum(1 for item in logs if "ESCROW_RELEASED" in item.get("message", ""))
    jobs_today = sum(1 for item in logs if "Job completed" in item.get("message", ""))

    algo_spent_today = 0.0
    spent_microalgo = 0
    if SPEND_DB.exists():
        with sqlite3.connect(SPEND_DB) as conn:
            row = conn.execute("SELECT COALESCE(SUM(amount), 0) FROM spends").fetchone()
        spent_microalgo = int(row[0] if row else 0)
        algo_spent_today = spent_microalgo / 1_000_000

    daily_budget = int(os.getenv("AGENT_DAILY_BUDGET_MICROALGO", "5000000"))
    budget_remaining = max(0, daily_budget - spent_microalgo) / 1_000_000
    latest = logs[-1] if logs else {}

    return {
        "status": status,
        "jobs_today": jobs_today,
        "algo_spent_today": algo_spent_today,
        "verifications_passed": verifications_passed,
        "budget_remaining": budget_remaining,
        "current_task": {
            "type": latest.get("task_type", "inference"),
            "tokens": latest.get("task_tokens", 0),
        },
    }


@app.get("/agent/log")
async def agent_log() -> list[dict]:
    return _parse_logs(50)


@app.get("/agent/status")
async def agent_status() -> dict:
    return _status_summary()


@app.post("/agent/run")
async def run_agent(payload: dict) -> dict:
    cmd = [
        "python",
        "agent/consumer_agent.py",
        "--type",
        str(payload.get("type", "inference")),
        "--tokens",
        str(payload.get("tokens", 100)),
        "--payload",
        str(payload.get("payload", "demo")),
    ]
    proc = await asyncio.create_subprocess_exec(*cmd, cwd=str(ROOT))
    return {"started": True, "pid": proc.pid}
