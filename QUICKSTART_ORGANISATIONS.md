# Quick Start Guide - Organisations Feature

## 🚀 Get Started in 5 Minutes

### Prerequisites
- Python 3.8+ installed
- Node.js 16+ installed
- Algorand wallet (Pera Wallet recommended)
- ADMIN_MNEMONIC in `.env` file

### Step 1: Deploy Smart Contract (One-time setup)

```bash
# Navigate to project directory
cd p2p-compute-marketplace

# Ensure your .env has ADMIN_MNEMONIC set
# ADMIN_MNEMONIC=word1 word2 word3 ... word25

# Deploy the organisation registry contract
python scripts/deploy_org_registry.py
```

**Expected output:**
```
ORG_REGISTRY_APP_ID=123456789
```

The script will automatically update your `.env` file with the app ID.

### Step 2: Start the Backend

```bash
# Install dependencies (if not already done)
pip install -e .

# Start the FastAPI server
python -m uvicorn api.main:app --reload
```

**Backend will be available at:** http://localhost:8000

### Step 3: Start the Frontend

```bash
# Navigate to web directory
cd web

# Install dependencies (if not already done)
npm install

# Start the development server
npm run dev
```

**Frontend will be available at:** http://localhost:3000

### Step 4: Register Your First Organisation

1. **Open the registration page:**
   - Navigate to http://localhost:3000/org-register.html

2. **Fill in the form:**
   - Organisation Name: "Your Company Name"
   - Description: "Brief description of your organisation"
   - Logo URL: (optional) URL to your logo image
   - Owner Wallet: Click "Use Connected" after connecting Pera Wallet

3. **Connect Wallet:**
   - Click "Connect Wallet" button
   - Approve connection in Pera Wallet

4. **Submit Registration:**
   - Click "Register Organisation"
   - Wait for confirmation
   - You'll be redirected to the dashboard

### Step 5: Manage Your Organisation

1. **Access Dashboard:**
   - Navigate to http://localhost:3000/org-dashboard.html
   - Or click "My Org" in the header

2. **List a Compute Resource:**
   - Click "List New Resource" button
   - Fill in resource details (GPU model, count, price, etc.)
   - Submit to add to marketplace

3. **Rent Compute:**
   - Click "Submit Compute Job" button
   - Specify task type, tokens, and VRAM requirements
   - Submit to rent from another provider

4. **Track Progress:**
   - View verification progress (50 jobs to verify)
   - Monitor earnings and spending
   - See all jobs and resources

### Step 6: View on Marketplace

1. **Navigate to marketplace:**
   - Go to http://localhost:3000/index.html

2. **See your resources:**
   - Your organisation's resources appear in the provider list
   - Org badge is displayed on your resources
   - Verified badge appears after 50 jobs

## 🧪 Test the Implementation

Run the automated test script:

```bash
python test_org_flow.py
```

This will test all endpoints and verify the complete flow.

## 📊 Key Endpoints

### API Endpoints (http://localhost:8000)

- `POST /orgs/register` - Register new organisation
- `GET /orgs` - List all organisations
- `GET /orgs/{org_id}` - Get organisation details
- `PATCH /orgs/{org_id}` - Update organisation
- `POST /orgs/{org_id}/resources` - List compute resource
- `GET /orgs/{org_id}/resources` - Get all resources
- `POST /orgs/{org_id}/rent` - Rent compute as consumer
- `GET /orgs/{org_id}/dashboard` - Dashboard stats
- `GET /orgs/{org_id}/jobs` - All organisation jobs

### Frontend Pages

- `/org-register.html` - Register new organisation
- `/org-dashboard.html` - Manage organisation
- `/index.html` - Marketplace (shows org resources)

## 🔧 Configuration

### Environment Variables (.env)

```bash
# Required for contract deployment
ADMIN_MNEMONIC=word1 word2 word3 ... word25

# Set automatically by deploy script
ORG_REGISTRY_APP_ID=123456789

# Optional: funding amount for app account (default: 500000)
ORG_REGISTRY_APP_FUND_MICROALGO=500000

# Algorand network configuration
ALGORAND_NETWORK=testnet
ALGOD_URL=https://testnet-api.algonode.cloud
ALGOD_TOKEN=
```

## 🎯 Common Tasks

### Register Organisation via API

```bash
curl -X POST http://localhost:8000/orgs/register \
  -H "Content-Type: application/json" \
  -d '{
    "org_name": "Astra Compute Labs",
    "description": "High-performance GPU provider",
    "logo_url": "https://example.com/logo.png",
    "owner_wallet": "YOUR_ALGORAND_WALLET_ADDRESS"
  }'
```

### List a Resource via API

```bash
curl -X POST http://localhost:8000/orgs/{org_id}/resources \
  -H "Content-Type: application/json" \
  -d '{
    "name": "A100 GPU Pod",
    "gpu_model": "A100",
    "gpu_count": 4,
    "vram_gb": 320,
    "price_per_hour": 0.80,
    "uptime": 99.2,
    "status": "active",
    "region": "US-East (Virginia)"
  }'
```

### Rent Compute via API

```bash
curl -X POST http://localhost:8000/orgs/{org_id}/rent \
  -H "Content-Type: application/json" \
  -d '{
    "task_type": "inference",
    "tokens": 100,
    "required_vram": 8,
    "payload": "test-job"
  }'
```

## 🐛 Troubleshooting

### Issue: "ORG_REGISTRY_APP_ID not set"
**Solution:** Run the deployment script first:
```bash
python scripts/deploy_org_registry.py
```

### Issue: "ADMIN_MNEMONIC missing"
**Solution:** Add your admin wallet mnemonic to `.env`:
```bash
ADMIN_MNEMONIC=word1 word2 word3 ... word25
```

### Issue: "Organisation not found"
**Solution:** Make sure you're using the correct `org_id` from the registration response.

### Issue: "Wallet not connected"
**Solution:** Click "Connect Wallet" and approve in Pera Wallet.

### Issue: Database errors
**Solution:** The database is auto-created. If issues persist, delete `data/orgs.db` and restart.

## 📚 Next Steps

1. **Deploy to Production:**
   - Update `.env` with production Algorand network
   - Deploy backend to Vercel or your hosting provider
   - Deploy frontend to Vercel or static hosting

2. **Customize:**
   - Adjust verification threshold (default: 50 jobs)
   - Modify pricing calculations
   - Add custom resource types

3. **Monitor:**
   - Check dashboard for earnings/spending
   - Track verification progress
   - Monitor resource uptime

## 🎉 Success!

You now have a fully functional Organisations feature running on your local machine. Organisations can:
- ✅ Register on the platform
- ✅ List compute resources
- ✅ Rent compute from others
- ✅ Track earnings and spending
- ✅ Earn verified badges
- ✅ Appear on the marketplace

## 📞 Support

For issues or questions:
1. Check the main documentation: `ORGANISATIONS_FEATURE.md`
2. Review API docs: http://localhost:8000/docs
3. Run the test script: `python test_org_flow.py`
4. Check the logs in the terminal

Happy computing! 🚀
