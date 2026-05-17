# Kinetic Marketplace Frontend

The GPU Hub — browse, compare, and deploy GPUs in one click. Built on Algorand.

## Structure

```
web/
├── index.html           # Landing page
├── explore.html         # GPU catalog + templates + deploy
├── dashboard.html       # Unified jobs, analytics, proofs
├── provide.html         # Provider registration
├── vite.config.js       # Vite config with API proxy
├── static/
│   └── js/
│       ├── shared.js    # Shared UI utilities
│       ├── wallet.js    # Pera Wallet integration
│       └── wallet-init.js # Wallet button binding
└── README.md
```

## Running

```bash
cd web
npm install  # if needed
npx vite       # dev server on :3000 with API proxy to :8000
```

## Pages

- **Hub** (`/`) — Landing with live stats and featured GPUs
- **Explore** (`/explore.html`) — Searchable GPU catalog + one-click deploy
- **Dashboard** (`/dashboard.html`) — Jobs, proofs, network stats
- **Provide** (`/provide.html`) — Register GPU and start earning

## API Proxy

Vite dev server proxies API calls to avoid CORS:
- `/api/*` → `localhost:8000`
- `/providers`, `/jobs`, `/analytics`, `/hub/*` → `localhost:8000`

## Design

- Dark theme (`#0b0d10` background)
- Cyan accents (`#22d3ee`)
- Glassmorphism panels
- Space Grotesk + Inter fonts
