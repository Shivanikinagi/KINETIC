# Smart Contract Documentation — Kinetic Compute Marketplace

**Network**: Algorand TestNet  
**Deployment Date**: May 2026  
**Deployer**: ZGAC4DCYMBOBJ6Z35O2Y3G6IYPMZD72YHXZ6PUD7AKHT3OWPBXCMLQPHPQ

---

## Deployed Contracts

### 1. Provider Registry
| Field | Value |
|-------|-------|
| **App ID** | `758813563` |
| **Creator** | `ZGAC4DCYMBOBJ6Z35O2Y3G6IYPMZD72YHXZ6PUD7AKHT3OWPBXCMLQPHPQ` |
| **Explorer** | [View on Pera](https://testnet.explorer.perawallet.app/application/758813563) |
| **Purpose** | On-chain provider listings with box storage |
| **Storage** | BoxMap keyed by provider address (prefix: `b"provider"`) |
| **Global State** | 1 variable |

**ABI Methods**:
- `register_provider(uint64,byte[],uint64,byte[],byte[],byte[])void`
- `get_provider(address)(uint64,byte[],uint64,byte[],uint64,uint64,uint64,byte[],byte[])`
- `set_badge_app_id(uint64)void`

**Data Stored per Provider**:
- VRAM (GB): uint64
- GPU Model: byte[]
- Price/Hour (microALGO): uint64
- Endpoint URL: byte[]
- Uptime Score: uint64
- Active Status: uint64
- Badge App ID: uint64
- Org Name: byte[]
- Logo URL: byte[]

### 2. Escrow Contract
| Field | Value |
|-------|-------|
| **App ID** | `758813574` |
| **Creator** | `ZGAC4DCYMBOBJ6Z35O2Y3G6IYPMZD72YHXZ6PUD7AKHT3OWPBXCMLQPHPQ` |
| **Explorer** | [View on Pera](https://testnet.explorer.perawallet.app/application/758813574) |
| **Purpose** | Payment lock & release per job |
| **Storage** | BoxMap keyed by job_id (prefix: `b"job"`) |
| **Global State** | 0 variables |

**ABI Methods**:
- `lock_payment(byte[],address,byte[],uint64)void`
- `release_payment(byte[],byte[])void`
- `refund_consumer(byte[])void`
- `get_job_status(byte[])uint64`

**Status Codes**:
- `0` = Locked (payment held)
- `1` = Completed (released to provider)
- `2` = Refunded (returned to consumer)

**Events**:
- `JobLocked(byte[],address,address,uint64)`
- `JobCompleted(byte[],byte[])`
- `JobRefunded(byte[])`

### 3. Badge Minter
| Field | Value |
|-------|-------|
| **App ID** | `758813562` |
| **Creator** | `ZGAC4DCYMBOBJ6Z35O2Y3G6IYPMZD72YHXZ6PUD7AKHT3OWPBXCMLQPHPQ` |
| **Explorer** | [View on Pera](https://testnet.explorer.perawallet.app/application/758813562) |
| **Purpose** | ARC-3 SBT verification badges |
| **Token Type** | Non-transferable Soulbound Token |
| **Global State** | 1 variable |

**ABI Methods**:
- `mint_badge(address)void`
- `get_badge_count(address)uint64`

---

## Wallets

### Agent Wallet (Consumer/Payer)
| Field | Value |
|-------|-------|
| **Address** | `A3OZF2FGDTW4SAWQ7KUWAWFWZEUPIQUQQTCD6SLPHF6OHLVRAKDZJB3W6E` |
| **Balance** | 14.61 ALGO |
| **Explorer** | [View on Pera](https://testnet.explorer.perawallet.app/address/A3OZF2FGDTW4SAWQ7KUWAWFWZEUPIQUQQTCD6SLPHF6OHLVRAKDZJB3W6E) |
| **Role** | Submits compute jobs, pays providers, locks escrow |

### Provider Wallet
| Field | Value |
|-------|-------|
| **Address** | `KQJUEZCS4ZFTXSNQ45FS5D2IECS2PUBRP7Q2HB7E4WS7ASWCWJXMVHBV4I` |
| **Balance** | 0 ALGO (needs funding for on-chain registration) |
| **Explorer** | [View on Pera](https://testnet.explorer.perawallet.app/address/KQJUEZCS4ZFTXSNQ45FS5D2IECS2PUBRP7Q2HB7E4WS7ASWCWJXMVHBV4I) |
| **Role** | Receives payments for compute jobs |

---

## On-Chain Proof Transactions

Every completed compute job submits a 0-ALGO payment transaction with the proof hash in the note field (`p2p-proof:{job_id}:{result_hash}`).

### Recent Proof Transactions

| # | Tx ID | Job Type | Proof Hash | Explorer |
|---|-------|----------|------------|----------|
| 1 | `OMRJQD5RMLOF5U6LGBA2GTEDUJ7PJUH6MQXWP4SHDCTUCZ7AXUPA` | image_generation | `de4a90df2a7a5879...` | [View](https://testnet.explorer.perawallet.app/tx/OMRJQD5RMLOF5U6LGBA2GTEDUJ7PJUH6MQXWP4SHDCTUCZ7AXUPA) |
| 2 | `XO2WXGCAZSTJCEN5RRXEXONJLSU534HUJ7MHYJ5765CEN7ECPYOA` | image_generation | `2ee469b8a77f2de7...` | [View](https://testnet.explorer.perawallet.app/tx/XO2WXGCAZSTJCEN5RRXEXONJLSU534HUJ7MHYJ5765CEN7ECPYOA) |
| 3 | `JON4RCPHC372ZO5SVQHFOLZW5FTEWOAMWIEAPMDVJQPBBITUJQ2A` | deployment | `361cea11681cc2c9...` | [View](https://testnet.explorer.perawallet.app/tx/JON4RCPHC372ZO5SVQHFOLZW5FTEWOAMWIEAPMDVJQPBBITUJQ2A) |
| 4 | `UCQ2MKXF5TTUDE44IB5SWARXIIRSELJSQ4PPKKOLOR4U7EG2A4KQ` | deployment | `e9d13c0139bf916f...` | [View](https://testnet.explorer.perawallet.app/tx/UCQ2MKXF5TTUDE44IB5SWARXIIRSELJSQ4PPKKOLOR4U7EG2A4KQ) |
| 5 | `K6T456A4EVLGCSAX4OK7T2EE5XIRCE5FHK6LOF7N6MHKW64B6I6Q` | inference | `fc626fc870b44306...` | [View](https://testnet.explorer.perawallet.app/tx/K6T456A4EVLGCSAX4OK7T2EE5XIRCE5FHK6LOF7N6MHKW64B6I6Q) |
| 6 | `NS2NCAIOTHCSGZZMBIYUANV774LGKO2JJD6Z3EOVC4NWSWU7QVOA` | inference | `7949bb70199e57d8...` | [View](https://testnet.explorer.perawallet.app/tx/NS2NCAIOTHCSGZZMBIYUANV774LGKO2JJD6Z3EOVC4NWSWU7QVOA) |
| 7 | `NLSFHH5ORMW5HUFWT3CELBYAA76UITCBTEVQHCIDSRVPUZMJLGYA` | inference | `7949bb70199e57d8...` | [View](https://testnet.explorer.perawallet.app/tx/NLSFHH5ORMW5HUFWT3CELBYAA76UITCBTEVQHCIDSRVPUZMJLGYA) |
| 8 | `4YPIDJ5SOBSKOK3FIDUIWUZJKXGWSYQM5XE2YICDE4HANNUPW4HA` | inference | `7949bb70199e57d8...` | [View](https://testnet.explorer.perawallet.app/tx/4YPIDJ5SOBSKOK3FIDUIWUZJKXGWSYQM5XE2YICDE4HANNUPW4HA) |

### Payment Session Transactions

| Tx ID | Purpose | Explorer |
|-------|---------|----------|
| `S5Q5XP63TS77SQUDHOOOUONGKO62O2BCZGLJIFIE2MLD54IZ6KJQ` | x402 payment session init | [View](https://testnet.explorer.perawallet.app/tx/S5Q5XP63TS77SQUDHOOOUONGKO62O2BCZGLJIFIE2MLD54IZ6KJQ) |
| `WKMDBD7WHVH4ZRPXXGZ4CTACRYSSDNTTKWT4QA4U634FCDCY3BWA` | x402 payment session init | [View](https://testnet.explorer.perawallet.app/tx/WKMDBD7WHVH4ZRPXXGZ4CTACRYSSDNTTKWT4QA4U634FCDCY3BWA) |

---

## Contract Source Files

| File | Contract | Language |
|------|----------|----------|
| `contracts/registry.py` | Provider Registry | PyTeal |
| `contracts/escrow.py` | Escrow | PyTeal |
| `contracts/badge.py` | Badge Minter | PyTeal |
| `contracts/deploy.py` | Deployment Script | Python + algokit |

## Deployment Command

```bash
python contracts/deploy.py
```

This compiles PyTeal to TEAL via `puyapy`, deploys all three contracts, funds them with ALGO, and writes App IDs to `.env`.

## Security Features

- **Assertion-based validation** on all contract methods
- **Escrow timeouts** prevent locked funds (20-round timeout)
- **Box storage MBR** pre-funded during deployment
- **Updatable & deletable** for testnet iteration
- **Non-transferable badges** prevent reputation gaming

---

*All contracts deployed on Algorand TestNet. Ready for MainNet migration with updated app IDs.*
