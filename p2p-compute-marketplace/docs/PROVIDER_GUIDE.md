# KINETIC Provider Guide

Run your own compute provider node and earn ALGO by selling GPU/CPU compute on the KINETIC decentralized marketplace.

## Quick Start

### Option 1: Run Locally (CPU)

```bash
cd p2p-compute-marketplace
python -m provider_node.server
```

Server starts on `http://localhost:5001` with these endpoints:
- `GET /health` - Health check
- `GET /capabilities` - Hardware specs
- `POST /job` - Execute compute job
- `GET /job/<id>/status` - Job status

### Option 2: Google Colab (Free T4 GPU)

1. Open [Google Colab](https://colab.research.google.com/)
2. Upload `colab/kinetic_provider.ipynb`
3. Set runtime to **GPU** (Runtime > Change runtime type > T4 GPU)
4. Fill in your Algorand wallet in Cell 2
5. Run all cells
6. Copy the ngrok URL and register with the hub

### Option 3: Docker

```bash
cd p2p-compute-marketplace
docker build -f provider_node/Dockerfile -t kinetic-provider .
docker run -p 5001:5001 -e NODE_ID=my-node kinetic-provider
```

### Option 4: Cloud VM (RunPod, AWS, GCP)

```bash
# SSH into your GPU VM
git clone <your-repo>
cd p2p-compute-marketplace
pip install -r provider_node/requirements.txt
NODE_ID=my-gpu-vm GPU_MODEL=A100 VRAM_GB=80 python -m provider_node.server
```

---

## Configuration

Set these environment variables to customize your provider:

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ID` | Auto-generated | Unique identifier for your node |
| `GPU_MODEL` | `CPU` | GPU model name (e.g., `T4`, `RTX4090`, `A100`) |
| `VRAM_GB` | `0` | GPU VRAM in GB |
| `PORT` | `5001` | Server port |
| `PROVIDER_WALLET` | (empty) | Your Algorand wallet address for payments |
| `HUB_URL` | `http://localhost:8000` | KINETIC hub URL |
| `HUB_SECRET` | (empty) | Shared secret for HMAC request signing |
| `ENABLE_DOCKER` | `false` | Enable Docker-sandboxed execution |

---

## Registration

### On-chain Registration

Register your provider on the Algorand blockchain so consumers can discover you:

```bash
# Set env vars
export HUB_URL=http://your-hub:8000
export GPU_MODEL=T4
export VRAM_GB=16
export PRICE_PER_HOUR=0.5
export PROVIDER_ENDPOINT=https://your-ngrok-url.ngrok-free.app
export PROVIDER_MNEMONIC="your 25 word algorand mnemonic"

python -m provider_node.register
```

### Heartbeat Registration

Your provider should also send periodic heartbeats to the hub:

```python
import requests

requests.post("http://hub:8000/providers/heartbeat", json={
    "endpoint": "https://your-provider-url",
    "vram_gb": 16,
    "gpu_model": "T4",
    "gpu_available": True,
    "node_id": "my-node",
})
```

The Colab notebook does this automatically every 30 seconds.

---

## Supported Task Types

| Task Type | Description | GPU Required |
|-----------|-------------|--------------|
| `sha256_compute` | Deterministic SHA-256 hash chain (verifiable) | No |
| `inference` | Transformer-style tensor computation | Preferred |
| `gpu_matmul` | Matrix multiplication benchmark | Yes |
| `python_exec` | Execute arbitrary Python script | No |

---

## Execution Adapters

Provider nodes use pluggable adapters for workload execution:

| Adapter | File | Use Case |
|---------|------|----------|
| `LocalAdapter` | `adapters/local.py` | CPU execution (always available) |
| `DockerAdapter` | `adapters/docker.py` | Sandboxed containers with isolation |
| `GPUAdapter` | `adapters/gpu.py` | PyTorch CUDA GPU workloads |
| `RunPodAdapter` | `adapters/runpod.py` | Cloud GPU via RunPod API |

---

## Job API

### Submit a Job

```
POST /job
Content-Type: application/json

{
    "type": "sha256_compute",
    "payload": "Hello KINETIC",
    "tokens": 100,
    "job_id": "optional-uuid"
}
```

### Response

```json
{
    "job_id": "550e8400-...",
    "result_hash": "a1b2c3d4...",
    "output": "computed result...",
    "compute_output": "full output...",
    "tokens_processed": 100,
    "duration_ms": 15,
    "execution_method": "cpu_sha256",
    "proof_hash": "e5f6a7b8...",
    "node_id": "my-node"
}
```

---

## Security

### HMAC Request Signing

Set `HUB_SECRET` on both hub and provider to enable request signing:

```bash
export HUB_SECRET=my-secret-key
```

The hub sends `X-Hub-Signature: sha256=<hmac>` with each job request.
The provider verifies the HMAC before executing.

### Docker Sandbox

When `ENABLE_DOCKER=true`, workloads run in containers with:
- `--network none` — No network access
- `--read-only` — Read-only filesystem
- `--memory 512m` — Memory limit
- `--cpus 1.0` — CPU limit
- `--tmpfs /tmp:size=64m` — Small writable temp space

---

## Monitoring

### Health Endpoint

```bash
curl http://localhost:5001/health
```

Returns:
```json
{
    "status": "active",
    "node_id": "my-node",
    "gpu_model": "T4",
    "vram_gb": 16,
    "gpu_available": true,
    "uptime_seconds": 3600,
    "jobs_running": 1,
    "jobs_completed": 42
}
```

### Hub Monitoring

The hub monitors all providers via `/providers/nodes`:

```bash
curl http://localhost:8000/providers/nodes
```

---

## Economics

| Parameter | Value |
|-----------|-------|
| Platform fee | 5% of job cost |
| Minimum job price | 1,000 microALGO (0.001 ALGO) |
| Escrow timeout | ~60 seconds |
| Spot check rate | 10% of jobs |
| Payment | Automatic via Algorand escrow |

### Earnings Example

```
100 jobs/day x 0.1 ALGO/job = 10 ALGO/day
10 ALGO/day x 30 days = 300 ALGO/month
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `UnicodeEncodeError` on Windows | Set `PYTHONIOENCODING=utf-8` |
| Docker not found | Install Docker Desktop or use local execution |
| GPU not detected | Install PyTorch with CUDA: `pip install torch --index-url https://download.pytorch.org/whl/cu121` |
| ngrok connection reset | Re-run the Colab notebook to get a new tunnel |
| Provider not discoverable | Ensure heartbeat is running and hub URL is correct |
