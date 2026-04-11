# P2P Compute Marketplace - Algorand Agentic Commerce

## What It Does
P2P Compute Marketplace is a decentralized campus compute exchange where provider nodes expose idle GPU or CPU resources and consumer agents autonomously purchase compute jobs. Instead of requiring a human to approve every payment, the consumer agent handles provider discovery, pricing checks, payment submission, output verification, and settlement.

The payment path follows an Algorand x402-style machine-to-machine model: provider API returns HTTP 402 with payment terms, the agent sends an Algorand payment transaction containing a job-bound note, and the provider validates it before executing the job. This turns API compute into pay-per-call, agent-operated commerce.

## Architecture
```mermaid
sequenceDiagram
	participant A as Consumer Agent
	participant P as Provider API
	participant C as Escrow Contract
	participant N as Algorand Network

	A->>P: POST /job
	P-->>A: HTTP 402 + payment metadata
	A->>N: Submit payment tx (note: p2p-compute:job_id)
	N-->>A: tx_id confirmed
	A->>P: POST /job + X-Payment-TxId
	P->>N: Verify tx receiver/amount/note/confirmation
	N-->>P: Payment valid
	P-->>A: result_hash + output
	A->>A: Verify deterministic hash
	A->>C: release_payment(job_id, proof_hash)
	C->>N: Inner payment to provider
```

## Tech Stack
| Layer | Technology | Purpose |
|---|---|---|
| Smart contracts | Algorand Python (ARC-4) | Escrow, provider registry, badge contract |
| Backend API | FastAPI + Uvicorn | x402 middleware, job execution, telemetry |
| Agent | Python + algosdk | Autonomous payment, routing, verification |
| Frontend | React 18 + TypeScript + Vite | Live dashboards for providers, activity, tx logs |
| Wallets | @txnlab/use-wallet + algosdk | Human wallet connection + agent signing |

## Getting Started

### Prerequisites
- Python 3.11+
- Node 18+
- Docker
- AlgoKit CLI

### Installation
1. Clone the repository.
2. Copy `.env.example` to `.env` and fill keys.
3. Install backend dependencies: `pip install -e .`
4. Install frontend dependencies: `cd frontend && npm install`
5. Generate or set three TestNet wallets in `.env` (`ADMIN_MNEMONIC`, `PROVIDER_MNEMONIC`, `AGENT_MNEMONIC`).
6. Fund those wallets using the TestNet faucet: `https://bank.testnet.algorand.network/`.
7. Deploy contracts to TestNet: `python contracts/deploy.py`
8. Register and mint: `python scripts/register_provider.py` and `python scripts/mint_badges.py`

### Running The Demo
1. Ensure `.env` points to TestNet endpoints and has funded mnemonics.
2. Deploy contracts: `python contracts/deploy.py`
3. Register provider and mint badges: `python scripts/register_provider.py` then `python scripts/mint_badges.py`
4. Start provider API on your public host/domain: `uvicorn api.main:app --host 0.0.0.0 --port 8000`
5. Start agent bridge: `uvicorn api.agent_bridge:app --host 0.0.0.0 --port 3001`
6. Start frontend: `cd frontend && npm run dev`
7. Run agent flow: `python agent/consumer_agent.py --type inference --tokens 500 --payload "Algorand testnet demo"`

## How It Maps To Algorand Agentic Commerce
This project demonstrates direct agentic payments where autonomous software decides when and how to pay for external services. The provider does not trust client intent and instead enforces payment first via HTTP 402 metadata, with on-chain verification gates before execution.

The marketplace supports machine-to-machine settlement, pay-per-call compute APIs, and autonomous retries or fallback logic. Each job can be verified by deterministic hashing and resolved by escrow release or refund behavior, aligning with trust-minimized agentic commerce patterns.

## Smart Contracts
| Contract | App ID | Purpose |
|---|---|---|
| EscrowContract | 1040 | Lock, release, refund job-linked funds |
| ProviderRegistry | 1005 | Provider listing, uptime metadata |
| BadgeMinter | 1013 | Campus membership soulbound badge |

## TestNet-Only Notes
- This repository is configured for Algorand TestNet by default.
- No LocalNet dependency is required in scripts or default configuration.
- Contract deployment and payment verification use `ALGOD_URL` / `INDEXER_URL` from `.env`.

## License
MIT
