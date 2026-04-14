# 🚀 Quick Start Guide

Get KINETIC up and running in 5 minutes!

## Prerequisites

- Python 3.11+
- Node.js 18+
- Git

## Installation

### Option 1: Automated Setup (Recommended)

**Windows (PowerShell):**
```powershell
.\setup.ps1
```

**Linux/Mac:**
```bash
chmod +x setup.sh
./setup.sh
```

### Option 2: Manual Setup

1. **Backend Setup**
```bash
# Create virtual environment
python -m venv .venv

# Activate (Windows)
.\.venv\Scripts\Activate.ps1

# Activate (Linux/Mac)
source .venv/bin/activate

# Install dependencies
pip install -e .

# Configure environment
cp .env.example .env
```

2. **Frontend Setup**
```bash
cd frontend
npm install
cp .env.example .env
cd ..
```

## Running the Application

### Start Backend (Terminal 1)

```bash
# Activate virtual environment
.\.venv\Scripts\Activate.ps1  # Windows
source .venv/bin/activate      # Linux/Mac

# Start API server
python -m uvicorn api.main:app --reload --port 8000
```

### Start Frontend (Terminal 2)

```bash
cd frontend
npm run dev
```

## Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## First Steps

1. **Connect Your Wallet**
   - Click "Connect Wallet" in the top right
   - Select Pera Wallet or Defly
   - Approve the connection

2. **Browse Providers**
   - Navigate to the Marketplace
   - View available GPU/CPU resources
   - Check pricing and specifications

3. **Provision Resources**
   - Click "Rent" on any provider
   - Confirm the transaction in your wallet
   - Monitor progress in the Activity page

4. **Track Transactions**
   - View your transaction history
   - Check your balance
   - Export reports

## Configuration

### Backend (.env)

```env
# Algorand Network
ALGOD_SERVER=https://testnet-api.algonode.cloud
ALGOD_TOKEN=

# Provider Settings (if running as provider)
PROVIDER_WALLET=YOUR_ALGORAND_ADDRESS
PROVIDER_GPU_MODEL=RTX4090
PROVIDER_VRAM_GB=24
PROVIDER_ENDPOINT=https://your-endpoint.com
JOB_PRICE_PER_TOKEN_MICROALGO=100
```

### Frontend (.env)

```env
VITE_API_URL=http://localhost:8000
VITE_ALGORAND_NETWORK=testnet
VITE_ALGOD_SERVER=https://testnet-api.algonode.cloud
```

## Troubleshooting

### Backend won't start

- Check Python version: `python --version` (should be 3.11+)
- Ensure virtual environment is activated
- Try: `pip install --upgrade pip` then `pip install -e .`

### Frontend won't start

- Check Node version: `node --version` (should be 18+)
- Delete `node_modules` and run `npm install` again
- Clear npm cache: `npm cache clean --force`

### Wallet won't connect

- Ensure you're on TestNet
- Check that Pera Wallet or Defly is installed
- Try refreshing the page

### API calls failing

- Verify backend is running on port 8000
- Check CORS settings in `api/main.py`
- Ensure `.env` files are configured correctly

## Development

### Hot Reload

Both frontend and backend support hot reload:
- Frontend: Changes auto-refresh in browser
- Backend: API restarts automatically with `--reload` flag

### API Testing

Use the interactive API docs:
- Swagger UI: http://localhost:8000/docs
- Try out endpoints directly in the browser

### Database

The agent uses SQLite for tracking:
- Location: `agent/spend_log.db`
- View with: `sqlite3 agent/spend_log.db`

## Next Steps

- Read the full [README.md](README.md)
- Explore the [Frontend README](frontend/README.md)
- Check out the [API Documentation](http://localhost:8000/docs)
- Join our community (Discord/Telegram)

## Need Help?

- 📖 Documentation: See README.md
- 🐛 Issues: GitHub Issues
- 💬 Community: Discord/Telegram
- 📧 Email: support@kinetic.example

---

Happy computing! ⚡
