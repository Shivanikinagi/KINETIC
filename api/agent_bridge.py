from __future__ import annotations

import base64
import json
import os
import re
import sqlite3
import subprocess
import sys
from pathlib import Path
from typing import Any

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


app = FastAPI(title="Agent Bridge API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

ROOT = Path(__file__).resolve().parents[1]
AGENT_LOG = ROOT / "agent" / "agent.log"
SPEND_DB = ROOT / "agent" / "spend_log.db"
SETTINGS_FILE = ROOT / "agent" / "settings.json"
TX_ID_PATTERN = re.compile(r"tx_id=([A-Z0-9]+)")

load_dotenv(ROOT / ".env")


def _to_int(value: str, default: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _network_name() -> str:
    return os.getenv("ALGORAND_NETWORK", "testnet").strip().lower()


def _indexer_url() -> str:
    network = _network_name()
    if network == "mainnet":
        return os.getenv("INDEXER_URL", "https://mainnet-idx.algonode.cloud")
    return os.getenv("INDEXER_URL", "https://testnet-idx.algonode.cloud")


def _tx_url(tx_id: str) -> str:
    if _network_name() == "mainnet":
        return f"https://explorer.perawallet.app/tx/{tx_id}"
    return f"https://testnet.explorer.perawallet.app/tx/{tx_id}"


def _app_url(app_id: int) -> str:
    if _network_name() == "mainnet":
        return f"https://explorer.perawallet.app/application/{app_id}"
    return f"https://testnet.explorer.perawallet.app/application/{app_id}"


def _extract_method_selector(tx: dict[str, Any]) -> str:
    app_txn = tx.get("application-transaction", {})
    args = app_txn.get("application-args") or []
    if not args:
        return ""
    try:
        return base64.b64decode(args[0]).hex()[:8]
    except Exception:
        return ""


def _indexer_transactions(params: dict[str, Any]) -> list[dict[str, Any]]:
    try:
        with httpx.Client(timeout=20) as client:
            response = client.get(f"{_indexer_url()}/v2/transactions", params=params)
            response.raise_for_status()
            payload = response.json()
            return payload.get("transactions", [])
    except Exception:
        return []


def _latest_method_call(app_id: int, selector_hex: str) -> dict[str, Any] | None:
    txs = _indexer_transactions({"application-id": app_id, "limit": 100})
    for tx in txs:
        if _extract_method_selector(tx) == selector_hex:
            return tx
    return None


def _latest_method_calls(app_id: int, selector_hex: str, limit: int = 5) -> list[dict[str, Any]]:
    txs = _indexer_transactions({"application-id": app_id, "limit": 200})
    matched = [tx for tx in txs if _extract_method_selector(tx) == selector_hex]
    return matched[:limit]


def _build_proofs() -> dict[str, Any]:
    badge_app_id = _to_int(os.getenv("BADGE_APP_ID", "0"))
    registry_app_id = _to_int(os.getenv("REGISTRY_APP_ID", "0"))
    escrow_app_id = _to_int(os.getenv("ESCROW_APP_ID", "0"))

    apps: list[dict[str, Any]] = []
    for name, app_id in [
        ("BadgeMinter", badge_app_id),
        ("ProviderRegistry", registry_app_id),
        ("EscrowContract", escrow_app_id),
    ]:
        if app_id > 0:
            apps.append({"name": name, "app_id": app_id, "url": _app_url(app_id)})

    proofs: list[dict[str, Any]] = []

    if registry_app_id > 0:
        register_tx = _latest_method_call(registry_app_id, "71c4983d")
        if register_tx:
            tx_id = register_tx.get("id", "")
            proofs.append(
                {
                    "kind": "provider_register",
                    "label": "Provider Registration",
                    "tx_id": tx_id,
                    "url": _tx_url(tx_id),
                    "round": register_tx.get("confirmed-round"),
                }
            )

    if badge_app_id > 0:
        for index, tx in enumerate(_latest_method_calls(badge_app_id, "ba16e155", limit=2), start=1):
            tx_id = tx.get("id", "")
            proofs.append(
                {
                    "kind": f"badge_mint_{index}",
                    "label": f"Badge Mint #{index}",
                    "tx_id": tx_id,
                    "url": _tx_url(tx_id),
                    "round": tx.get("confirmed-round"),
                }
            )

    logs = list(reversed(_parse_logs(500)))
    log_proof_defs = [
        ("escrow_lock", "Escrow Lock", "ESCROW_LOCKED"),
        ("payment", "Agent Payment", "Payment submitted"),
        ("escrow_release", "Escrow Release", "ESCROW_RELEASE_REQUESTED"),
    ]
    for kind, label, marker in log_proof_defs:
        for entry in logs:
            message = entry.get("message", "")
            if marker not in message:
                continue
            match = TX_ID_PATTERN.search(message)
            if not match:
                continue
            tx_id = match.group(1)
            proofs.append(
                {
                    "kind": kind,
                    "label": label,
                    "tx_id": tx_id,
                    "url": _tx_url(tx_id),
                    "timestamp": entry.get("timestamp"),
                }
            )
            break

    return {
        "network": _network_name(),
        "indexer_url": _indexer_url(),
        "apps": apps,
        "proofs": proofs,
    }


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


def _default_settings() -> dict[str, Any]:
    return {
        "daily_budget_microalgo": int(os.getenv("AGENT_DAILY_BUDGET_MICROALGO", "5000000")),
        "max_job_tokens": int(os.getenv("AGENT_MAX_TOKENS", "2000")),
        "default_task_type": os.getenv("AGENT_DEFAULT_TASK_TYPE", "inference"),
        "provider_endpoint": os.getenv("PROVIDER_ENDPOINT", "http://localhost:8000"),
        "agent_bridge_url": os.getenv("AGENT_BRIDGE_URL", "http://localhost:3001"),
    }


def _load_settings() -> dict[str, Any]:
    defaults = _default_settings()
    if not SETTINGS_FILE.exists():
        return defaults
    try:
        payload = json.loads(SETTINGS_FILE.read_text(encoding="utf-8"))
        if not isinstance(payload, dict):
            return defaults
        return {**defaults, **payload}
    except Exception:
        return defaults


def _save_settings(settings: dict[str, Any]) -> dict[str, Any]:
    merged = {**_default_settings(), **settings}
    SETTINGS_FILE.parent.mkdir(parents=True, exist_ok=True)
    SETTINGS_FILE.write_text(json.dumps(merged, indent=2), encoding="utf-8")
    return merged


@app.get("/agent/log")
async def agent_log() -> list[dict]:
    return _parse_logs(50)


@app.get("/agent/status")
async def agent_status() -> dict:
    return _status_summary()


@app.get("/agent/proofs")
async def agent_proofs() -> dict:
    return _build_proofs()


@app.post("/agent/run")
async def run_agent(payload: dict) -> dict:
    python_executable = os.getenv("PYTHON_EXECUTABLE", sys.executable)
    cmd = [
        python_executable,
        "agent/consumer_agent.py",
        "--type",
        str(payload.get("type", "inference")),
        "--tokens",
        str(payload.get("tokens", 100)),
        "--payload",
        str(payload.get("payload", "demo")),
    ]
    proc = subprocess.Popen(cmd, cwd=str(ROOT))
    return {"started": True, "pid": proc.pid}


@app.get("/agent/settings")
async def agent_settings() -> dict:
    return _load_settings()


@app.post("/agent/settings")
async def update_agent_settings(payload: dict) -> dict:
    normalized: dict[str, Any] = {}
    for key, value in payload.items():
        if key in {"daily_budget_microalgo", "max_job_tokens"}:
            normalized[key] = _to_int(str(value), _default_settings()[key])
        elif key in {"default_task_type", "provider_endpoint", "agent_bridge_url"}:
            normalized[key] = str(value)
    saved = _save_settings(normalized)
    return {"ok": True, "settings": saved}
