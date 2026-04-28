# Kinetic - The "Hugging Face" of P2P Compute

> A fully autonomous, peer-to-peer marketplace for high-performance computing resources built on the Algorand blockchain.

[![Algorand](https://img.shields.io/badge/Algorand-TestNet-00D1FF?style=flat&logo=algorand)](https://testnet.algoexplorer.io/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.8+-3776AB?style=flat&logo=python)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109-009688?style=flat&logo=fastapi)](https://fastapi.tiangolo.com/)

## 🌟 The Vision

Kinetic aims to be the **"Hugging Face" of decentralized compute**—a professional, high-trust marketplace where organizations and individuals seamlessly rent and supply GPU/CPU compute resources. 

Moving beyond traditional Web3 crypto protocols, Kinetic is designed for real-world business adoption. It bridges the gap between massive decentralized hardware networks and everyday AI researchers/DevOps engineers who just need one-click "Deploy Llama-3" templates without understanding smart contracts.

### Core Value Propositions
- **True P2P Architecture** - No central server. Providers and consumers connect directly, reducing overhead to near zero.
- **Organization-Grade Trust Model** - A manual verification/KYC system for professional hardware vendors to list their organizations, complete with branding and SLAs.
- **Autonomous Agents** - Zero human intervention. Agents handle the negotiation, execution, and verification dynamically.
- **Cryptographic Proofs** - Verifiable proof-of-compute (SHA-256) at every step, tied to ARC-3 Trust Badges.
- **Ephemeral Wallets** - Users generate local autonomous wallets that seamlessly interact with X-402 micro-transactions.

## 🏗️ Architecture & Decentralization

### Decentralized by Design

Kinetic operates as a truly decentralized network:

1. **Permissionless Provider Registration**
   - Any hardware operator can join by registering on-chain
   - No central authority approval needed
   - Provider info stored in Algorand smart contract

2. **Autonomous Discovery**
   - Consumer agents query blockchain registry
   - Automatic health checks and ranking
   - Direct P2P connection to best provider

3. **Ephemeral Wallets**
   - Users generate local autonomous wallets
   - Agents handle micro-transactions independently
   - No central wallet management

### Components

```
├── api/              # FastAPI backend with SSE
├── agent/            # Autonomous job orchestration
├── contracts/        # Algorand smart contracts (PyTeal)
├── web/              # Real-time frontend (Vite + ES modules)
└── docs/             # Documentation
```

## 🚀 Quick Start

### Prerequisites

- Python 3.8+
- Node.js 16+ (for frontend)
- Algorand wallet (Pera Wallet)

### Installation

```bash
# Clone repository
git clone <repository-url>
cd p2p-compute-marketplace

# Install Python dependencies
pip install -e .

# Install frontend dependencies
cd web
npm install
```

### Running

**Terminal 1 - Backend:**
```bash
python -m uvicorn api.main:app --reload
```

**Terminal 2 - Frontend:**
```bash
cd web
npm run dev
```

**Access:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## 🛣️ 18-Week Roadmap

Based on our product vision, we are executing a phased approach to MainNet launch:

- **Phase 0: Foundation (Weeks 1-2)** - Codebase stabilization, error handling, and robust P2P testing.
- **Phase 1: Organizations (Weeks 3-5)** - Smart contract upgrades for Org profiles (`org_name`, `logo_url`), backend registration, and branded frontend Hub.
- **Phase 2: The Hub Core (Weeks 6-9)** - Explore page for browsing compute via advanced filtering. Implementation of "Trust Signals" (uptime, jobs completed, user reviews).
- **Phase 3: Job Templates (Weeks 10-12)** - "One-click" deployment templates (e.g., Stable Diffusion, LLM fine-tuning) for non-technical consumers.
- **Phase 4: Consumer Dashboard (Weeks 13-16)** - Comprehensive history, Provider Comparison tool, and programmatic API key management.
- **Phase 5: MainNet Launch (Weeks 17-18)** - Final audits, MainNet transition, and Genesis organization onboarding.

## 📖 Features

### For Organizations & Providers

- Register on-chain with verified organizational profiles (Logos, Websites)
- Set your own pricing and specific hardware parameters
- Automatic job matching and dynamic discovery
- Proof generation for trust and reputation (ARC-3 Badges)
- Instant payment on completion directly to treasury wallets

### For Consumers

- "Hugging Face" style Hub to browse available compute providers
- Real-time pricing and availability
- One-click provisioning via Templates
- Live job progress monitoring
- Cryptographic proof of execution
- Automatic payment from escrow

### For Developers

- RESTful API with OpenAPI docs
- Server-Sent Events for real-time updates
- Comprehensive proof system
- Smart contract integration
- Extensible agent framework

## 🔐 Proof of Compute

Every job generates a cryptographic proof chain:

1. Job Received ✓
2. Escrow Locked ✓
3. Resources Allocated ✓
4. Execution Started ✓
5. Processing (with checkpoints) ✓
6. Execution Completed ✓
7. Results Verified ✓
8. Proof Generated ✓
9. Payment Released ✓

Each step is:
- Hashed with SHA-256
- Linked to previous step
- Broadcast in real-time
- Independently verifiable

See [docs/PROOF_SYSTEM.md](docs/PROOF_SYSTEM.md) for details.

## 📡 Real-Time Updates

The system provides live updates via Server-Sent Events:

- Job status changes
- Progress updates (0-100%)
- Proof generation
- Payment transactions
- Provider availability

Connect to `/realtime/stream` to receive all events.

## 🎯 Smart Contracts

### Provider Registry
Stores provider information and reputation on-chain.

### Escrow Contract
Holds funds until job completion is verified.

### Badge Minter
Issues reputation NFTs to providers.

Deploy contracts:
```bash
python contracts/deploy.py
```

## 📚 Documentation

- [Quick Start Guide](docs/QUICKSTART.md)
- [Proof System](docs/PROOF_SYSTEM.md)
- [Real-Time Implementation](docs/REALTIME_IMPLEMENTATION.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [API Reference](http://localhost:8000/docs)

### Key Product Pages

- Marketplace: `http://localhost:3000/`
- Providers: `http://localhost:3000/providers.html`
- Activity: `http://localhost:3000/activity.html`
- Dashboard: `http://localhost:3000/dashboard.html`
- Roadmap: `http://localhost:3000/roadmap.html`
- Wallet: `http://localhost:3000/wallet.html`

## 🛠️ Technology Stack

**Backend:**
- FastAPI - Modern Python web framework
- Uvicorn - ASGI server
- sse-starlette - Server-Sent Events
- py-algorand-sdk - Algorand integration

**Frontend:**
- Vite - Fast build tool
- ES Modules - Modern JavaScript
- Pera Wallet Connect - Wallet integration
- Tailwind CSS - Styling

**Blockchain:**
- Algorand TestNet
- PyTeal - Smart contracts
- AlgoNode API - Blockchain access

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Algorand Foundation for blockchain infrastructure
- AlgoKit for development tools
- Stitch design system for UI inspiration

## 📞 Support

- Documentation: [docs/](docs/)
- Issues: [GitHub Issues](../../issues)
- API Docs: http://localhost:8000/docs

---

**Built with ❤️ on Algorand**

*Kinetic Marketplace - Decentralized Compute for Everyone*
