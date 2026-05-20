"""Hub data store for Models, Datasets, Spaces, and API keys."""
from __future__ import annotations

import hashlib
import json
import secrets
import sqlite3
import time
import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

DB_PATH = Path(__file__).resolve().parents[1] / "data" / "hub.db"


def _ensure_db() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS models (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT NOT NULL DEFAULT '',
            tags TEXT NOT NULL DEFAULT '[]',
            readme TEXT NOT NULL DEFAULT '',
            owner TEXT NOT NULL DEFAULT 'anonymous',
            likes INTEGER NOT NULL DEFAULT 0,
            forks INTEGER NOT NULL DEFAULT 0,
            downloads INTEGER NOT NULL DEFAULT 0,
            versions TEXT NOT NULL DEFAULT '[]',
            license TEXT NOT NULL DEFAULT 'MIT',
            compute_req TEXT NOT NULL DEFAULT '',
            created_at REAL NOT NULL
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS datasets (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT NOT NULL DEFAULT '',
            tags TEXT NOT NULL DEFAULT '[]',
            owner TEXT NOT NULL DEFAULT 'anonymous',
            license TEXT NOT NULL DEFAULT 'MIT',
            file_count INTEGER NOT NULL DEFAULT 0,
            size_mb REAL NOT NULL DEFAULT 0,
            is_public INTEGER NOT NULL DEFAULT 1,
            versions TEXT NOT NULL DEFAULT '[]',
            created_at REAL NOT NULL
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS spaces (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT NOT NULL DEFAULT '',
            space_type TEXT NOT NULL DEFAULT 'demo',
            owner TEXT NOT NULL DEFAULT 'anonymous',
            url TEXT NOT NULL DEFAULT '',
            status TEXT NOT NULL DEFAULT 'running',
            likes INTEGER NOT NULL DEFAULT 0,
            compute_tokens INTEGER NOT NULL DEFAULT 0,
            created_at REAL NOT NULL
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS api_keys (
            key_id TEXT PRIMARY KEY,
            owner TEXT NOT NULL,
            key_hash TEXT NOT NULL,
            prefix TEXT NOT NULL,
            usage_count INTEGER NOT NULL DEFAULT 0,
            revoked INTEGER NOT NULL DEFAULT 0,
            created_at REAL NOT NULL
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS model_likes (
            model_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            created_at REAL NOT NULL,
            PRIMARY KEY (model_id, user_id)
        )
    """)
    conn.commit()
    return conn


# ── Models ─────────────────────────────────────────────────────────────────

def create_model(name: str, description: str = "", tags: list[str] = None, readme: str = "",
                 owner: str = "anonymous", license: str = "MIT", compute_req: str = "") -> dict[str, Any]:
    conn = _ensure_db()
    model_id = f"model_{uuid.uuid4().hex[:12]}"
    now = time.time()
    conn.execute(
        "INSERT INTO models (id, name, description, tags, readme, owner, license, compute_req, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (model_id, name, description, json.dumps(tags or []), readme, owner, license, compute_req, now)
    )
    conn.commit()
    conn.close()
    return {"id": model_id, "name": name, "created_at": now}


def list_models(q: str = "", tags: list[str] = None, sort: str = "likes") -> list[dict[str, Any]]:
    conn = _ensure_db()
    rows = conn.execute("SELECT * FROM models ORDER BY created_at DESC").fetchall()
    conn.close()
    cols = ["id", "name", "description", "tags", "readme", "owner", "likes", "forks", "downloads", "versions", "license", "compute_req", "created_at"]
    models = []
    for row in rows:
        m = dict(zip(cols, row))
        m["tags"] = json.loads(m["tags"])
        m["versions"] = json.loads(m["versions"])
        if q and q.lower() not in m["name"].lower() and q.lower() not in m["description"].lower():
            continue
        if tags and not any(t in m["tags"] for t in tags):
            continue
        models.append(m)
    if sort == "likes":
        models.sort(key=lambda x: x["likes"], reverse=True)
    elif sort == "downloads":
        models.sort(key=lambda x: x["downloads"], reverse=True)
    elif sort == "newest":
        models.sort(key=lambda x: x["created_at"], reverse=True)
    return models


def get_model(model_id: str) -> dict[str, Any] | None:
    conn = _ensure_db()
    row = conn.execute("SELECT * FROM models WHERE id=?", (model_id,)).fetchone()
    conn.close()
    if not row:
        return None
    cols = ["id", "name", "description", "tags", "readme", "owner", "likes", "forks", "downloads", "versions", "license", "compute_req", "created_at"]
    m = dict(zip(cols, row))
    m["tags"] = json.loads(m["tags"])
    m["versions"] = json.loads(m["versions"])
    return m


def like_model(model_id: str, user_id: str) -> dict[str, Any]:
    conn = _ensure_db()
    try:
        conn.execute("INSERT INTO model_likes (model_id, user_id, created_at) VALUES (?, ?, ?)",
                     (model_id, user_id, time.time()))
        conn.execute("UPDATE models SET likes = likes + 1 WHERE id=?", (model_id,))
        conn.commit()
        liked = True
    except sqlite3.IntegrityError:
        conn.execute("DELETE FROM model_likes WHERE model_id=? AND user_id=?", (model_id, user_id))
        conn.execute("UPDATE models SET likes = likes - 1 WHERE id=?", (model_id,))
        conn.commit()
        liked = False
    conn.close()
    return {"liked": liked, "model_id": model_id}


def fork_model(model_id: str, new_owner: str) -> dict[str, Any]:
    original = get_model(model_id)
    if not original:
        return {"error": "Model not found"}
    new_id = create_model(
        name=original["name"] + " (fork)",
        description=original["description"],
        tags=original["tags"],
        readme=original["readme"],
        owner=new_owner,
        license=original["license"],
        compute_req=original["compute_req"],
    )["id"]
    conn = _ensure_db()
    conn.execute("UPDATE models SET forks = forks + 1 WHERE id=?", (model_id,))
    conn.commit()
    conn.close()
    return {"fork_id": new_id, "original_id": model_id}


def increment_downloads(model_id: str) -> None:
    conn = _ensure_db()
    conn.execute("UPDATE models SET downloads = downloads + 1 WHERE id=?", (model_id,))
    conn.commit()
    conn.close()


# ── Datasets ───────────────────────────────────────────────────────────────

def create_dataset(name: str, description: str = "", tags: list[str] = None,
                   owner: str = "anonymous", license: str = "MIT",
                   file_count: int = 0, size_mb: float = 0, is_public: bool = True) -> dict[str, Any]:
    conn = _ensure_db()
    ds_id = f"dataset_{uuid.uuid4().hex[:12]}"
    now = time.time()
    conn.execute(
        "INSERT INTO datasets (id, name, description, tags, owner, license, file_count, size_mb, is_public, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (ds_id, name, description, json.dumps(tags or []), owner, license, file_count, size_mb, 1 if is_public else 0, now)
    )
    conn.commit()
    conn.close()
    return {"id": ds_id, "name": name, "created_at": now}


def list_datasets(q: str = "", sort: str = "newest") -> list[dict[str, Any]]:
    conn = _ensure_db()
    rows = conn.execute("SELECT * FROM datasets ORDER BY created_at DESC").fetchall()
    conn.close()
    cols = ["id", "name", "description", "tags", "owner", "license", "file_count", "size_mb", "is_public", "versions", "created_at"]
    datasets = []
    for row in rows:
        d = dict(zip(cols, row))
        d["tags"] = json.loads(d["tags"])
        d["versions"] = json.loads(d["versions"])
        if q and q.lower() not in d["name"].lower() and q.lower() not in d["description"].lower():
            continue
        datasets.append(d)
    if sort == "size":
        datasets.sort(key=lambda x: x["size_mb"], reverse=True)
    elif sort == "newest":
        datasets.sort(key=lambda x: x["created_at"], reverse=True)
    return datasets


def get_dataset(ds_id: str) -> dict[str, Any] | None:
    conn = _ensure_db()
    row = conn.execute("SELECT * FROM datasets WHERE id=?", (ds_id,)).fetchone()
    conn.close()
    if not row:
        return None
    cols = ["id", "name", "description", "tags", "owner", "license", "file_count", "size_mb", "is_public", "versions", "created_at"]
    d = dict(zip(cols, row))
    d["tags"] = json.loads(d["tags"])
    d["versions"] = json.loads(d["versions"])
    return d


# ── Spaces ─────────────────────────────────────────────────────────────────

def create_space(name: str, description: str = "", space_type: str = "demo",
                 owner: str = "anonymous", url: str = "", compute_tokens: int = 0) -> dict[str, Any]:
    conn = _ensure_db()
    sp_id = f"space_{uuid.uuid4().hex[:12]}"
    now = time.time()
    conn.execute(
        "INSERT INTO spaces (id, name, description, space_type, owner, url, compute_tokens, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        (sp_id, name, description, space_type, owner, url, compute_tokens, now)
    )
    conn.commit()
    conn.close()
    return {"id": sp_id, "name": name, "created_at": now}


def list_spaces(q: str = "", space_type: str = "", sort: str = "likes") -> list[dict[str, Any]]:
    conn = _ensure_db()
    rows = conn.execute("SELECT * FROM spaces ORDER BY created_at DESC").fetchall()
    conn.close()
    cols = ["id", "name", "description", "space_type", "owner", "url", "status", "likes", "compute_tokens", "created_at"]
    spaces = []
    for row in rows:
        s = dict(zip(cols, row))
        if q and q.lower() not in s["name"].lower():
            continue
        if space_type and s["space_type"] != space_type:
            continue
        spaces.append(s)
    if sort == "likes":
        spaces.sort(key=lambda x: x["likes"], reverse=True)
    elif sort == "newest":
        spaces.sort(key=lambda x: x["created_at"], reverse=True)
    return spaces


def get_space(sp_id: str) -> dict[str, Any] | None:
    conn = _ensure_db()
    row = conn.execute("SELECT * FROM spaces WHERE id=?", (sp_id,)).fetchone()
    conn.close()
    if not row:
        return None
    cols = ["id", "name", "description", "space_type", "owner", "url", "status", "likes", "compute_tokens", "created_at"]
    return dict(zip(cols, row))


# ── API Keys ───────────────────────────────────────────────────────────────

def create_api_key(owner: str) -> dict[str, Any]:
    conn = _ensure_db()
    raw = f"kh_{secrets.token_urlsafe(24)}"
    key_id = f"key_{uuid.uuid4().hex[:10]}"
    key_hash = hashlib.sha256(raw.encode()).hexdigest()
    now = time.time()
    conn.execute(
        "INSERT INTO api_keys (key_id, owner, key_hash, prefix, usage_count, created_at) VALUES (?, ?, ?, ?, 0, ?)",
        (key_id, owner, key_hash, raw[:10], now)
    )
    conn.commit()
    conn.close()
    return {"key_id": key_id, "api_key": raw, "prefix": raw[:10]}


def list_api_keys(owner: str) -> list[dict[str, Any]]:
    conn = _ensure_db()
    rows = conn.execute(
        "SELECT key_id, prefix, usage_count, revoked, created_at FROM api_keys WHERE owner=? ORDER BY created_at DESC",
        (owner,)
    ).fetchall()
    conn.close()
    return [{
        "key_id": r[0], "prefix": r[1], "usage_count": r[2], "revoked": bool(r[3]), "created_at": r[4]
    } for r in rows]


def revoke_api_key(key_id: str, owner: str) -> bool:
    conn = _ensure_db()
    cur = conn.execute("UPDATE api_keys SET revoked=1 WHERE key_id=? AND owner=?", (key_id, owner))
    conn.commit()
    conn.close()
    return cur.rowcount > 0


def verify_api_key(raw_key: str) -> dict[str, Any] | None:
    conn = _ensure_db()
    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
    row = conn.execute(
        "SELECT key_id, owner, usage_count FROM api_keys WHERE key_hash=? AND revoked=0",
        (key_hash,)
    ).fetchone()
    if row:
        conn.execute("UPDATE api_keys SET usage_count = usage_count + 1 WHERE key_hash=?", (key_hash,))
        conn.commit()
    conn.close()
    if not row:
        return None
    return {"key_id": row[0], "owner": row[1], "usage_count": row[2] + 1}


# Seed some demo data on first import
_ensure_db()
