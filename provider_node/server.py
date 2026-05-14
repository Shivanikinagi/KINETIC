"""
KINETIC Provider Node — Standalone Server

A lightweight Flask server that can run on ANY machine to join the
KINETIC decentralized compute network as a provider.

Usage (local):
    python -m provider_node.server

Usage (Colab / remote):
    Set environment variables, then run this file.

Environment Variables:
    NODE_ID             Unique node identifier (auto-generated if empty)
    GPU_MODEL           GPU model name for registry (e.g. "T4", "RTX4090")
    VRAM_GB             GPU VRAM in GB (e.g. "16")
    PORT                Server port (default 5001)
    PROVIDER_WALLET     Algorand wallet address for payments
    HUB_URL             KINETIC hub URL for registration
    HUB_SECRET          Shared secret for HMAC request verification
    ENABLE_DOCKER       "true" to enable Docker sandboxed execution
"""

from __future__ import annotations

import hashlib
import hmac
import json
import os
import time
import uuid
from datetime import datetime, timezone
from typing import Any

from flask import Flask, Response, jsonify, request

from provider_node.executor import execute_workload, get_gpu_info

app = Flask(__name__)

# ── Configuration ────────────────────────────────────────────────────────────

NODE_ID = os.getenv("NODE_ID", f"node-{uuid.uuid4().hex[:8]}")
GPU_MODEL = os.getenv("GPU_MODEL", "CPU")
VRAM_GB = int(os.getenv("VRAM_GB", "0"))
PROVIDER_WALLET = os.getenv("PROVIDER_WALLET", "")
HUB_URL = os.getenv("HUB_URL", "http://localhost:8000")
HUB_SECRET = os.getenv("HUB_SECRET", "")
ENABLE_DOCKER = os.getenv("ENABLE_DOCKER", "false").lower() == "true"

# In-memory stores
_jobs: dict[str, dict[str, Any]] = {}
_stats = {
    "start_time": time.time(),
    "jobs_completed": 0,
    "jobs_failed": 0,
    "total_compute_ms": 0,
}


# ── Request authentication ───────────────────────────────────────────────────

def _verify_hub_signature() -> bool:
    """Verify the request HMAC signature if HUB_SECRET is set."""
    if not HUB_SECRET:
        return True  # Skip verification if no secret configured
    signature = request.headers.get("X-Hub-Signature", "")
    body = request.get_data()
    expected = hmac.new(
        HUB_SECRET.encode(), body, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(signature, f"sha256={expected}")


# ── Endpoints ────────────────────────────────────────────────────────────────

@app.route("/health")
def health() -> Response:
    """Health check — used by hub for heartbeat monitoring."""
    gpu_info = get_gpu_info()
    running = sum(1 for j in _jobs.values() if j.get("status") == "running")
    return jsonify({
        "status": "active",
        "node_id": NODE_ID,
        "gpu_model": gpu_info.get("gpu_name", GPU_MODEL),
        "vram_gb": gpu_info.get("vram_gb", VRAM_GB),
        "gpu_available": gpu_info.get("gpu_available", False),
        "uptime_seconds": int(time.time() - _stats["start_time"]),
        "jobs_running": running,
        "jobs_completed": _stats["jobs_completed"],
        "docker_enabled": ENABLE_DOCKER,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })


@app.route("/capabilities")
def capabilities() -> Response:
    """Detailed hardware and capability report."""
    gpu_info = get_gpu_info()

    docker_ok = False
    if ENABLE_DOCKER:
        try:
            import subprocess
            result = subprocess.run(
                ["docker", "--version"], capture_output=True, timeout=5
            )
            docker_ok = result.returncode == 0
        except Exception:
            pass

    return jsonify({
        "node_id": NODE_ID,
        "gpu_model": gpu_info.get("gpu_name", GPU_MODEL),
        "vram_gb": gpu_info.get("vram_gb", VRAM_GB),
        "gpu_available": gpu_info.get("gpu_available", False),
        "gpu_count": gpu_info.get("gpu_count", 0),
        "cuda_version": gpu_info.get("cuda_version", "N/A"),
        "compute_capability": gpu_info.get("compute_capability", "N/A"),
        "docker_available": docker_ok,
        "supported_tasks": [
            "sha256_compute",
            "inference",
            "python_exec",
            "gpu_matmul",
        ],
        "max_concurrent_jobs": 3,
        "wallet": PROVIDER_WALLET,
        "stats": {
            "jobs_completed": _stats["jobs_completed"],
            "jobs_failed": _stats["jobs_failed"],
            "avg_compute_ms": (
                round(_stats["total_compute_ms"] / max(1, _stats["jobs_completed"]))
            ),
            "uptime_seconds": int(time.time() - _stats["start_time"]),
        },
    })


@app.route("/providers/me")
def providers_me() -> Response:
    """
    Compatibility endpoint — matches the hub's /providers/me format
    so the consumer agent can query live provider info.
    """
    gpu_info = get_gpu_info()
    return jsonify({
        "vram_gb": gpu_info.get("vram_gb", VRAM_GB),
        "gpu_model": gpu_info.get("gpu_name", GPU_MODEL),
        "price_per_hour": int(os.getenv("JOB_PRICE_PER_TOKEN_MICROALGO", "100")),
        "endpoint": "",  # Self — filled by consumer
        "uptime_score": 100,
        "payment_address": PROVIDER_WALLET,
        "wallet": PROVIDER_WALLET,
        "node_id": NODE_ID,
    })


@app.route("/job", methods=["POST"])
def submit_job() -> tuple[Response, int]:
    """
    Execute a compute job.

    Expects JSON body:
      { "type": "inference", "payload": "...", "tokens": 500, "job_id": "..." }

    Returns:
      { "job_id", "result_hash", "output", "duration_ms", "execution_method", ... }
    """
    # Verify request authenticity
    if not _verify_hub_signature():
        return jsonify({"error": "invalid_signature"}), 403

    data = request.json or {}
    job_id = data.get("job_id") or str(uuid.uuid4())

    # Mark as running
    _jobs[job_id] = {"status": "running", "started_at": time.time()}

    try:
        # Execute the workload
        result = execute_workload(data)

        # Build proof hash (ties job_id + result + node together)
        proof_hash = hashlib.sha256(json.dumps({
            "job_id": job_id,
            "result_hash": result["result_hash"],
            "node_id": NODE_ID,
            "timestamp": time.time(),
        }, sort_keys=True).encode()).hexdigest()

        response = {
            "job_id": job_id,
            "result_hash": result["result_hash"],
            "output": result["output"][:200],
            "compute_output": result["output"],
            "tokens_processed": int(data.get("tokens", 0)),
            "duration_ms": result.get("duration_ms", 0),
            "execution_method": result["method"],
            "proof_hash": proof_hash,
            "node_id": NODE_ID,
        }

        # Update stats
        _jobs[job_id] = {**response, "status": "completed"}
        _stats["jobs_completed"] += 1
        _stats["total_compute_ms"] += result.get("duration_ms", 0)

        return jsonify(response), 200

    except Exception as exc:
        _jobs[job_id] = {"status": "failed", "error": str(exc)}
        _stats["jobs_failed"] += 1
        return jsonify({
            "job_id": job_id,
            "error": str(exc),
            "status": "failed",
            "node_id": NODE_ID,
        }), 500


@app.route("/job/<job_id>/status")
def job_status(job_id: str) -> tuple[Response, int]:
    """Poll the status of a submitted job."""
    job = _jobs.get(job_id)
    if not job:
        return jsonify({"error": "not_found", "job_id": job_id}), 404
    return jsonify({
        "job_id": job_id,
        "status": job.get("status", "unknown"),
        "result_hash": job.get("result_hash", ""),
        "duration_ms": job.get("duration_ms", 0),
    }), 200


# ── Startup banner ───────────────────────────────────────────────────────────

def _print_banner():
    gpu_info = get_gpu_info()
    gpu_name = gpu_info.get("gpu_name", "None")
    gpu_vram = gpu_info.get("vram_gb", 0)
    print("\n" + "=" * 60)
    print("  KINETIC Provider Node")
    print("=" * 60)
    print(f"  Node ID     : {NODE_ID}")
    print(f"  GPU         : {gpu_name} ({gpu_vram} GB)")
    print(f"  GPU Ready   : {gpu_info.get('gpu_available', False)}")
    print(f"  Docker      : {'Enabled' if ENABLE_DOCKER else 'Disabled'}")
    print(f"  Wallet      : {PROVIDER_WALLET[:16]}..." if PROVIDER_WALLET else "  Wallet      : Not configured")
    print(f"  Hub         : {HUB_URL}")
    print(f"  Auth        : {'HMAC enabled' if HUB_SECRET else 'Open (no secret)'}")
    print("=" * 60)
    print("  Endpoints:")
    print("    GET  /health        - Health check")
    print("    GET  /capabilities  - Hardware info")
    print("    GET  /providers/me  - Provider info (hub compat)")
    print("    POST /job           - Submit compute job")
    print("    GET  /job/<id>/status - Job status")
    print("=" * 60 + "\n")


# ── Entry point ──────────────────────────────────────────────────────────────

def main():
    port = int(os.getenv("PORT", "5001"))
    _print_banner()
    app.run(host="0.0.0.0", port=port, debug=False)


if __name__ == "__main__":
    main()
