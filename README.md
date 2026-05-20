# Kinetic — Decentralized GPU Compute Marketplace on Algorand

> **The "Hugging Face for GPU Compute."** Browse, compare, and instantly deploy containerized AI/ML workloads to decentralized providers. Payments locked in Algorand smart-contract escrow. Proofs verified on-chain.

**🏠 The full project lives in [`p2p-compute-marketplace/`](p2p-compute-marketplace/)**

---

## 🎥 Demo Video

**[Watch the 5-minute Demo Walkthrough](https://www.loom.com/share/placeholder)** *(replace with your actual link before submission)*

## 🚀 Quick Start

```bash
cd p2p-compute-marketplace

# Backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1  # Windows
pip install -e .
uvicorn api.main:app --reload --port 8000

# Frontend (new terminal)
cd web
npm install
npm run dev
# Open http://localhost:3000
```

## 🔗 Smart Contracts (TestNet)

| Contract | App ID | Explorer |
|----------|--------|----------|
| Provider Registry | `758813563` | [View](https://testnet.explorer.perawallet.app/application/758813563) |
| Escrow | `758813574` | [View](https://testnet.explorer.perawallet.app/application/758813574) |
| Badge Minter | `758813562` | [View](https://testnet.explorer.perawallet.app/application/758813562) |

## 📖 Full Documentation

👉 **[Read the complete README](p2p-compute-marketplace/README.md)** — includes architecture, setup, business model, GTM plan, and contract details.

---

*Built for AlgoBharat Hack Series 3.0 — Round 3*
