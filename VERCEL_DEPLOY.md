# Vercel Deployment Fix — 404 Error Resolution

## Problem

When deploying to Vercel, you get:
```
Failed to load resource: the server responded with a status of 404 (Not Found)
```

This happens for two reasons:

1. **SPA Routing Missing**: Vercel tries to find `/explore/index.html` or `/job/123/index.html` but only `/index.html` exists. React Router handles client-side routing, but Vercel doesn't know to fall back to `index.html`.

2. **API Routes Wrong Prefix**: Your FastAPI routes are `/providers`, `/job`, `/agent` — NOT `/api/providers`. The old `vercel.json` only routed `/api/*` to the backend.

---

## Fix Applied

### `vercel.json` (Updated)

**Key changes:**
- All API endpoints (`/providers`, `/job`, `/agent`, `/models`, etc.) now route to `api/index.py`
- **Catch-all route** `/(.*)` → `web/dist/index.html` with `status: 200` (SPA fallback)
- Static assets served from `web/dist/assets/` with long-term caching
- Uses `api/index.py` as the Python entry point (proper ASGI handler)

### `web/package.json` (Updated)
- Added `"vercel-build": "tsc && vite build"` script so Vercel's static-build knows how to compile the React app

---

## Step-by-Step Vercel Deployment

### Step 1: Build the Frontend Locally First

```bash
cd web
npm install
npm run build
```

This creates `web/dist/` with all compiled assets.

### Step 2: Install Vercel CLI

```bash
npm i -g vercel
```

### Step 3: Login to Vercel

```bash
vercel login
```

### Step 4: Deploy

From the **project root** (NOT the `web/` folder):

```bash
vercel --prod
```

Or for a preview deployment:
```bash
vercel
```

### Step 5: Set Environment Variables

In the Vercel dashboard (or via CLI):

```bash
vercel env add X402_ENABLED production
# Value: false

vercel env add ALGORAND_NETWORK production
# Value: testnet

vercel env add ALGOD_URL production
# Value: https://testnet-api.algonode.cloud

vercel env add INDEXER_URL production
# Value: https://testnet-idx.algonode.cloud

vercel env add LLM_PROVIDER production
# Value: groq

vercel env add GROQ_API_KEY production
# Value: your_actual_groq_key
```

Or set them all at once in the Vercel Dashboard:
- Go to your project → **Settings** → **Environment Variables**

Required vars:
| Variable | Value | Required |
|----------|-------|----------|
| `X402_ENABLED` | `false` | ✅ |
| `ALGORAND_NETWORK` | `testnet` | ✅ |
| `ALGOD_URL` | `https://testnet-api.algonode.cloud` | ✅ |
| `INDEXER_URL` | `https://testnet-idx.algonode.cloud` | ✅ |
| `LLM_PROVIDER` | `groq` or `openai` | Optional |
| `GROQ_API_KEY` | your key | Optional |
| `OPENAI_API_KEY` | your key | Optional |

---

## How the Routing Works

```
User visits https://kinetic.vercel.app/exore
    │
    ▼
Vercel checks routes in order:
    1. Does it match /providers, /job, /agent, etc.? → NO (it's /explore)
    2. Does it match /assets/*? → NO
    3. Does it match *.js, *.css, etc.? → NO
    4. Catch-all: /(.*) → web/dist/index.html ✅

React Router loads index.html
React Router sees URL = /explore
Renders <Explore /> component ✅
```

```
User visits https://kinetic.vercel.app/providers
    │
    ▼
Vercel checks routes:
    1. Matches /providers → api/index.py ✅
    
FastAPI handles /providers
Returns JSON list of providers ✅
```

---

## Troubleshooting

### Still getting 404 after deploying?

1. **Make sure you're deploying from the ROOT folder**, not `web/`:
   ```bash
   cd p2p-compute-marketplace   # ← ROOT, not web/
   vercel --prod
   ```

2. **Check the build output**:
   ```bash
   cd web
   npm run build
   ls dist/    # Should show index.html + assets/
   ```

3. **Redeploy with clean build**:
   ```bash
   vercel --prod --force
   ```

### API returns 404?

Check Vercel Functions logs:
- Vercel Dashboard → your project → **Deployments** → latest → **Functions** tab
- Look for errors in `api/index.py`

### `content.js:1454 Video element not found`?

This is a **Chrome DevTools extension warning**, NOT a Kinetic error. It comes from:
- Browser extensions (Grammarly, ad blockers, etc.)
- Chrome's own content scripts

**Fix**: Open Chrome in Guest mode or disable extensions:
```bash
# Windows
chrome.exe --guest

# macOS
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --guest
```

Or just ignore it — it doesn't affect your app.

### Frontend shows blank page?

Check browser console for:
- `Failed to load module` → TypeScript build error. Run `cd web && npm run build` locally to catch errors.
- `404 on assets/` → The asset paths are wrong. Check `vite.config.ts` has `base: '/'`.

---

## Vercel.json Reference

```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/index.py",
      "use": "@vercel/python"
    },
    {
      "src": "web/package.json",
      "use": "@vercel/static-build",
      "config": { "distDir": "web/dist" }
    }
  ],
  "routes": [
    // API routes - ALL backend endpoints
    {
      "src": "/(health|providers|provider|job|jobs|analytics|activity|hub|orgs|scheduler|telemetry|realtime|network|models|datasets|spaces|api-keys|assistant|agent|wallet|escrow|roadmap)/(.*)",
      "dest": "api/index.py"
    },
    {
      "src": "/(health|providers|provider|job|jobs|analytics|activity|hub|orgs|scheduler|telemetry|realtime|network|models|datasets|spaces|api-keys|assistant|agent|wallet|escrow|roadmap)",
      "dest": "api/index.py"
    },
    // Static assets (JS/CSS bundles)
    {
      "src": "/assets/(.*)",
      "dest": "web/dist/assets/$1",
      "headers": { "cache-control": "public, max-age=31536000, immutable" }
    },
    // Other static files
    {
      "src": "/(.*\\.(js|css|svg|png|jpg|jpeg|gif|ico|woff|woff2|ttf|eot|json|txt|xml))",
      "dest": "web/dist/$1"
    },
    // SPA Fallback - EVERYTHING else goes to React
    {
      "src": "/(.*)",
      "dest": "web/dist/index.html",
      "status": 200
    }
  ]
}
```

---

## Quick Verification After Deploy

Visit these URLs in your browser:

| URL | Expected Result |
|-----|-----------------|
| `https://your-app.vercel.app/` | Hub landing page loads |
| `https://your-app.vercel.app/explore` | GPU marketplace loads (no 404) |
| `https://your-app.vercel.app/models` | Model Hub loads |
| `https://your-app.vercel.app/providers` | JSON list of providers |
| `https://your-app.vercel.app/health` | `{"status": "ok"}` JSON |

---

## One-Command Deploy Script

Save as `deploy.sh`:

```bash
#!/bin/bash
set -e

echo "🔧 Building frontend..."
cd web
npm install
npm run build
cd ..

echo "🚀 Deploying to Vercel..."
vercel --prod

echo "✅ Done! Check the URL above."
```

Run:
```bash
chmod +x deploy.sh
./deploy.sh
```

---

**Good luck with your Vercel deployment! 🚀**
