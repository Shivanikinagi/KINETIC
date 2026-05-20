# Kinetic — Decentralized GPU Compute Marketplace on Algorand

> **The "Hugging Face for GPU Compute."** Browse, compare, and instantly deploy containerized AI/ML workloads to decentralized providers. Payments locked in Algorand smart-contract escrow. Proofs verified on-chain.

[![Algorand](https://img.shields.io/badge/Algorand-TestNet-00D1FF?style=flat&logo=algorand)](https://testnet.explorer.perawallet.app/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=flat&logo=python)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109-009688?style=flat&logo=fastapi)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react)](https://react.dev)

**Built for AlgoBharat Hack Series 3.0 — Round 3**

---

## Demo

- **Frontend**: `http://localhost:5173` (run `npm run dev` in `/web`)
- **Backend API**: `http://localhost:8000` (run `uvicorn api.main:app --reload`)
- **Network**: Algorand TestNet

---

## Smart Contracts (TestNet)

| Contract | App ID | Explorer |
|----------|--------|----------|
| **Provider Registry** | `758813563` | [View](https://testnet.explorer.perawallet.app/application/758813563) |
| **Escrow** | `758813574` | [View](https://testnet.explorer.perawallet.app/application/758813574) |
| **Badge Minter** | `758813562` | [View](https://testnet.explorer.perawallet.app/application/758813562) |

**Deployer**: `ZGAC4DCYMBOBJ6Z35O2Y3G6IYPMZD72YHXZ6PUD7AKHT3OWPBXCMLQPHPQ`

See [docs/CONTRACTS.md](docs/CONTRACTS.md) for full transaction history and deployment details.

---

## Architecture

```
React SPA (Vite)  <--->  FastAPI Backend  <--->  Algorand TestNet
    |                        |                           |
    |                   Job Runner                     |
    |              (Docker / Subprocess)               |
    |                        |                           |
    |                   SQLite DB                      |
    |              (Jobs, Providers)                   |
    |                        |                           |
    +---------------- Proof Submitter -----------------+
                           |
                    Autonomous Agent
              (Discovery, Escrow, Verify)
```

**Tech Stack**: React 18 + TypeScript + Tailwind + FastAPI + SQLite + algosdk + PyTeal

---

## Key Features

1. **10 Interactive AI Spaces** — Chat, Image Gen, Code Copilot, Translation, Sentiment, NER, Summarization, TTS, Vision, Audio
2. **Real Compute Execution** — Jobs run actual SHA-256 workloads via subprocess/Docker
3. **On-Chain Proofs** — Every completed job submits a 0-ALGO tx with proof hash to Algorand TestNet
4. **Smart Contract Escrow** — Payment lock/release via PyTeal contracts
5. **Provider Registry** — On-chain provider listings with box storage
6. **Pera Wallet** — One-click wallet connect for TestNet payments
7. **Autonomous Agent** — Self-driving compute marketplace with x402 M2M payments, fraud detection, and circuit breakers

---

## Quick Start

```bash
# Backend
cd p2p-compute-marketplace
pip install -e .
uvicorn api.main:app --reload --port 8000

# Frontend
cd web
npm install
npm run dev
```

See [docs/QUICKSTART.md](docs/QUICKSTART.md) for detailed setup.

---

## Documentation

| Document | Description |
|----------|-------------|
| [CONTRACTS.md](docs/CONTRACTS.md) | All App IDs, tx hashes, explorer links |
| [GTM_PLAN.md](docs/GTM_PLAN.md) | Go-to-market strategy & monetization |
| [USER_PERSONA.md](docs/USER_PERSONA.md) | Target users & validation |

---

## Ecosystem Integrations

- **x402** — Micro-payment gate for M2M agent transactions
- **Pera SDK** — Wallet connection for TestNet payments

---

## License

MIT
