# Kinetic Marketplace - Deployment Information

## Project Information

**Project Name**: Kinetic - P2P Algorand Compute Marketplace

**Description**: A decentralized marketplace for high-performance computing resources built on the Algorand blockchain. Provision GPUs, CPUs, and storage instantly with cryptographic proof of compute and automated payments.

## Deployment Links

### 🌐 Live Website
**Status**: Ready for deployment

**Recommended Platforms**:
- Vercel (Recommended for frontend)
- Netlify
- GitHub Pages
- Render

**Local Development**:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### 📝 Deployment Instructions

#### Option 1: Deploy to Vercel (Recommended)

1. **Install Vercel CLI**:
```bash
npm install -g vercel
```

2. **Deploy Frontend**:
```bash
cd p2p-compute-marketplace/web
vercel
```

3. **Deploy Backend** (Vercel Serverless):
```bash
cd p2p-compute-marketplace
vercel
```

#### Option 2: Deploy to Netlify

1. **Install Netlify CLI**:
```bash
npm install -g netlify-cli
```

2. **Deploy**:
```bash
cd p2p-compute-marketplace/web
netlify deploy --prod
```

#### Option 3: Deploy Backend to Render

1. Create account at https://render.com
2. Connect GitHub repository
3. Create new Web Service
4. Build command: `pip install -r requirements.txt`
5. Start command: `uvicorn api.main:app --host 0.0.0.0 --port $PORT`

## Smart Contract Deployment

### 🔗 Algorand TestNet Deployment

**Network**: Algorand TestNet

**Contracts to Deploy**:
1. Provider Registry Contract
2. Escrow Contract
3. Badge Minter Contract

### Deployment Steps

#### 1. Setup AlgoKit (if not installed)

```bash
# Install AlgoKit
pipx install algokit

# Verify installation
algokit --version
```

#### 2. Configure Environment

Create `.env` file:
```env
# Algorand Configuration
ALGOD_SERVER=https://testnet-api.algonode.cloud
ALGOD_TOKEN=
INDEXER_SERVER=https://testnet-idx.algonode.cloud
INDEXER_TOKEN=

# Deployer Account
DEPLOYER_MNEMONIC=your 25 word mnemonic here
```

#### 3. Deploy Contracts

```bash
# Activate virtual environment
source .venv/bin/activate  # Linux/Mac
.\.venv\Scripts\Activate.ps1  # Windows

# Deploy all contracts
python contracts/deploy.py
```

### Expected Output

After deployment, you'll receive:

```
✅ Provider Registry Deployed
   App ID: 123456789
   Address: REGISTRY_ADDRESS_HERE
   Transaction: TXID_HERE

✅ Escrow Contract Deployed
   App ID: 987654321
   Address: ESCROW_ADDRESS_HERE
   Transaction: TXID_HERE

✅ Badge Minter Deployed
   App ID: 456789123
   Address: BADGE_ADDRESS_HERE
   Transaction: TXID_HERE
```

## Deployment Checklist

### Pre-Deployment

- [ ] Test all pages locally
- [ ] Verify backend API endpoints
- [ ] Check environment variables
- [ ] Test wallet connection
- [ ] Verify smart contracts compile

### Frontend Deployment

- [ ] Build frontend assets
- [ ] Configure API endpoint URLs
- [ ] Set up environment variables
- [ ] Deploy to hosting platform
- [ ] Verify deployment URL
- [ ] Test all pages on live site

### Backend Deployment

- [ ] Install dependencies
- [ ] Configure database (if needed)
- [ ] Set environment variables
- [ ] Deploy to hosting platform
- [ ] Verify API endpoints
- [ ] Test CORS configuration

### Smart Contract Deployment

- [ ] Fund deployer account with ALGO
- [ ] Deploy Provider Registry
- [ ] Deploy Escrow Contract
- [ ] Deploy Badge Minter
- [ ] Verify contracts on AlgoExplorer
- [ ] Update frontend with App IDs

## Environment Variables

### Frontend (.env)
```env
VITE_API_URL=https://your-backend-url.com
VITE_ALGORAND_NETWORK=testnet
VITE_ALGOD_SERVER=https://testnet-api.algonode.cloud
VITE_PROVIDER_REGISTRY_APP_ID=123456789
VITE_ESCROW_APP_ID=987654321
VITE_BADGE_MINTER_APP_ID=456789123
```

### Backend (.env)
```env
# Algorand
ALGOD_SERVER=https://testnet-api.algonode.cloud
ALGOD_TOKEN=
INDEXER_SERVER=https://testnet-idx.algonode.cloud

# Provider
PROVIDER_WALLET=YOUR_ADDRESS
PROVIDER_GPU_MODEL=RTX4090
PROVIDER_VRAM_GB=24
PROVIDER_ENDPOINT=https://your-backend-url.com

# Contracts
PROVIDER_REGISTRY_APP_ID=123456789
ESCROW_APP_ID=987654321
BADGE_MINTER_APP_ID=456789123
```

## Post-Deployment Verification

### 1. Test Frontend
- [ ] Homepage loads correctly
- [ ] Provider marketplace displays data
- [ ] Activity page accessible
- [ ] Wallet page accessible
- [ ] Navigation works

### 2. Test Backend
- [ ] `/health` endpoint responds
- [ ] `/providers` returns data
- [ ] `/telemetry` works
- [ ] CORS configured correctly

### 3. Test Smart Contracts
- [ ] Contracts visible on AlgoExplorer
- [ ] Can call contract methods
- [ ] Transactions confirm on-chain

## Monitoring

### Frontend Monitoring
- Vercel Analytics (if using Vercel)
- Google Analytics
- Error tracking (Sentry)

### Backend Monitoring
- Uptime monitoring
- API response times
- Error logs

### Blockchain Monitoring
- AlgoExplorer for transactions
- Contract call success rate
- Gas/fee tracking

## Troubleshooting

### Frontend Issues
- Check browser console for errors
- Verify API URL is correct
- Check CORS configuration
- Verify environment variables

### Backend Issues
- Check server logs
- Verify database connection
- Check environment variables
- Test API endpoints directly

### Smart Contract Issues
- Verify account has ALGO for fees
- Check contract compilation
- Verify App IDs are correct
- Check AlgoExplorer for transaction details

## Support

For deployment issues:
1. Check logs in hosting platform
2. Verify environment variables
3. Test locally first
4. Check documentation
5. Contact support if needed

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Netlify Documentation](https://docs.netlify.com)
- [Algorand Developer Portal](https://developer.algorand.org)
- [AlgoKit Documentation](https://github.com/algorandfoundation/algokit-cli)
- [AlgoExplorer TestNet](https://testnet.algoexplorer.io)

---

**Note**: This project is currently set up for local development. Follow the deployment steps above to deploy to production.

**Status**: Ready for Deployment
**Last Updated**: April 13, 2026
