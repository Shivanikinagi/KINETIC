# KINETIC API Reference

Complete API documentation for the KINETIC decentralized compute marketplace.

---

## Hub API (Port 8000)

Base URL: `http://localhost:8000`

### Health & Status

#### `GET /health`
Hub health check and wallet status.

**Response:**
```json
{
    "status": "running",
    "version": "1.3.0",
    "wallet_balance": 1000000,
    "providers_registered": 3,
    "uptime_seconds": 7200
}
```

---

### Provider Management

#### `GET /providers`
List all providers registered on-chain in the Algorand Registry contract.

**Response:**
```json
{
    "providers": [
        {
            "address": "ALGO_ADDRESS...",
            "gpu_model": "T4",
            "vram_gb": 16,
            "price_per_hour": 500000,
            "endpoint": "https://provider.ngrok.io",
            "org_name": "My GPU Farm"
        }
    ]
}
```

#### `POST /provider/register`
Register a new provider on-chain.

**Request:**
```json
{
    "gpu_model": "T4",
    "vram_gb": 16,
    "price_per_hour": 0.5,
    "endpoint": "https://provider.ngrok.io",
    "provider_mnemonic": "25 word mnemonic...",
    "org_name": "My GPU Farm",
    "logo_url": "https://example.com/logo.png"
}
```

**Response:**
```json
{
    "tx_id": "ABCD1234...",
    "provider_address": "ALGO_ADDRESS...",
    "explorer_url": "https://testnet.algoexplorer.io/tx/ABCD1234"
}
```

#### `POST /providers/heartbeat`
Accept a heartbeat from a remote provider node. Providers should POST every 30s.

**Request:**
```json
{
    "endpoint": "https://provider.ngrok.io",
    "vram_gb": 16,
    "gpu_model": "T4",
    "gpu_available": true,
    "node_id": "colab-gpu-t4"
}
```

**Response:**
```json
{
    "status": "ok",
    "registered": "https://provider.ngrok.io"
}
```

#### `GET /providers/nodes`
List all registered provider nodes with health status.

**Response:**
```json
{
    "providers": [
        {
            "endpoint": "https://provider.ngrok.io",
            "vram_gb": 16,
            "gpu_model": "T4",
            "current_load": 1,
            "health_score": 95,
            "last_seen": 1716000000.0,
            "consecutive_failures": 0,
            "total_jobs": 42,
            "circuit_open": false
        }
    ],
    "stats": {
        "queue_size": 0,
        "running_jobs": 1,
        "completed_jobs": 42,
        "active_providers": 2,
        "total_providers": 3
    }
}
```

---

### Job Submission

#### `POST /job`
Submit a compute job. Returns 402 Payment Required if X-402 payment flow is active.

**Request:**
```json
{
    "type": "inference",
    "payload": "Hello world",
    "tokens": 500,
    "required_vram": 4,
    "provider_endpoint": "https://provider.ngrok.io"
}
```

**Response (direct execution):**
```json
{
    "job_id": "550e8400-e29b-41d4-a716-446655440000",
    "result_hash": "a1b2c3d4...",
    "output": "computed result (truncated to 200 chars)...",
    "compute_output": "full output...",
    "tokens_processed": 500,
    "duration_ms": 1234,
    "execution_method": "remote:colab-gpu-t4:gpu_inference"
}
```

**Response (402 Payment Required):**
```json
{
    "error": "payment_required",
    "job_id": "550e8400...",
    "payment": {
        "amount_microalgo": 50000,
        "receiver": "ALGO_PROVIDER_ADDRESS...",
        "network": "algorand-testnet",
        "note": "p2p-compute:550e8400-..."
    }
}
```

---

### Hub Exploration

#### `GET /hub/explore`
Search and filter available providers.

**Query Parameters:**
- `gpu_model` — Filter by GPU model (e.g., `T4`, `A100`)
- `min_vram` — Minimum VRAM in GB
- `max_price` — Maximum price per hour in ALGO

#### `GET /hub/templates`
Browse available job templates.

#### `POST /hub/templates/{template_id}/deploy`
Deploy a job template to a provider.

---

### Scheduler

#### `GET /scheduler/stats`
Get scheduler queue and provider statistics.

**Response:**
```json
{
    "queue_size": 3,
    "running_jobs": 2,
    "completed_jobs": 150,
    "active_providers": 4,
    "total_providers": 5
}
```

---

## Provider Node API (Port 5001)

Base URL: `http://localhost:5001`

### Health & Capabilities

#### `GET /health`
Provider health check.

**Response:**
```json
{
    "status": "active",
    "node_id": "colab-gpu-t4",
    "gpu_model": "Tesla T4",
    "vram_gb": 15.0,
    "gpu_available": true,
    "uptime_seconds": 3600,
    "jobs_running": 0,
    "jobs_completed": 42,
    "docker_enabled": false,
    "timestamp": "2026-05-14T12:00:00Z"
}
```

#### `GET /capabilities`
Detailed hardware and capability report.

**Response:**
```json
{
    "node_id": "colab-gpu-t4",
    "gpu_model": "Tesla T4",
    "vram_gb": 16,
    "gpu_available": true,
    "gpu_count": 1,
    "cuda_version": "12.2",
    "compute_capability": "7.5",
    "docker_available": false,
    "supported_tasks": ["sha256_compute", "inference", "gpu_matmul", "python_exec"],
    "max_concurrent_jobs": 3,
    "wallet": "ALGO_ADDRESS...",
    "stats": {
        "jobs_completed": 42,
        "jobs_failed": 1,
        "avg_compute_ms": 250,
        "uptime_seconds": 3600
    }
}
```

#### `GET /providers/me`
Hub-compatible provider info (used by consumer agent).

---

### Job Execution

#### `POST /job`
Execute a compute job.

**Request:**
```json
{
    "type": "sha256_compute",
    "payload": "input data",
    "tokens": 100,
    "job_id": "optional-uuid"
}
```

**Task Types:**
| Type | Description | GPU |
|------|-------------|-----|
| `sha256_compute` | Deterministic SHA-256 hash chain | No |
| `inference` | Transformer tensor computation | Yes |
| `gpu_matmul` | Matrix multiplication | Yes |
| `python_exec` | Run Python script (requires `script` field) | No |

**Response:**
```json
{
    "job_id": "550e8400-...",
    "result_hash": "657a9746...",
    "output": "1c506e18...",
    "compute_output": "1c506e18...",
    "tokens_processed": 100,
    "duration_ms": 15,
    "execution_method": "cpu_sha256",
    "proof_hash": "e444db19...",
    "node_id": "colab-gpu-t4"
}
```

#### `GET /job/{job_id}/status`
Check job status.

**Response:**
```json
{
    "job_id": "550e8400-...",
    "status": "completed",
    "result_hash": "657a9746...",
    "duration_ms": 15
}
```

---

## Algorand Smart Contracts

### Registry Contract (App ID: 758813563)

| Method | Description |
|--------|-------------|
| `register_provider(gpu_model, vram_gb, price_per_hour, endpoint)` | Register provider on-chain |
| `update_provider(...)` | Update provider metadata |
| `deregister_provider()` | Remove provider from registry |
| `get_provider(address)` | Query provider info from box storage |

### Escrow Contract (App ID: 758813574)

| Method | Description |
|--------|-------------|
| `lock_payment(job_id, provider, expected_proof_hash, timeout)` | Lock funds for a job |
| `release_payment(job_id, proof_hash)` | Release to provider after verification |
| `refund_consumer(job_id)` | Refund after timeout or fraud detection |

---

## Authentication

### X-402 Payment Flow

1. Consumer sends `POST /job` without payment
2. Hub returns `402 Payment Required` with payment details
3. Consumer sends Algorand payment transaction
4. Consumer re-sends `POST /job` with `X-Payment-Proof` header
5. Hub verifies payment and executes the job

### HMAC Request Signing

When `HUB_SECRET` is set:
- Hub adds `X-Hub-Signature: sha256=<hmac>` to job requests
- Provider verifies HMAC(body, secret) before executing

---

## Error Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad request (missing fields) |
| 402 | Payment required |
| 403 | Invalid signature (HMAC check failed) |
| 404 | Job not found |
| 500 | Execution error |
