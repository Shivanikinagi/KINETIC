# Kinetic Agentic Features

Autonomous compute agents for the Kinetic decentralized marketplace.

## Features

- **Autonomous Job Dispatch** — Agents discover providers, negotiate prices, and dispatch jobs without human intervention
- **Cryptographic Verification** — Every job output is verified before escrow release
- **Smart Contract Escrow** — Secure payments with automatic release on Algorand
- **Circuit Breaker & Health Monitoring** — Automatic failover when providers fail
- **Fraud Detection** — Spot-check reruns to detect malicious providers

## Architecture

```
agent/
├── consumer_agent.py    # Main autonomous agent logic
├── orchestrator.py      # Provider health monitoring & circuit breaking
├── job_matcher.py       # Provider scoring & ranking
├── verifier.py          # Output verification & spot checks
├── wallet.py            # Autonomous wallet with budget caps
└── settings.json        # Agent configuration

api/
├── agent_bridge.py      # HTTP bridge for agent control
└── agent/index.py       # Agent API endpoints
```

## Quick Start

```bash
pip install -r requirements.txt
python -m agent.consumer_agent --type inference --tokens 500
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `AGENT_MNEMONIC` | 25-word mnemonic for agent wallet |
| `REGISTRY_APP_ID` | On-chain provider registry app ID |
| `ESCROW_APP_ID` | On-chain escrow app ID |
| `AGENT_BUDGET_PER_JOB_MICROALGO` | Max spend per job |
| `AGENT_DAILY_BUDGET_MICROALGO` | Max daily spend |

## License

MIT
