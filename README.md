# Kinetic - Decentralized P2P Compute Marketplace

> A fully autonomous, peer-to-peer marketplace for high-performance computing resources built on Algorand blockchain.

[![Algorand](https://img.shields.io/badge/Algorand-TestNet-00D1FF?style=flat&logo=algorand)](https://testnet.algoexplorer.io/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.8+-3776AB?style=flat&logo=python)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109-009688?style=flat&logo=fastapi)](https://fastapi.tiangolo.com/)

## 🌟 Overview

Kinetic is a decentralized marketplace where anyone can rent or provide GPU/CPU compute resources. Built on Algorand, it features:

- **True P2P Architecture** - No central server, providers and consumers connect directly
- **Autonomous Agents** - Zero human intervention, agents handle everything
- **Cryptographic Proofs** - Verifiable proof-of-compute at every step
- **Real-Time Updates** - Live job status via Server-Sent Events
- **Smart Contract Escrow** - Secure payments with automatic release

## 🏗️ Architecture

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

## 📖 Features

### For Consumers

- Browse available compute providers
- Real-time pricing and availability
- One-click provisioning with Pera Wallet
- Live job progress monitoring
- Cryptographic proof of execution
- Automatic payment from escrow

### For Providers

- Register on-chain permissionlessly
- Set your own pricing
- Automatic job matching
- Proof generation for trust
- Instant payment on completion

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
