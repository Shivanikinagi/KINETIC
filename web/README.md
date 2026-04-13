# Kinetic Marketplace Frontend

This is the web frontend for the P2P Compute Marketplace, built using the Stitch Algorand Compute Exchange design system.

## Design System

The frontend follows the "Quantum Ledger" design philosophy with:
- **Dark theme** with obsidian tones (#131314 background)
- **Electric cyan accents** (#00f5ff, #e9feff) for high-frequency energy
- **Glassmorphism** for floating panels and modals
- **Space Grotesk** for headlines and **Inter** for body text
- **No hard borders** - layout defined by surface color shifts

## Structure

```
web/
├── index.html           # Homepage with hero and featured providers
├── providers.html       # Full provider marketplace with filters
├── activity.html        # Agent activity and compute proofs (TODO)
├── wallet.html          # Transaction ledger and wallet (TODO)
├── server.py            # FastAPI server to serve static files
├── static/
│   └── js/
│       ├── config.js    # Tailwind configuration
│       ├── app.js       # Main application logic
│       └── providers.js # Providers page logic
└── README.md
```

## Running the Frontend

### Option 1: Standalone Frontend Server (Port 3000)

```bash
cd p2p-compute-marketplace/web
python server.py
```

Then open http://localhost:3000

### Option 2: Integrated with Backend (Port 8000)

The backend API can also serve the frontend. Update `api/main.py` to mount the static files.

## API Integration

The frontend connects to the backend API at:
- **Development**: http://localhost:8000
- **Production**: Same origin as frontend

### Endpoints Used

- `GET /providers` - List all compute providers
- `GET /health` - Backend health check
- `POST /job` - Submit compute job (requires wallet)

## Features

### Implemented
- ✅ Homepage with hero section
- ✅ Featured providers grid
- ✅ Live market statistics
- ✅ Full provider marketplace with filters
- ✅ Dynamic data loading from backend API
- ✅ Responsive design
- ✅ Stitch design system styling

### TODO
- ⏳ Wallet integration (Pera, Defly via @txnlab/use-wallet)
- ⏳ Activity/proofs page
- ⏳ Transaction ledger page
- ⏳ Smart contract integration (escrow, registry)
- ⏳ Real-time updates via WebSocket
- ⏳ Search and filter functionality
- ⏳ Job submission flow

## Development

### Adding New Pages

1. Create HTML file in `web/` directory
2. Add route in `server.py`
3. Create corresponding JS file in `static/js/`
4. Update navigation links in all pages

### Styling Guidelines

Follow the Stitch design system principles:
- Use surface-container tiers for depth
- Apply glassmorphism for floating elements
- Use cyan gradients for primary CTAs
- Maintain 8px grid system
- No 1px solid borders - use surface shifts

## Backend Requirements

The backend must be running on port 8000 with CORS enabled:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

Requires support for:
- CSS backdrop-filter (glassmorphism)
- CSS Grid
- Fetch API
- ES6+ JavaScript
