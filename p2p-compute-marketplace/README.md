# Kinetic - Decentralized GPU Compute Hub on Algorand

> **The "Hugging Face for GPU Compute."** Browse, compare, and instantly deploy containerized AI/ML workloads to decentralized providers via Algorand smart contract escrow.

[![Algorand](https://img.shields.io/badge/Algorand-TestNet-00D1FF?style=flat&logo=algorand)](https://testnet.algoexplorer.io/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.8+-3776AB?style=flat&logo=python)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109-009688?style=flat&logo=fastapi)](https://fastapi.tiangolo.com/)

**Built for AlgoBharat Hack Series 3.0 - Round 3**

---

## 🎥 Demo Video

**Watch the 5-minute Demo:** [Insert YouTube/Loom Link Here]

The demo covers:
- End-to-end flow: Searching for a GPU → Submitting a Docker payload → X-402 Escrow payment
- Real compute execution on a provider node with live logs
- Cryptographic proof generation and on-chain escrow release
- Provider registration flow

## 📖 Key Documentation

- [**GTM Plan & Monetization**](docs/GTM_PLAN.md) - Target users, revenue model, and why Algorand.
- [**Business Model**](BUSINESS_MODEL.md) - Deep dive into path to profitability.
- [**Proof System**](docs/PROOF_SYSTEM.md) - Cryptographic verification architecture.

---

## 🏗️ Architecture

Kinetic acts as a decentralized Serverless Compute Layer (FaaS) utilizing autonomous agents.

```
┌─────────────────────────────────────────────────────────────┐
│                    KINETIC MARKETPLACE                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Consumer Agent          Algorand TestNet      Provider     │
│  ┌──────────┐           ┌──────────────┐      ┌─────────┐   │
│  │ Discover │──────────▶│   Registry   │◀─────│Register │   │
│  │ Providers│           │ (App 758813563)     │ Hardware│   │
│  └────┬─────┘           └──────────────┘      └────┬────┘   │
│       │                                            │        │
│       │ 1. Submit Docker Job                       │        │
│       ├───────────────────────────────────────────▶│        │
│       │                                            │        │
│       │ 2. X-402 Payment Required                  │        │
│       │◀───────────────────────────────────────────┤        │
│       │                                            │        │
│  ┌────▼─────┐           ┌──────────────┐           │        │
│  │   Pay    │──────────▶│    Escrow    │           │        │
│  │ Provider │           │ (App 758813574)          │        │
│  └──────────┘           └──────┬───────┘           │        │
│       │                        │ Lock              │        │
│       │                        │                   │        │
│       │ 3. Execute Container                       │        │
│       ├───────────────────────────────────────────▶│        │
│       │                                       ┌────▼────┐   │
│       │                                       │ Docker  │   │
│       │                                       │ Sandbox │   │
│       │                                       └────┬────┘   │
│       │ 4. ZK Proof / Result Hash                  │        │
│       │◀───────────────────────────────────────────┤        │
│       │                                            │        │
│  ┌────▼─────┐                                      │        │
│  │ Verify   │                                      │        │
│  │   Hash   │                                      │        │
│  └────┬─────┘                                      │        │
│       │                                            │        │
│       │ 5. Release Escrow                          │        │
│       ├───────────────────────────────────────────▶│        │
│       │           ┌──────────────┐                 │        │
│       └──────────▶│    Escrow    │─────────────────┘        │
│                   │   Release    │                          │
│                   └──────────────┘                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## ✨ Features (Updates since Round 2)

### ✅ Complete UI/UX Overhaul
- Transformed from a basic "SHA-256 demo" to a generic "HuggingFace for GPU" Hub.
- **Submit Job UI:** Users can now specify Docker images, entrypoint commands, required VRAM, and Dataset URLs.
- **Unified Dashboard:** Consolidated tracking of running containers, logs, and cryptographic proofs.

### ✅ Generic Compute Execution
- Moved beyond simulated tasks. Provider nodes now isolate and run arbitrary payloads in secure Docker containers.

### ✅ Real On-Chain Transactions
- **Provider Registry:** Live on TestNet (`758813563`).
- **Escrow Contract:** Live on TestNet (`758813574`).
- **X-402 Payment Flow:** Real M2M payments via the autonomous agent bridge.

---

## 🚀 Quick Setup Guide

### Requirements
- Python 3.10+
- Node.js 18+
- Docker (for provider execution)

### Steps

```bash
# 1. Clone and install backend
git clone <repo-url> && cd p2p-compute-marketplace
python -m venv .venv
source .venv/bin/activate  # On Windows: .\.venv\Scripts\Activate.ps1
pip install -e .

# 2. Configure Environment
cp .env.example .env
# Important: Add your AGENT_MNEMONIC and PROVIDER_MNEMONIC to the .env file

# 3. Start the Backend API & Agent Bridge
python -m uvicorn api.main:app --port 8000 --reload &
python -m uvicorn agent.api_bridge:app --port 3001 --reload &

# 4. Start the Frontend
cd web
npm install
npm run dev

# 5. Open Browser
# The Vite server will launch at http://localhost:3000
```

---

## 🔗 Contract Details & Integrations

### Smart Contracts (Algorand TestNet)
- **Registry App ID:** `758813563`
- **Escrow App ID:** `758813574`
- **Badge NFT Minter:** `758813562`

### Ecosystem Integrations
- **X-402:** Custom implementation of machine-to-machine payment headers for autonomous agent negotiation.
- **Pera Wallet SDK:** Integrated into the frontend for seamless consumer wallet connection and manual escrow funding when not using agentic mode.
- **Algorand Indexer:** Used for dynamic, on-chain discovery of active provider nodes.

---

## 📁 Repository Structure

```text
p2p-compute-marketplace/
├── api/                    # FastAPI backend (Marketplace Hub)
├── agent/                  # Autonomous Agents (Consumer/Provider negotiation)
├── contracts/              # PyTeal/ARC4 Smart Contracts
├── provider_node/          # Standalone hardware execution node (Docker Sandbox)
├── web/                    # Vite + Tailwind Frontend
│   ├── index.html          # GPU Hub (Landing)
│   ├── explore.html        # Provider Discovery
│   ├── submit.html         # Job Submission Form
│   ├── jobs.html           # Active Jobs Dashboard
│   ├── provide.html        # Provider Onboarding
│   └── static/js/          # Shared App Logic
└── docs/                   # GTM Plan, Architecture, API Ref
```

## 📄 License
MIT License - see [LICENSE](LICENSE) file.

---
*Kinetic - Real Compute. Real Payments. Real Trust.*
