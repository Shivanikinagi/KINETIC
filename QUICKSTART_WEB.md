# Quick Start Guide - Kinetic Marketplace

Get the Kinetic Marketplace running in under 5 minutes!

## Prerequisites

- Python 3.8 or higher
- Internet connection (for CDN resources)

## Step 1: Setup

```bash
# Navigate to project directory
cd p2p-compute-marketplace

# Create virtual environment (if not exists)
python -m venv .venv

# Activate virtual environment
# Windows PowerShell:
.\.venv\Scripts\Activate.ps1

# Linux/Mac:
source .venv/bin/activate

# Install dependencies
pip install fastapi uvicorn python-dotenv
```

## Step 2: Start the Marketplace

### One-Command Startup (Easiest)

**Windows:**
```powershell
.\start_marketplace.ps1
```

**Linux/Mac:**
```bash
chmod +x start_marketplace.sh
./start_marketplace.sh
```

This will start both:
- Backend API on port 8000
- Frontend on port 3000

### Manual Startup (Alternative)

**Terminal 1 - Backend:**
```bash
python -m uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
```

**Terminal 2 - Frontend:**
```bash
python web/server.py
```

## Step 3: Access the Application

Open your browser and navigate to:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## What You'll See

### Homepage (/)
- Hero section with "LEVERAGE QUANTUM SPEED"
- Live market statistics (Total Nodes, Active GPUs, etc.)
- Featured providers grid with 3 providers
- Dark theme with cyan accents

### Providers Page (/providers.html)
- Full marketplace with all available providers
- Filters sidebar (GPU model, VRAM, price range)
- Detailed provider cards with specs and pricing
- "Rent" buttons to provision resources

### API Endpoints

The backend provides these endpoints:

- `GET /providers` - List all compute providers
- `GET /health` - Health check
- `GET /telemetry` - System telemetry
- `POST /job` - Submit compute job

## Testing the Integration

### 1. Check Backend Health
```bash
curl http://localhost:8000/health
```

Expected response:
```json
{
  "status": "ok",
  "provider": "",
  "last_heartbeat": null,
  "version": "1.0.0"
}
```

### 2. List Providers
```bash
curl http://localhost:8000/providers
```

You should see a JSON array with 7 providers.

### 3. Open Frontend
Navigate to http://localhost:3000 and you should see:
- The homepage loads with featured providers
- Market stats show "7" total nodes
- Provider cards display with images and specs

## Troubleshooting

### Port Already in Use

If port 8000 or 3000 is already in use:

**Change Backend Port:**
```bash
python -m uvicorn api.main:app --host 0.0.0.0 --port 8001
```

**Change Frontend Port:**
Edit `web/server.py` and change `port=3000` to `port=3001`

### Frontend Can't Connect to Backend

1. Make sure backend is running on port 8000
2. Check browser console for errors (F12)
3. Verify CORS is enabled in `api/main.py`

### Styling Issues

The frontend uses Tailwind CSS via CDN. Make sure you have internet connection for:
- Tailwind CSS
- Google Fonts (Space Grotesk, Inter, JetBrains Mono)
- Material Symbols icons

## Next Steps

### Connect a Wallet
1. Click "Connect Wallet" button
2. Currently simulated - full integration coming soon
3. Will support Pera Wallet and Defly

### Provision a Provider
1. Browse providers on homepage or /providers.html
2. Click "Provision" or "Rent" button
3. Currently shows alert - smart contract integration coming soon

### View Activity
- Activity page (coming soon) will show:
  - Proof of compute timeline
  - Kernel logs
  - Job progress

### Check Transactions
- Wallet page (coming soon) will show:
  - Transaction ledger
  - Balance and spending
  - Payment history

## Development

### Project Structure
```
p2p-compute-marketplace/
├── web/                    # Frontend
│   ├── index.html         # Homepage
│   ├── providers.html     # Provider marketplace
│   ├── server.py          # Frontend server
│   └── static/
│       └── js/
│           ├── config.js  # Tailwind config
│           ├── app.js     # Main app logic
│           └── providers.js
├── api/                   # Backend
│   ├── main.py           # FastAPI app
│   └── ...
└── stitch_algorand_compute_exchange/  # Design system source
```

### Making Changes

**Frontend:**
1. Edit HTML files in `web/`
2. Edit JS files in `web/static/js/`
3. Refresh browser (no build step needed!)

**Backend:**
1. Edit Python files in `api/`
2. Server auto-reloads with `--reload` flag

### Adding New Pages

1. Create HTML file in `web/` (e.g., `activity.html`)
2. Add route in `web/server.py`
3. Create JS file in `web/static/js/` (e.g., `activity.js`)
4. Update navigation links in all pages

## Support

- Check `README.md` for full documentation
- Check `web/README.md` for frontend details
- Check `DESIGN.md` for design system guidelines

## What's Working

✅ Homepage with hero and featured providers
✅ Provider marketplace with filters
✅ Dynamic data loading from backend
✅ Responsive design
✅ Stitch design system styling
✅ Backend API with provider data

## Coming Soon

⏳ Wallet integration (Pera, Defly)
⏳ Activity/proofs page
⏳ Transaction ledger page
⏳ Smart contract integration
⏳ Real-time updates
⏳ Job submission flow

---

**Enjoy building on Algorand! 🚀**
