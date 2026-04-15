# Kinetic Marketplace - Project Structure

## Directory Overview

```
p2p-compute-marketplace/
├── agent/                  # Autonomous agent system
│   ├── consumer_agent.py   # Main consumer agent
│   ├── job_matcher.py      # Job matching logic
│   ├── orchestrator.py     # Job orchestration
│   ├── verifier.py         # Result verification
│   └── wallet.py           # Wallet management
│
├── api/                    # Backend API (FastAPI)
│   ├── main.py             # Main API server
│   ├── agent_bridge.py     # Agent bridge API
│   ├── heartbeat.py        # Health monitoring
│   ├── job_history.py      # Job tracking
│   ├── job_runner.py       # Job execution
│   ├── payment_verifier.py # Payment validation
│   ├── proof_system.py     # Proof of compute
│   ├── realtime.py         # SSE streaming
│   ├── wallet_utils.py     # Wallet utilities
│   ├── x402_middleware.py  # HTTP 402 payment
│   └── index.py            # Vercel entry point
│
├── contracts/              # Algorand smart contracts
│   ├── badge.py            # Badge minting
│   ├── escrow.py           # Payment escrow
│   ├── registry.py         # Provider registry
│   ├── deploy.py           # Deployment script
│   └── contracts/artifacts/ # Compiled contracts
│
├── docs/                   # Documentation
│   ├── DEPLOYMENT.md       # Deployment guide
│   ├── PROOF_SYSTEM.md     # Proof system docs
│   ├── QUICKSTART.md       # Quick start guide
│   └── REALTIME_IMPLEMENTATION.md
│
├── scripts/                # Utility scripts
│   ├── fund_accounts.py    # Fund test accounts
│   ├── mint_badges.py      # Mint badges
│   ├── register_provider.py # Register providers
│   └── verification_system.py # Verification
│
├── web/                    # Frontend (Vite + Vanilla JS)
│   ├── static/
│   │   ├── js/
│   │   │   ├── app.js      # Main app logic
│   │   │   ├── activity.js # Activity page
│   │   │   ├── wallet.js   # Wallet integration
│   │   │   ├── realtime.js # SSE client
│   │   │   └── config.js   # API configuration
│   │   └── css/            # Styles
│   ├── index.html          # Homepage
│   ├── activity.html       # Activity monitor
│   ├── dashboard.html      # Dashboard
│   └── wallet.html         # Wallet page
│
├── .env.example            # Environment template
├── .gitignore              # Git ignore rules
├── .vercelignore           # Vercel ignore rules
├── docker-compose.yml      # Docker setup
├── pyproject.toml          # Python project config
├── requirements.txt        # Python dependencies
├── vercel.json             # Vercel configuration
├── README.md               # Main documentation
├── VERCEL_DEPLOYMENT.md    # Vercel deployment guide
└── LICENSE                 # MIT License
```

## Key Files

### Configuration
- `.env` - Environment variables (not in repo)
- `.env.example` - Environment template
- `vercel.json` - Vercel deployment config
- `pyproject.toml` - Python project metadata

### Startup Scripts
- `setup.sh` / `setup.ps1` - Initial setup
- `start_marketplace.sh` / `start_marketplace.ps1` - Start backend + frontend
- `start_agent_bridge.sh` / `start_agent_bridge.ps1` - Start agent bridge
- `start_all_services.ps1` - Start all services (Windows)

### Deployment
- `deploy-vercel.ps1` - Quick Vercel deployment
- `VERCEL_DEPLOYMENT.md` - Deployment guide

## Technology Stack

### Backend
- **FastAPI** - Modern Python web framework
- **Uvicorn** - ASGI server
- **sse-starlette** - Server-Sent Events
- **py-algorand-sdk** - Algorand integration

### Frontend
- **Vite** - Build tool
- **Vanilla JavaScript** - ES modules
- **Tailwind CSS** - Styling
- **Pera Wallet** - Algorand wallet

### Blockchain
- **Algorand** - Layer 1 blockchain
- **PyTeal** - Smart contract language
- **AlgoNode** - Public API nodes

### Deployment
- **Vercel** - Serverless hosting
- **Docker** - Containerization (optional)

## Development Workflow

### Local Development
1. Start backend: `python -m uvicorn api.main:app --reload`
2. Start agent bridge: `python -m uvicorn api.agent_bridge:app --port 3001 --reload`
3. Start frontend: `cd web && npm run dev`

### Testing
- Backend: `http://localhost:8000/docs`
- Agent Bridge: `http://localhost:3001/agent/status`
- Frontend: `http://localhost:3000`

### Deployment
1. Push to GitHub
2. Connect to Vercel
3. Configure environment variables
4. Deploy

## Environment Variables

See `.env.example` for required variables:
- `PROVIDER_WALLET` - Algorand address
- `PROVIDER_MNEMONIC` - 25-word phrase
- `ALGOD_URL` - Algorand node URL
- `BADGE_APP_ID` - Badge contract ID
- `REGISTRY_APP_ID` - Registry contract ID
- `ESCROW_APP_ID` - Escrow contract ID

## Important Notes

### Security
- Never commit `.env` file
- Use TestNet for development
- Rotate keys regularly

### Database
- SQLite for local development
- Use external DB for production

### Serverless Limitations
- 10s timeout on Vercel Hobby
- No persistent storage
- Cold starts possible

## Getting Started

See `README.md` for detailed setup instructions.
