# KINETIC - P2P Algorand Compute Marketplace

A decentralized marketplace for high-performance computing resources built on the Algorand blockchain. Provision GPUs, CPUs, and storage instantly with cryptographic proof of compute and automated payments.

## 🌟 Features

- **Decentralized Compute Marketplace**: Browse and rent GPU/CPU resources from independent providers
- **Algorand Smart Contracts**: Escrow, registry, and badge minting contracts
- **Proof of Compute**: Cryptographic verification of work completion
- **Automated Payments**: Machine-to-machine payment streams via Algorand
- **Agent-Based Orchestration**: Autonomous job matching and execution
- **Modern UI**: Kinetic design system with glassmorphism and quantum aesthetics
- **Wallet Integration**: Pera Wallet and Defly support

## 🏗️ Architecture

```
p2p-compute-marketplace/
├── web/              # Static HTML frontend with Stitch design system
├── api/              # FastAPI backend
├── agent/            # Autonomous agent for job orchestration
├── contracts/        # Algorand smart contracts (PyTeal)
└── scripts/          # Deployment and utility scripts
```

### Components

1. **Frontend (Static HTML + Vanilla JS)**
   - Stitch Algorand Compute Exchange design system
   - Tailwind CSS via CDN
   - Wallet integration (Pera, Defly)
   - Real-time provider marketplace
   - Transaction ledger and activity monitoring

2. **Backend API (FastAPI)**
   - Provider registration and discovery
   - Job submission and execution
   - Payment verification
   - Heartbeat and telemetry

3. **Agent (Python)**
   - Autonomous job matching
   - Budget management
   - Proof verification
   - Payment orchestration

4. **Smart Contracts (Algorand)**
   - Provider Registry
   - Escrow Contract
   - Badge Minter (reputation system)

## 🚀 Quick Start

### Prerequisites

- Python 3.8+
- Algorand wallet (Pera or Defly)
- AlgoKit (optional, for contract deployment)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd p2p-compute-marketplace
```

2. **Setup Environment**
```bash
# Create virtual environment
python -m venv .venv

# Activate (Windows PowerShell)
.\.venv\Scripts\Activate.ps1

# Activate (Linux/Mac)
source .venv/bin/activate

# Install dependencies
pip install -e .

# Configure environment
cp .env.example .env
# Edit .env with your configuration
```

3. **Start the Marketplace**

**Option 1: One-Command Startup (Recommended)**

Windows PowerShell:
```powershell
.\start_marketplace.ps1
```

Linux/Mac:
```bash
chmod +x start_marketplace.sh
./start_marketplace.sh
```

**Option 2: Manual Startup**

Terminal 1 - Backend API:
```bash
python -m uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
```

Terminal 2 - Frontend Server:
```bash
python web/server.py
```

4. **Access the Application**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## 📖 Usage

### As a Consumer

1. **Connect Wallet**: Click "Connect Wallet" and select Pera or Defly
2. **Browse Providers**: Navigate to the marketplace to see available compute resources
3. **Provision Resources**: Select a provider and click "Rent" to start a compute job
4. **Monitor Activity**: View real-time job progress and proofs in the Activity page
5. **Track Spending**: Check transaction history and balance in Transactions page

### As a Provider

1. **Register**: Configure your provider details in `.env`
```env
PROVIDER_WALLET=YOUR_ALGORAND_ADDRESS
PROVIDER_GPU_MODEL=RTX4090
PROVIDER_VRAM_GB=24
PROVIDER_ENDPOINT=https://your-endpoint.com
```

2. **Start Provider API**
```bash
python -m uvicorn api.main:app --host 0.0.0.0 --port 8000
```

3. **Register on Chain**: Deploy provider info to the registry contract
```bash
python scripts/register_provider.py
```

### Running the Agent

The agent autonomously matches jobs and manages payments:

```bash
python -m agent.orchestrator
```

Configure agent settings:
```env
AGENT_WALLET_MNEMONIC=your 25 word mnemonic
AGENT_MAX_BUDGET_ALGO=100
AGENT_JOB_REQUIREMENTS={"gpu_model": "RTX4090", "min_vram_gb": 16}
```

## 🔧 Configuration

### Environment Variables

**Backend (.env)**
```env
# Algorand
ALGOD_SERVER=https://testnet-api.algonode.cloud
ALGOD_TOKEN=
INDEXER_SERVER=https://testnet-idx.algonode.cloud

# Provider
PROVIDER_WALLET=YOUR_ADDRESS
PROVIDER_GPU_MODEL=RTX4090
PROVIDER_VRAM_GB=24
PROVIDER_ENDPOINT=https://your-endpoint.com
JOB_PRICE_PER_TOKEN_MICROALGO=100

# Agent
AGENT_WALLET_MNEMONIC=your mnemonic
AGENT_MAX_BUDGET_ALGO=100
```

**Frontend**

The frontend automatically detects the API URL:
- Development: http://localhost:8000
- Production: Same origin as frontend

No additional configuration needed.

## 📝 Smart Contracts

### Provider Registry
Stores provider information and reputation scores.

### Escrow Contract
Holds funds in escrow until job completion is verified.

### Badge Minter
Issues reputation badges (NFTs) to providers based on performance.

### Deployment

```bash
# Deploy all contracts
python contracts/deploy.py

# Or use AlgoKit
algokit deploy
```

## 🧪 Testing

```bash
# Backend tests
pytest

# Test API endpoints
curl http://localhost:8000/health
curl http://localhost:8000/providers
```

## 📊 API Documentation

Once the backend is running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### Key Endpoints

- `GET /providers` - List all providers
- `POST /job` - Submit a compute job
- `GET /agent/status` - Agent status
- `GET /telemetry` - Provider telemetry
- `GET /health` - Health check

## 🎨 Design System

The frontend uses the **Stitch Algorand Compute Exchange** design system:

- **Colors**: Deep obsidian backgrounds (#131314) with electric cyan accents (#00f5ff, #e9feff)
- **Typography**: Space Grotesk (headlines), Inter (body), JetBrains Mono (code)
- **Effects**: Glassmorphism, gradients, and subtle animations
- **Layout**: Spatial layering with nested surface containers
- **Philosophy**: "The Quantum Ledger" - high-end editorial feel for blockchain infrastructure

See `web/README.md` and `stitch_algorand_compute_exchange/algorand_compute_terminal/DESIGN.md` for detailed design guidelines.

## 🔐 Security

- All transactions are signed with Algorand wallets
- Smart contracts enforce payment and verification logic
- Provider endpoints can be protected with X-402 payment headers
- Agent wallets should use separate accounts with limited funds

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- Algorand Foundation for blockchain infrastructure
- AlgoKit for development tools
- Stitch design system for UI inspiration

## 📞 Support

- Documentation: [Link to docs]
- Issues: [GitHub Issues]
- Discord: [Community link]

---

Built with ❤️ on Algorand
