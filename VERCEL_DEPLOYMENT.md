# Deploy Kinetic Marketplace to Vercel

This guide walks you through deploying the Kinetic P2P Compute Marketplace to Vercel.

## Prerequisites

- GitHub account
- Vercel account (free tier works)
- Git installed locally
- Algorand TestNet wallet with funds

## Step 1: Prepare Repository

### 1.1 Initialize Git (if not already done)
```bash
cd p2p-compute-marketplace
git init
git add .
git commit -m "Initial commit - Kinetic Marketplace"
```

### 1.2 Create GitHub Repository
1. Go to https://github.com/new
2. Create a new repository (e.g., `kinetic-marketplace`)
3. Don't initialize with README (we already have one)

### 1.3 Push to GitHub
```bash
git remote add origin https://github.com/YOUR_USERNAME/kinetic-marketplace.git
git branch -M main
git push -u origin main
```

## Step 2: Deploy to Vercel

### 2.1 Connect to Vercel
1. Go to https://vercel.com
2. Click "Add New Project"
3. Import your GitHub repository
4. Select `kinetic-marketplace`

### 2.2 Configure Project Settings

**Framework Preset:** Other (leave as is)

**Root Directory:** `./` (default)

**Build Command:** Leave empty (static + serverless)

**Output Directory:** `web`

### 2.3 Environment Variables

Add these environment variables in Vercel dashboard:

#### Required Variables:
```bash
# Algorand Network
ALGORAND_NETWORK=testnet
ALGOD_URL=https://testnet-api.algonode.cloud
INDEXER_URL=https://testnet-idx.algonode.cloud
ALGOD_TOKEN=

# Provider Wallet (IMPORTANT!)
PROVIDER_WALLET=YOUR_ALGORAND_ADDRESS_HERE
PROVIDER_MNEMONIC=your 25 word mnemonic phrase here

# Pricing
JOB_PRICE_PER_TOKEN_MICROALGO=100

# Agent Settings
AGENT_DAILY_BUDGET_MICROALGO=5000000
AGENT_MAX_TOKENS=2000

# Smart Contracts (if deployed)
BADGE_APP_ID=758813562
REGISTRY_APP_ID=758813563
ESCROW_APP_ID=758813574
```

#### How to Get Your Wallet Info:
1. **PROVIDER_WALLET:** Your Algorand address (starts with uppercase letters)
2. **PROVIDER_MNEMONIC:** 25-word recovery phrase from Pera Wallet
   - ⚠️ **NEVER share this publicly!**
   - ⚠️ **Use TestNet wallet only for testing**

### 2.4 Deploy
1. Click "Deploy"
2. Wait 2-3 minutes for build
3. Your site will be live at: `https://your-project.vercel.app`

## Step 3: Verify Deployment

### 3.1 Check Endpoints
Visit these URLs (replace with your Vercel URL):

```bash
# Frontend
https://your-project.vercel.app

# Backend API
https://your-project.vercel.app/api/health

# Providers List
https://your-project.vercel.app/api/providers

# Agent Bridge
https://your-project.vercel.app/api/agent/status
```

### 3.2 Test Functionality
1. Open your Vercel URL
2. Browse providers
3. Try provisioning (requires funded wallet)
4. Check activity page for real-time updates

## Step 4: Custom Domain (Optional)

### 4.1 Add Domain in Vercel
1. Go to Project Settings → Domains
2. Add your domain (e.g., `kinetic.yourdomain.com`)
3. Follow DNS configuration instructions

### 4.2 Update DNS
Add these records to your DNS provider:
```
Type: CNAME
Name: kinetic (or @)
Value: cname.vercel-dns.com
```

## Important Notes

### ⚠️ Serverless Limitations

Vercel serverless functions have limitations:
- **10 second timeout** on Hobby plan
- **No persistent storage** (use external DB for production)
- **Cold starts** (first request may be slow)

### 🔒 Security Best Practices

1. **Never commit secrets to Git:**
   ```bash
   # Add to .gitignore
   .env
   *.key
   *mnemonic*
   ```

2. **Use TestNet for testing:**
   - Don't use MainNet wallets in Vercel
   - TestNet ALGO is free and safe

3. **Rotate keys regularly:**
   - Generate new TestNet wallets periodically
   - Update environment variables in Vercel

### 💾 Database Considerations

The current setup uses SQLite (local files). For production:

**Option 1: Vercel Postgres**
```bash
# Install Vercel Postgres
vercel postgres create
```

**Option 2: External Database**
- Supabase (PostgreSQL)
- PlanetScale (MySQL)
- MongoDB Atlas

Update connection strings in environment variables.

### 📊 Monitoring

**Vercel Analytics:**
1. Go to Project → Analytics
2. Enable Web Analytics
3. Monitor traffic and performance

**Logs:**
1. Go to Project → Deployments
2. Click on deployment
3. View Function Logs

## Troubleshooting

### Build Fails

**Error: "Module not found"**
```bash
# Solution: Check requirements.txt includes all dependencies
pip freeze > requirements.txt
git add requirements.txt
git commit -m "Update dependencies"
git push
```

**Error: "Python version mismatch"**
```bash
# Solution: Specify Python version in vercel.json
{
  "builds": [
    {
      "src": "api/main.py",
      "use": "@vercel/python",
      "config": { "runtime": "python3.9" }
    }
  ]
}
```

### Runtime Errors

**Error: "Function timeout"**
- Serverless functions timeout after 10s (Hobby) or 60s (Pro)
- Solution: Optimize slow operations or upgrade plan

**Error: "Environment variable not found"**
- Check Vercel dashboard → Settings → Environment Variables
- Redeploy after adding variables

**Error: "CORS issues"**
- Check CORS middleware in `api/main.py`
- Ensure `allow_origins=["*"]` or specific domain

### Agent Bridge Not Working

**Issue: Agent jobs failing**
- Check wallet is funded: https://testnet.algoexplorer.io/address/YOUR_ADDRESS
- Verify PROVIDER_MNEMONIC is correct
- Check agent logs in Vercel dashboard

## Production Checklist

Before going to MainNet:

- [ ] Use production Algorand node (not public API)
- [ ] Set up proper database (not SQLite)
- [ ] Configure rate limiting
- [ ] Add authentication for admin endpoints
- [ ] Set up monitoring and alerts
- [ ] Use environment-specific configs
- [ ] Enable HTTPS only
- [ ] Add error tracking (Sentry, etc.)
- [ ] Set up CI/CD pipeline
- [ ] Configure backup strategy
- [ ] Add load testing
- [ ] Review security audit

## Useful Commands

### Redeploy
```bash
# Trigger new deployment
git add .
git commit -m "Update"
git push
```

### View Logs
```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# View logs
vercel logs
```

### Environment Variables
```bash
# List env vars
vercel env ls

# Add env var
vercel env add VARIABLE_NAME

# Remove env var
vercel env rm VARIABLE_NAME
```

## Support

- **Vercel Docs:** https://vercel.com/docs
- **Algorand Docs:** https://developer.algorand.org
- **Project Issues:** GitHub Issues

## Cost Estimate

**Vercel Hobby (Free):**
- ✅ Unlimited deployments
- ✅ 100GB bandwidth/month
- ✅ Serverless functions
- ⚠️ 10s function timeout
- ⚠️ No team features

**Vercel Pro ($20/month):**
- ✅ 1TB bandwidth/month
- ✅ 60s function timeout
- ✅ Team collaboration
- ✅ Analytics
- ✅ Password protection

**Algorand Costs:**
- TestNet: FREE
- MainNet: ~0.001 ALGO per transaction (~$0.0002)

---

**Your Kinetic Marketplace is now live! 🚀**

Share your deployment: `https://your-project.vercel.app`
