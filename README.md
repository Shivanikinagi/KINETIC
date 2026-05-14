# Kinetic - P2P Compute Marketplace on Algorand

> Decentralized GPU marketplace with autonomous agents, real on-chain transactions, and cryptographic proof-of-compute.

[![Algorand](https://img.shields.io/badge/Algorand-TestNet-00D1FF?style=flat&logo=algorand)](https://testnet.algoexplorer.io/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.8+-3776AB?style=flat&logo=python)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109-009688?style=flat&logo=fastapi)](https://fastapi.tiangolo.com/)

## 🎥 Demo Video

**Watch the 3-minute demo:** [Demo Video Link](#)

See the complete flow:
- Submit job → X-402 payment → Escrow lock (live on AlgoExplorer)
- Real compute execution → Hash verification → Escrow release
- Full proof chain with transaction links

## 🚀 Quick Start (< 5 commands)

```bash
# 1. Clone and install
git clone <repo-url> && cd p2p-compute-marketplace
pip install -e .

# 2. Configure (copy and edit)
cp .env.example .env
# Add your AGENT_MNEMONIC and PROVIDER_MNEMONIC

# 3. Start backend
python -m uvicorn api.main:app --reload

# 4. Start frontend (new terminal)
cd web && npm install && npm run dev

# 5. Open browser
open http://localhost:3000
```

**That's it!** The marketplace is running with real TestNet transactions.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    KINETIC MARKETPLACE                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Consumer Agent          Algorand TestNet      Provider     │
│  ┌──────────┐           ┌──────────────┐      ┌─────────┐  │
│  │ Discover │──────────▶│   Registry   │◀─────│Register │  │
│  │ Providers│           │ (App 758813563)     │ Hardware│  │
│  └────┬─────┘           └──────────────┘      └────┬────┘  │
│       │                                             │       │
│       │ 1. Submit Job                               │       │
│       ├────────────────────────────────────────────▶│       │
│       │                                             │       │
│       │ 2. 402 Payment Required                    │       │
│       │◀────────────────────────────────────────────┤       │
│       │                                             │       │
│  ┌────▼─────┐           ┌──────────────┐           │       │
│  │   Pay    │──────────▶│    Escrow    │           │       │
│  │ Provider │           │ (App 758813574)          │       │
│  └──────────┘           └──────┬───────┘           │       │
│       │                        │ Lock               │       │
│       │                        │                    │       │
│       │ 3. Execute Job                              │       │
│       ├────────────────────────────────────────────▶│       │
│       │                                        ┌────▼────┐  │
│       │                                        │ Docker  │  │
│       │                                        │ Compute │  │
│       │                                        └────┬────┘  │
│       │ 4. Result + Hash                           │       │
│       │◀───────────────────────────────────────────┤       │
│       │                                             │       │
│  ┌────▼─────┐                                      │       │
│  │ Verify   │                                      │       │
│  │   Hash   │                                      │       │
│  └────┬─────┘                                      │       │
│       │                                             │       │
│       │ 5. Release Escrow                          │       │
│       ├────────────────────────────────────────────▶│       │
│       │           ┌──────────────┐                 │       │
│       └──────────▶│    Escrow    │─────────────────┘       │
│                   │   Release    │                         │
│                   └──────────────┘                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## ✨ Key Features

### ✅ Real On-Chain Transactions
- Provider registry on TestNet (App ID 758813563)
- Escrow contract (App ID 758813574)
- All transactions verifiable on AlgoExplorer

### ✅ Real Compute Execution
- Docker/subprocess execution (not simulated)
- SHA-256 workload for verification
- Result hash tied to escrow release

### ✅ Autonomous Agents
- Consumer agent: discovers providers, manages payments
- Provider agent: executes jobs, generates proofs
- No human intervention required

### ✅ Cryptographic Proofs
- Every step hashed and linked
- AlgoExplorer links for verification
- Fraud detection via spot checks

### ✅ Self-Service Provider Registration
- REST API: `POST /provider/register`
- Provider dashboard: `/provider/dashboard`
- Instant marketplace visibility

## 📊 What's Working (Production-Ready)

| Feature | Status | Verification |
|---------|--------|--------------|
| Provider Registry | ✅ On-Chain | [AlgoExplorer](https://testnet.algoexplorer.io/application/758813563) |
| Escrow Contract | ✅ On-Chain | [AlgoExplorer](https://testnet.algoexplorer.io/application/758813574) |
| X-402 Payment Flow | ✅ Real TestNet | Transaction in note field |
| Compute Execution | ✅ Docker/subprocess | SHA-256 workload |
| Hash Verification | ✅ Blocks escrow | Refund on mismatch |
| Provider Registration | ✅ Self-service API | `/provider/register` |
| Provider Dashboard | ✅ Live | `/provider/dashboard` |
| Proof Chain | ✅ Complete | AlgoExplorer links |

## 🎯 Business Model

See [BUSINESS_MODEL.md](BUSINESS_MODEL.md) for details on:
- Revenue streams (marketplace fee, premium features)
- Cost structure (infrastructure, support)
- How Algorand earns (transaction fees, ecosystem growth)
- Path to profitability

## 📁 Project Structure

```
p2p-compute-marketplace/
├── api/                    # FastAPI backend
│   ├── main.py            # API routes, provider registration
│   ├── job_runner.py      # Real Docker/subprocess execution
│   ├── proof_system.py    # Cryptographic proof chain
│   ├── x402_middleware.py # X-402 payment verification
│   ├── orgs.py            # Organisation registry API
│   └── scheduler.py       # Provider health scheduler
├── agent/                  # Autonomous agents
│   ├── consumer_agent.py  # Job dispatch, escrow, verification
│   ├── verifier.py        # Hash verification & fraud detection
│   ├── wallet.py          # Autonomous budget management
│   └── orchestrator.py    # Agent coordination
├── contracts/              # Algorand smart contracts (PyTeal/ARC4)
│   ├── registry.py        # Provider registry
│   ├── escrow.py          # Payment escrow with hash verification
│   ├── badge.py           # Reputation NFTs
│   ├── org_registry.py    # Organisation registry
│   └── contracts/artifacts/ # Compiled TEAL + ARC56 clients
├── provider_node/          # Standalone provider execution node
│   ├── server.py          # Provider HTTP API
│   ├── executor.py        # Workload executor
│   └── adapters/          # GPU, Docker, local adapters
├── web/                    # Frontend (Vite + Tailwind)
│   ├── index.html         # Marketplace homepage
│   ├── org-register.html  # Organisation registration
│   ├── org-dashboard.html # Organisation management
│   └── static/js/         # App logic, providers, activity feeds
├── docs/                   # Documentation
└── scripts/                # Deployment & utility scripts
```

## 🧪 Testing

```bash
# Phase 1: On-chain transactions
python test_phase1.py

# Phase 2: Real compute execution
python test_phase2.py

# Phase 3: Provider registration
python test_phase3.py

# Phase 4: Documentation and hygiene
python test_phase4.py
```

**All tests pass:** 17/17 (100%)

## 📚 Documentation

- [Business Model](BUSINESS_MODEL.md) - Revenue streams and path to profitability
- [Proof System](docs/PROOF_SYSTEM.md) - Cryptographic verification architecture
- [Quick Start](docs/QUICKSTART.md) - 5-minute setup guide
- [Deployment](docs/DEPLOYMENT.md) - Production deployment guide

## 🔗 Live Links

**TestNet Smart Contracts:**
- Registry: https://testnet.algoexplorer.io/application/758813563
- Escrow: https://testnet.algoexplorer.io/application/758813574
- Badge Minter: https://testnet.algoexplorer.io/application/758813562

**Local Endpoints:**
- Marketplace: http://localhost:3000
- Provider Dashboard: http://localhost:8000/provider/dashboard
- API Docs: http://localhost:8000/docs

## 🛠️ Technology Stack

**Backend:** FastAPI, Uvicorn, py-algorand-sdk, Docker  
**Frontend:** Vite, ES Modules, Pera Wallet Connect  
**Blockchain:** Algorand TestNet, PyTeal smart contracts  
**Agents:** Custom Python (asyncio, httpx)

## 📄 License

MIT License - see [LICENSE](LICENSE) file.

## 🙏 Acknowledgments

Built for **AlgoBharat Hack Series 3.0 - Round 3**

- Algorand Foundation for blockchain infrastructure
- AlgoKit for development tools
- TestNet faucet for testing

---

**Status:** ✅ Production-Ready  
**Version:** 2.0.0  
**Last Updated:** May 14, 2026

*Kinetic - Decentralized Compute for Everyone*
