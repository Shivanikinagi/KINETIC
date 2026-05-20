# Kinetic — Decentralized GPU Compute Marketplace on Algorand

> **The "Hugging Face for GPU Compute."** Browse, compare, and instantly deploy containerized AI/ML workloads to decentralized providers. Payments locked in Algorand smart-contract escrow. Proofs verified on-chain.

[![Algorand](https://img.shields.io/badge/Algorand-TestNet-00D1FF?style=flat&logo=algorand)](https://testnet.explorer.perawallet.app/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=flat&logo=python)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109-009688?style=flat&logo=fastapi)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react)](https://react.dev)

**Built for AlgoBharat Hack Series 3.0 — Round 3**

---

## 🎥 Demo Video

**[Watch the 5-minute Demo Walkthrough](https://www.loom.com/share/placeholder)** *(replace with your actual Loom/YouTube link before submission)*

The demo covers:
1. **Consumer Flow** — Browsing the GPU catalog, filtering by VRAM & price, selecting a template
2. **Job Submission** — Configuring Docker image, command, GPU/CPU/RAM requirements, and deploying
3. **Real Execution** — Live compute runs locally via subprocess/Docker sandbox with SHA-256 proof generation
4. **Proof Verification** — Cryptographic result hash stored in SQLite with on-chain tx linking
5. **Provider Registration** — Onboarding a GPU node (with or without on-chain mnemonic)
6. **Wallet Connection** — Pera Wallet integration for TestNet payments

---

## 📖 Documentation

| Document | Description |
|----------|-------------|
| [GTM Plan & Monetization](docs/GTM_PLAN.md) | Target users, revenue model, 3-phase go-to-market |
| [Business Model](docs/GTM_PLAN.md#4-monetization-hypothesis--revenue-model) | Path to profitability: 2-5% protocol fee + premium placement staking |
| [Smart Contracts](contracts/) | PyTeal/TEAL source + deployment scripts |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           KINETIC MARKETPLACE                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   React SPA (Vite)        FastAPI Backend          Algorand TestNet         │
│   ┌──────────────┐       ┌────────────────┐       ┌──────────────────┐     │
│   │  Hub         │◄─────►│  /providers    │◄─────►│ Provider Registry │     │
│   │  Explore GPUs │       │  /job          │       │  App: 758813563   │     │
│   │  Submit Job  │◄─────►│  /analytics    │       └──────────────────┘     │
│   │  My Jobs     │       │  /activity     │                              │
│   │  Dashboard   │       └────────────────┘       ┌──────────────────┐     │
│   │  Provide     │              │                 │ Escrow Contract  │     │
│   │  Activity    │              ▼                 │  App: 758813574  │     │
│   └──────────────┘       ┌────────────────┐       └──────────────────┘     │
│          │               │ Job Runner     │                              │
│          │               │ (Docker /      │       ┌──────────────────┐     │
│          │               │  Subprocess)   │       │ Badge Minter     │     │
│          │               └────────────────┘       │  App: 758813562  │     │
│          │                      │                 └──────────────────┘     │
│          │                      ▼                                          │
│          │               ┌────────────────┐                               │
│          └──────────────►│ SQLite DB      │                               │
│                          │ (jobs, local   │                               │
│                          │  providers)    │                               │
│                          └────────────────┘                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18 + TypeScript + Tailwind CSS + Vite + React Router |
| **Backend** | FastAPI (Python 3.10+) + Uvicorn |
| **Database** | SQLite (jobs history, local provider registry, analytics) |
| **Wallet** | Pera Wallet SDK (@perawallet/connect) + algosdk |
| **Contracts** | PyTeal / TEAL (compiled with puyapy) |
| **Network** | Algorand TestNet |

---

## ✨ Key Features

### 1. Real Compute Execution
- Jobs run actual CPU workloads (iterative SHA-256 hashing) via Python subprocess or Docker sandbox
- Result hashes are cryptographically verifiable
- Execution time, method, and output are all recorded

**Example Real Execution:**
```json
{
  "job_id": "demo_1779266190",
  "result_hash": "5ac03d17bbe030d75e5cc4ac378e14853570ab3b5d8adc055801db633289a078",
  "tokens_processed": 500,
  "duration_ms": 2046,
  "execution_method": "subprocess",
  "output": "c0edcd114b02dbef2872e8566ef14d3eba916ec54e5c0c9efc06cf731bddeda0"
}
```

### 2. On-Chain Smart Contracts (TestNet)
Three contracts deployed and funded on Algorand TestNet:

| Contract | App ID | Explorer Link |
|----------|--------|---------------|
| **Provider Registry** | `758813563` | [View on Pera Explorer](https://testnet.explorer.perawallet.app/application/758813563) |
| **Escrow** | `758813574` | [View on Pera Explorer](https://testnet.explorer.perawallet.app/application/758813574) |
| **Badge Minter** | `758813562` | [View on Pera Explorer](https://testnet.explorer.perawallet.app/application/758813562) |

### 3. Provider Registration (On-Chain + Local Fallback)
- Providers can register with a 25-word Algorand mnemonic for **on-chain listing** in the Registry contract
- **Without a mnemonic**, providers still register instantly in the local SQLite DB and appear in the marketplace immediately
- This ensures the demo works out-of-the-box while supporting full decentralization

### 4. React SPA Frontend
- **7 pages**: Hub, Explore GPUs, Submit Job, My Jobs, Dashboard, Provide, Activity
- **Dark theme** with glassmorphism, cyan accents, Space Grotesk + Inter fonts
- **Responsive** — works on desktop and mobile
- **No `.html` extensions** — clean React Router SPA routing

### 5. Pera Wallet Integration
- One-click wallet connect via Pera Wallet SDK
- Displays connected address with disconnect option
- Handles redirect back to the app after mobile wallet approval

---

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- Docker (optional — for containerized execution)

### 1. Clone & Install Backend

```bash
git clone https://github.com/Shivanikinagi/KINETIC.git
cd KINETIC/p2p-compute-marketplace
python -m venv .venv
# Windows:
.\.venv\Scripts\Activate.ps1
# macOS/Linux:
source .venv/bin/activate
pip install -e .
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:
```env
# Required for hackathon demo (bypasses payment gate)
X402_ENABLED=false

# Algorand TestNet contracts (already deployed)
REGISTRY_APP_ID=758813563
ESCROW_APP_ID=758813574
BADGE_APP_ID=758813562

# Optional: add mnemonics for on-chain provider registration
# ADMIN_MNEMONIC=...
# PROVIDER_MNEMONIC=...
```

### 3. Start Backend

```bash
uvicorn api.main:app --reload --port 8000
```

### 4. Start Frontend

```bash
cd web
npm install
npm run dev
```

Open http://localhost:3000

---

## 🧪 Testing the Flow

### Submit a Job
1. Go to **Submit Job** → select "Inference" template
2. Fill Docker image: `pytorch/pytorch:2.0-cuda11.7-cudnn8-runtime`
3. Fill command: `python inference.py --model model.pt`
4. Click **Deploy Job**
5. See real execution result with proof hash

### Register a Provider
1. Go to **Provide** → fill GPU model, VRAM, price
2. Leave mnemonic blank for instant local registration
3. Or add a TestNet mnemonic for on-chain registration
4. See your provider in **Explore GPUs** immediately

### Connect Wallet
1. Click **Connect Wallet** in the navbar
2. Scan QR with Pera Wallet mobile app
3. Your address appears — you're ready for TestNet payments

---

## 📊 Business Model & GTM

### Revenue Model
Kinetic takes a **protocol fee** on every completed job:
- **2-5% marketplace fee** encoded in the escrow smart contract
- **Premium placement staking** — providers stake ALGO to boost search ranking
- **Enterprise SLA** — fixed monthly fee for dedicated clusters

### Go-To-Market (3 Phases)

| Phase | Timeline | Target | Action |
|-------|----------|--------|--------|
| **1. Hackers & Web3 Natives** | Months 1-3 | Algorand devs, hackathon participants | Free tier via community grant; partner with DoraHacks |
| **2. Open Marketplace** | Months 3-6 | AI startups, rendering studios | Verified org badges; HuggingFace integration; benchmark content |
| **3. Institutional Scale** | Months 6+ | Enterprise AI, universities | Fiat on-ramp; USD→ALGO/USDC routing; ZK proofs for privacy |

### Why Algorand?
1. **Sub-second finality** (3.3s block time) — providers don't wait minutes for payment verification
2. **$0.001 txn fees** — micro-compute jobs (10-second inference) remain economically viable
3. **TEAL smart contracts** — complex escrow logic with cryptographic proof verification

Read the full [GTM Plan](docs/GTM_PLAN.md).

---

## 📁 Repository Structure

```
p2p-compute-marketplace/
├── api/                    # FastAPI backend
│   ├── main.py             # Core routes: /providers, /job, /analytics, /activity
│   ├── hub.py              # Template catalog, provider profiles, reviews
│   ├── job_runner.py       # Real compute execution (Docker / subprocess)
│   ├── job_history.py      # SQLite persistence for jobs + analytics
│   ├── x402_middleware.py  # Payment gate (bypass with X402_ENABLED=false)
│   └── ...
├── web/                    # React SPA frontend
│   ├── src/
│   │   ├── pages/          # 7 page components (Hub, Explore, SubmitJob, ...)
│   │   ├── components/     # Navbar, Footer, ProviderCard, StatusBadge
│   │   ├── hooks/          # useWallet (Pera Wallet context)
│   │   └── lib/api.ts      # Typed API client
│   └── vite.config.ts      # Proxy config for backend
├── contracts/              # PyTeal / TEAL smart contracts
│   ├── registry.py         # Provider Registry contract
│   ├── escrow.py           # Payment escrow contract
│   ├── badge.py            # Verification badge NFT minter
│   └── deploy.py           # Deployment script (Algokit)
├── docs/
│   └── GTM_PLAN.md         # Go-to-market strategy
├── data/                   # SQLite databases (auto-created)
└── README.md               # This file
```

---

## 🔗 Contract Details

### Smart Contracts (Algorand TestNet)

| Contract | App ID | Address | Purpose |
|----------|--------|---------|---------|
| **Provider Registry** | `758813563` | [App Address](https://testnet.explorer.perawallet.app/application/758813563) | On-chain provider listings with box storage |
| **Escrow** | `758813574` | [App Address](https://testnet.explorer.perawallet.app/application/758813574) | Payment lock & release per job |
| **Badge Minter** | `758813562` | [App Address](https://testnet.explorer.perawallet.app/application/758813562) | ARC-3 SBT verification badges |

### Contract Features
- **Registry**: Stores provider metadata (GPU model, VRAM, price, endpoint) in Algorand box storage keyed by provider address
- **Escrow**: Locks consumer payment in micro-ALGO, releases to provider upon verified job completion
- **Badge Minter**: Issues non-transferable verification SBTs to trusted providers

---

## 📸 Screenshots

> *(Add screenshots of Hub, Submit Job, and Activity feed here before submission)*

| Hub | Submit Job | Activity |
|-----|------------|----------|
| ![Hub](docs/screenshots/hub.png) | ![Submit](docs/screenshots/submit.png) | ![Activity](docs/screenshots/activity.png) |

---

## 📄 License

MIT License — see [LICENSE](LICENSE) file.

---

**Kinetic — Real Compute. Real Payments. Real Trust.**

*Built with ❤️ for AlgoBharat Hack Series 3.0*
