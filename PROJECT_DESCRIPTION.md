# Kinetic — Detailed Project Description

> **The "Hugging Face for GPU Compute"**  
> A decentralized peer-to-peer GPU marketplace with Algorand blockchain escrow, cryptographic proof-of-compute verification, and a full AI model hub — built for real-world deployment.

---

## 1. Executive Summary

**Kinetic** is a decentralized GPU compute marketplace that connects AI/ML workload consumers with GPU providers worldwide. Built on the **Algorand blockchain**, it features smart-contract escrow payments, cryptographic proof-of-compute verification, and a comprehensive model/dataset/spaces ecosystem inspired by Hugging Face.

**Key Differentiator:** Unlike traditional cloud providers (AWS, GCP), Kinetic enables anyone with a GPU to earn passive income by renting their idle hardware, while consumers pay only for what they use with micro-ALGO transaction fees ($0.001 per tx) and 3.3-second finality.

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              KINETIC MARKETPLACE                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│   React 18 SPA (Vite)          FastAPI Backend           Algorand TestNet     │
│   ┌──────────────────┐        ┌──────────────────┐       ┌──────────────────┐   │
│   │  Hub / Landing   │◄─────►│  /providers      │◄─────►│ Provider Registry│   │
│   │  Explore GPUs    │        │  /job            │       │  App: 758813563  │   │
│   │  Submit Job      │◄─────►│  /analytics      │       └──────────────────┘   │
│   │  Model Hub       │        │  /activity       │                            │
│   │  Dataset Hub     │        │  /assistant      │       ┌──────────────────┐   │
│   │  Spaces          │        │  /agent          │       │ Escrow Contract  │   │
│   │  Wallet          │        └──────────────────┘       │  App: 758813574  │   │
│   │  Dashboard       │               │                   └──────────────────┘   │
│   │  Assistant       │               ▼                   ┌──────────────────┐   │
│   └──────────────────┘        ┌──────────────────┐       │ Badge Minter     │   │
│            │                    │ Job Runner     │       │  App: 758813562  │   │
│            │                    │ (Docker /      │       └──────────────────┘   │
│            │                    │  Subprocess)   │                            │
│            │                    └──────────────────┘                            │
│            │                           │                                       │
│            │                           ▼                                       │
│            └──────────────────►┌──────────────────┐                            │
│                                │ SQLite DB        │                            │
│                                │ (jobs, providers,│                            │
│                                │  models, logs)   │                            │
│                                └──────────────────┘                            │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18 + TypeScript + Tailwind CSS + Vite + React Router |
| **Backend** | FastAPI (Python 3.12) + Uvicorn + AsyncIO |
| **Database** | SQLite (jobs history, local provider registry, analytics, hub data) |
| **Blockchain** | Algorand TestNet (PyTeal/TEAL smart contracts via Algokit) |
| **Wallet** | Pera Wallet SDK (@perawallet/connect) + algosdk |
| **AI Agent** | Multi-LLM support (OpenAI, Anthropic, Grok, Groq, Local) |
| **Compute** | Docker containers + Python subprocess sandbox |

---

## 3. Phase 1 — Core MVP (Implemented)

### 3.1 Compute Execution
Every job runs **real compute** — not mocked results:
- **Docker Sandbox:** Jobs execute in isolated Python containers
- **Subprocess Fallback:** If Docker unavailable, runs via `asyncio.to_thread(subprocess)`
- **SHA-256 Proof:** Result is hashed and stored cryptographically
- **Live Monitoring:** Terminal-style execution UI with real-time log streaming
- **GPU Metrics:** Utilization % and VRAM usage displayed in animated progress bars
- **Escrow Status:** Real-time payment lock/release tracking

**Example Real Execution:**
```json
{
  "job_id": "inference_1779292857",
  "result_hash": "cdd722887fae1a54559cfbdc03aaae33de4281106e77ff49a7c0f535ee6476b3",
  "tokens_processed": 500,
  "duration_ms": 502,
  "execution_method": "subprocess",
  "status": "completed",
  "tx_id": "S6EI47SG64SUYAL3GHGODM4WK2E7TIDM5JTRDJUV2OGOFRXA4ASQ",
  "explorer_url": "https://testnet.explorer.perawallet.app/tx/S6EI47SG64SUYAL3GHGODM4WK2E7TIDM5JTRDJUV2OGOFRXA4ASQ"
}
```

### 3.2 GPU Marketplace
- **Provider Cards:** Glassmorphism design with gradient borders, hover lift animations
- **GPU Filters:** RTX 4090, A100, H100, RTX 3090, MI300X
- **VRAM Filters:** 8GB+, 16GB+, 24GB+, 40GB+, 80GB+
- **Reputation System:** Star ratings (1-5) + composite score (0-100)
- **Uptime Tracking:** Color-coded badges (>95% green, 90-95% amber, <90% red)
- **Online/Offline Status:** Animated pulse dots
- **Latency Display:** Network ping estimate per provider
- **Deploy Animation:** Rocket fly-out effect on button click
- **Skeleton Loaders:** Shimmer placeholders while data fetches

### 3.3 Landing Page (Hub)
- **Animated Compute Network:** 6 orbital GPU nodes with connection lines, glow effects, and satellite mini-nodes
- **Live Activity Ticker:** Marquee-style scrolling strip showing real-time stats
- **Trust Metrics:** Animated counters (Jobs Executed, GPU Providers, Verified %, ALGO Settled)
- **How It Works:** 4-step visual guide with connector lines and hover effects
- **Terminal Preview:** Syntax-colored console output simulating job execution flow
- **Blockchain Section:** Contract cards linking to Pera Explorer
- **Parallax Depth:** Background orbs translate at different rates on scroll

---

## 4. Phase 2 — Model Hub (Implemented)

### 4.1 Model Cards (Hugging Face Style)
- **Parameter Badges:** Auto-extracted 7B, 13B, 34B, 70B, 8x7B
- **Precision Badges:** FP16, BF16, INT8, INT4
- **License Badges:** Color-coded MIT, Apache-2.0, LLAMA3, GPL-3.0, etc.
- **Gradient Borders:** Visual distinction by category (LLM = cyan, Image = violet, Audio = amber)

### 4.2 Model Pages
- **README Renderer:** Markdown-like styling with headings, lists, code blocks
- **GPU Requirements:** Visual intensity bar showing VRAM needed
- **Pricing Estimate:** Calculated ALGO/hr and ALGO/day based on compute requirements
- **Benchmarks:** Mock tokens/sec, latency, memory metrics per hardware config
- **Usage Examples:** Copyable Python/Hugging Face/transformers code snippets
- **Action Buttons:** Run Inference → navigates to /submit pre-filled, Fine-tune, Deploy API

### 4.3 Discovery Features
- **Tabs:** Trending (by likes), Popular (by downloads), Recently Updated (by date)
- **Search Autocomplete:** Dropdown with clickable suggestions from model names/tags
- **Category Filters:** LLM, Image, Audio, Video, CV, Multimodal, Specialized
- **Similar Models:** Related recommendations based on tags/category in detail view
- **Fork Model:** Creates a copy with "(fork)" suffix, increments original fork count

### 4.4 Pre-seeded Models
34+ models including: Llama-3-8B/70B, Mistral-7B, Mixtral-8x7B, SDXL, FLUX.1, Whisper-v3, YOLOv8/v9, SAM-2, CLIP, Bark, MusicGen, AnimateDiff, LLaVA-1.6, CodeLlama, AlphaFold2, and more.

---

## 5. Phase 3 — Datasets & Spaces (Implemented)

### 5.1 Dataset Hub
- **Upload Form:** Name, description, tags, license, file count, size, public/private toggle, category
- **Preview Viewer:** Sample data table that varies by category:
  - Text: rows of text samples
  - Image: thumbnail grid
  - Audio: waveform placeholders
  - Tabular: CSV-style data rows
- **Train/Test/Val Split:** Visual colored bar with percentages
- **Category Filters:** Text, Image, Audio, Video, Tabular, Code
- **Search:** Autocomplete with tag suggestions
- **10 Demo Datasets** pre-seeded across categories

### 5.2 Spaces
- **Deploy AI Demo:** Modal with pre-configured types (Image Gen, Chatbot, Code Assistant, Audio)
- **Framework Badges:** Gradio (purple), Streamlit (red), Docker (blue), Static (gray)
- **Live Status:** Animated pulse dot showing running/stopped
- **Shareable URLs:** Auto-generated per space with copy button
- **Embed Support:** iframe code snippet with copy button
- **Category Filters:** Chat, Image, Audio, Code, Vision

---

## 6. Phase 4 — Developer Experience (Implemented)

### 6.1 API Platform
- **API Keys:** Generate, revoke, track usage count per key
- **Rate Limiting:** `ApiKeyRateLimitMiddleware` active on all routes
- **API Analytics:** Usage tracking per endpoint

### 6.2 Performance
- **Lazy Loading:** All pages except Hub use `React.lazy()` + `Suspense`
- **Code Splitting:** Vite builds separate JS chunks per route (14.88s build time)
- **Skeleton Screens:** Loading states on every data-fetching component

---

## 7. Phase 5 — Blockchain & Trust (Implemented)

### 7.1 Smart Contracts (Algorand TestNet)

| Contract | App ID | Purpose |
|----------|--------|---------|
| **Provider Registry** | 758813563 | On-chain provider listings with box storage |
| **Escrow** | 758813574 | Payment lock & release per job |
| **Badge Minter** | 758813562 | ARC-3 SBT verification badges |

### 7.2 Provider Trust Layer
- **Reputation Scoring:** Composite score from reviews, uptime, jobs completed
- **Review System:** POST `/providers/{id}/review` with 1-5 star rating + comment
- **Verified Badges:** SBT (Soulbound Token) checks via Badge Minter contract
- **Proof-of-Compute:** SHA-256 result hashes submitted on-chain

### 7.3 Wallet Dashboard
- **Balance Display:** ALGO amount + USD estimate (mock price)
- **Escrow History:** Table with status badges (locked/released/refunded)
- **Spending Analytics:** Toggle Daily/Weekly/Monthly — SVG bar chart
- **Provider Payouts:** Conditional section for GPU owners
- **Transaction List:** Type icons, colored amounts, timestamps, AlgoExplorer links
- **Deposit/Withdraw:** Mock modals with amount input and confirmation

### 7.4 Analytics Endpoints
- `GET /analytics/gpu-usage` — Hourly utilization data for charts
- `GET /analytics/revenue` — Provider payouts + consumer spending
- `GET /analytics/marketplace` — Active providers, jobs/day, avg price
- `GET /analytics/models` — Model usage by task_type

---

## 8. Phase 6 — AI Agents (Implemented)

### 8.1 Multi-LLM Backend
The assistant routes to 5+ LLM providers based on environment config:

| Provider | Env Var | Default Model |
|----------|---------|---------------|
| OpenAI | `OPENAI_API_KEY` | gpt-4o-mini |
| Anthropic | `ANTHROPIC_API_KEY` | claude-3-5-sonnet |
| xAI Grok | `GROK_API_KEY` | grok-beta |
| Groq | `GROQ_API_KEY` | llama3-70b-8192 |
| Local | `LOCAL_LLM_ENDPOINT` | llama3 (Ollama) |

### 8.2 Agent Capabilities
- **GPU Recommendation:** Analyzes workload → suggests optimal GPU with pricing
- **Cost Estimation:** Calculates `tokens × duration × rate = total ALGO`
- **Auto-Deploy Workflows:** 3-step visual progress cards (Queue → Execute → Verify)
- **Smart Provider Routing:** Shows cheapest, most reliable, and active count
- **Natural Language:** "Find cheapest RTX 4090 for SDXL fine-tuning"
- **Action Buttons:** Inline navigation to Explore, Submit, Models, Provide pages

### 8.3 Autonomous Agent Dashboard
- **Stats:** Jobs Today, ALGO Spent, Verifications Passed, Budget Remaining
- **Dispatch Form:** Task type, tokens, payload, provider endpoint (optional)
- **Live Logs:** Real-time streaming of agent decisions and actions
- **On-Chain Proofs:** Auto-fetched from Algorand Indexer

---

## 9. Database Schema

### Jobs Table (SQLite)
```sql
job_id TEXT PRIMARY KEY
consumer TEXT, provider TEXT
task_type TEXT, tokens INTEGER
status TEXT, progress INTEGER
gpu_utilization REAL, vram_usage REAL, vram_total REAL
escrow_status TEXT, cost_algo REAL
result_hash TEXT, tx_id TEXT
explorer_url TEXT
created_at REAL, completed_at REAL
```

### Job Logs Table
```sql
id INTEGER PRIMARY KEY AUTOINCREMENT
job_id TEXT, log_line TEXT, created_at REAL
```

### Provider Reviews
```sql
id INTEGER PRIMARY KEY AUTOINCREMENT
provider_id TEXT, reviewer_id TEXT
rating INTEGER (1-5), comment TEXT, created_at TEXT
```

### Models Table
```sql
id TEXT PRIMARY KEY, name TEXT, description TEXT
tags TEXT (JSON), readme TEXT, owner TEXT
likes INTEGER, forks INTEGER, downloads INTEGER
license TEXT, compute_req TEXT, created_at REAL
```

### Datasets & Spaces Tables
Similar schema with category, size, split percentages, framework type.

---

## 10. API Endpoints Summary

### Core
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | System health + provider wallet status |
| GET | `/providers` | List all providers (on-chain + local) |
| POST | `/provider/register` | Register new provider |
| POST | `/job` | Submit compute job |
| GET | `/jobs` | List recent jobs |
| GET | `/jobs/{id}` | Job detail with logs, GPU metrics, escrow |
| GET | `/jobs/{id}/logs` | All logs for a job |
| GET | `/jobs/{id}/stream` | SSE real-time updates |

### Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/analytics` | Aggregated marketplace stats |
| GET | `/analytics/gpu-usage` | Hourly GPU chart data |
| GET | `/analytics/revenue` | Revenue dashboard data |
| GET | `/analytics/marketplace` | Provider/job marketplace stats |
| GET | `/analytics/models` | Model usage analytics |

### Hub
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/models` | List/Create models |
| POST | `/models/{id}/like` | Like/unlike model |
| POST | `/models/{id}/fork` | Fork model |
| GET/POST | `/datasets` | List/Create datasets |
| GET/POST | `/spaces` | List/Create spaces |

### Agent & Assistant
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/agent/status` | Agent state summary |
| GET | `/agent/log` | Recent agent logs |
| GET | `/agent/proofs` | On-chain proof list |
| POST | `/agent/run` | Dispatch autonomous agent |
| POST | `/assistant/chat` | AI assistant chat |

### Wallet
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/wallet/{addr}/history` | Transaction history |
| GET | `/wallet/{addr}/stats` | Spending analytics |
| GET | `/escrow/{job_id}` | Escrow status detail |

---

## 11. Key Features at a Glance

| Feature | Status | Evidence |
|---------|--------|----------|
| Real Compute Execution | ✅ | Docker/subprocess SHA-256 hashing |
| On-Chain Escrow | ✅ | 3 deployed TestNet contracts |
| Cryptographic Proofs | ✅ | SHA-256 result hashes + tx linking |
| Live Log Streaming | ✅ | SSE `/jobs/{id}/stream` endpoint |
| GPU/VRAM Monitoring | ✅ | Animated progress bars on JobExecution |
| Pera Wallet Integration | ✅ | @perawallet/connect SDK |
| Provider Reputation | ✅ | Star ratings + review system |
| AI Assistant (5 LLMs) | ✅ | OpenAI, Claude, Grok, Groq, Local |
| Autonomous Agent | ✅ | Self-routing job dispatcher |
| Model Hub (34 models) | ✅ | Hugging Face-style cards |
| Dataset Hub | ✅ | Upload + preview + split support |
| Spaces | ✅ | Gradio/Streamlit deploy |
| Wallet Dashboard | ✅ | Escrow history + spending charts |
| Analytics Dashboard | ✅ | GPU usage, revenue, marketplace stats |
| Lazy Loading | ✅ | React.lazy() code splitting |
| Mobile Responsive | ✅ | All pages responsive |
| Skeleton Loaders | ✅ | Every data-fetching component |

---

## 12. File Structure

```
p2p-compute-marketplace/
├── api/                          # FastAPI backend
│   ├── main.py                   # Core routes + startup
│   ├── job_runner.py             # Real compute execution
│   ├── job_history.py            # DB models + analytics
│   ├── hub.py                    # Hub routes (explore, templates)
│   ├── hub_data.py               # Models, Datasets, Spaces CRUD
│   ├── assistant.py              # AI Assistant (5 LLM backends)
│   ├── agent_routes.py           # Autonomous Agent API
│   ├── realtime.py               # SSE streaming endpoints
│   ├── models.py                 # SQLAlchemy ORM models
│   ├── proof_submitter.py        # On-chain proof submission
│   ├── x402_middleware.py        # Payment gate middleware
│   ├── auth.py                   # Authentication routes
│   ├── orgs.py                   # Organization registry
│   ├── scheduler.py              # Provider health scheduler
│   ├── heartbeat.py              # Telemetry collection
│   ├── db.py                     # Database connection
│   └── ...
├── web/                          # React 18 SPA
│   ├── src/
│   │   ├── pages/                # Page components
│   │   │   ├── Hub.tsx           # Landing page
│   │   │   ├── Explore.tsx       # GPU marketplace
│   │   │   ├── JobExecution.tsx  # Live execution monitor
│   │   │   ├── Models.tsx        # Model Hub
│   │   │   ├── Datasets.tsx      # Dataset Hub
│   │   │   ├── Spaces.tsx        # AI Spaces
│   │   │   ├── Dashboard.tsx     # User dashboard
│   │   │   ├── Wallet.tsx        # Wallet dashboard
│   │   │   ├── Assistant.tsx     # AI Assistant chat
│   │   │   ├── AgentDashboard.tsx # Autonomous agent
│   │   │   └── spaces/           # Space demo pages (10+)
│   │   ├── components/           # Shared components
│   │   │   ├── Navbar.tsx        # Sticky nav + wallet
│   │   │   ├── Footer.tsx        # Footer + newsletter
│   │   │   ├── ProviderCard.tsx  # Provider card
│   │   │   └── StatusBadge.tsx   # Status badge
│   │   ├── hooks/
│   │   │   └── useWallet.tsx     # Pera Wallet context
│   │   ├── lib/
│   │   │   └── api.ts            # API client + types
│   │   ├── App.tsx               # Router + lazy loading
│   │   └── index.css             # Tailwind + animations
│   ├── vite.config.ts            # Vite proxy config
│   └── package.json
├── contracts/                    # PyTeal/TEAL smart contracts
│   ├── registry.py               # Provider Registry
│   ├── escrow.py                 # Payment Escrow
│   ├── badge.py                  # SBT Badge Minter
│   ├── deploy.py                 # Deployment script
│   └── contracts/artifacts/      # Compiled TEAL + ARC56 JSON
├── provider_node/                # Standalone provider node
│   ├── server.py                 # Provider HTTP server
│   ├── executor.py               # Job execution engine
│   ├── docker_worker.py          # Docker container runner
│   ├── register.py               # Provider registration
│   └── Dockerfile
├── agent/                        # Autonomous agent
│   └── consumer_agent.py         # Self-driving job buyer
├── docs/                         # Documentation
│   └── GTM_PLAN.md              # Go-to-market strategy
├── data/                         # SQLite databases (auto-created)
├── tests/                        # Pytest test suite
│   ├── test_escrow.py
│   ├── test_registry.py
│   ├── test_verification.py
│   └── ...
├── requirements.txt              # Python dependencies
├── pyproject.toml               # Package config
├── .env.example                 # Environment template
├── README.md                    # Main README
├── DEMO_SCRIPT.md               # Demo recording script
└── QUICK_START.md               # Quick start guide
```

---

## 13. Environment Configuration

Create `.env` from `.env.example`:

```env
# Algorand TestNet (already deployed)
REGISTRY_APP_ID=758813563
ESCROW_APP_ID=758813574
BADGE_APP_ID=758813562

# Payment (set false for hackathon demo)
X402_ENABLED=false

# AI Assistant (pick one)
LLM_PROVIDER=groq
GROQ_API_KEY=your_key_here

# Optional: Provider wallet
# PROVIDER_MNEMONIC=your 25-word mnemonic
```

---

## 14. How to Run Locally

```bash
# 1. Clone & setup backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1  # Windows
# source .venv/bin/activate    # macOS/Linux
pip install -e .

# 2. Configure environment
cp .env.example .env
# Edit .env with your API keys

# 3. Start backend
uvicorn api.main:app --reload --port 8000

# 4. Start frontend (new terminal)
cd web
npm install
npm run dev

# 5. Open http://localhost:5173
```

---

## 15. Testing & Verification

```bash
# Backend integration test
python test_e2e.py

# All endpoints audit
python test_all_endpoints.py

# Frontend build check
cd web && npm run build

# Pytest suite
pytest tests/
```

**Verified Results:**
- ✅ All 30+ API endpoints return `200 OK`
- ✅ Frontend builds in 14.88s with 0 TypeScript errors
- ✅ Job submission + execution + proof verification works end-to-end
- ✅ Real SHA-256 compute output with on-chain tx linking
- ✅ AI Assistant responds with provider cards + cost estimates

---

## 16. Future Roadmap

| Phase | Feature | Status |
|-------|---------|--------|
| Phase 1 | Core MVP (Compute + Marketplace + Landing) | ✅ Complete |
| Phase 2 | Model Hub (HF-style cards + benchmarks) | ✅ Complete |
| Phase 3 | Datasets & Spaces (Gradio/Streamlit) | ✅ Complete |
| Phase 4 | SDK, CLI, API Platform | 🔄 Partial |
| Phase 5 | ZK Proofs, Fiat On-ramp, Enterprise SLA | 📋 Planned |
| Phase 6 | Multi-chain Support (Ethereum, Solana) | 📋 Planned |

---

## 17. Contact & Links

- **GitHub:** github.com/Shivanikinagi/KINETIC
- **Demo:** http://localhost:5173 (local) / Vercel deployment
- **Contracts:** Algorand TestNet Apps 758813563, 758813574, 758813562
- **Built for:** AlgoBharat Hack Series 3.0 — Round 3

---

**Kinetic — Real Compute. Real Payments. Real Trust.**
