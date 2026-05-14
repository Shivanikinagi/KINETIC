# 🚀 KINETIC Colab GPU Provider — Setup Guide

Launch a **free GPU provider node** on Google Colab and join the KINETIC network in minutes.

## Prerequisites

1. A Google account (for Colab)
2. An Algorand TestNet wallet ([fund here](https://bank.testnet.algorand.network/))
3. Your KINETIC hub running (locally or deployed)

## Quick Start

### Step 1: Open the Notebook

1. Go to [Google Colab](https://colab.research.google.com/)
2. Upload `kinetic_provider.ipynb` from this directory
3. **Important:** Set runtime to **GPU** (Runtime → Change runtime type → T4 GPU)

### Step 2: Configure

In Cell 2 of the notebook, set these values:
```python
os.environ["PROVIDER_WALLET"] = "YOUR_ALGORAND_ADDRESS"
os.environ["HUB_URL"] = "http://YOUR_HUB_IP:8000"  # or ngrok URL
os.environ["PROVIDER_MNEMONIC"] = "your 25 word mnemonic"
```

### Step 3: Run All Cells

The notebook will:
1. Install dependencies (Flask, pyngrok, torch)
2. Verify GPU is available (Tesla T4, 16GB VRAM)
3. Start the provider Flask server on port 5001
4. Create an ngrok tunnel → gives you a public URL
5. Register with the KINETIC hub on-chain

### Step 4: Verify

After running, you should see:
```
✅ GPU Available: Tesla T4 (15.0 GB)
✅ Provider URL: https://abc123.ngrok-free.app
✅ Registered on-chain: TX_ID_HERE
```

## How It Works

```
Google Colab (T4 GPU)
  └─ Flask server (:5001)
       └─ ngrok tunnel → public HTTPS URL
            └─ KINETIC Hub discovers provider
                 └─ Consumer agents dispatch jobs
                      └─ Real GPU compute happens on Colab
                           └─ Results + proof hash returned
                                └─ Escrow released on Algorand
```

## Limitations

- Colab sessions timeout after ~90 minutes (free tier)
- You need to re-run the notebook to restart
- Limited to 1 GPU (T4) per session
- Network may be slow through ngrok

## Scaling Beyond Colab

When ready to scale, replace the Colab adapter with:
- **RunPod**: `$0.0002/s` for serverless GPU
- **Vast.ai**: Community GPU marketplace
- **Your own GPU**: Run `provider_node/server.py` directly
- **Docker**: `docker build -f provider_node/Dockerfile .`

The provider interface is the same — zero code changes needed.
