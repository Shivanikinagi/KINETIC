# 🚀 Start the Application

## Quick Start (After Fix)

The styling issues have been fixed! Follow these steps to start the app:

### 1. Start Backend (Terminal 1)

```bash
# Navigate to project root
cd p2p-compute-marketplace

# Activate virtual environment
.\.venv\Scripts\Activate.ps1  # Windows
# or
source .venv/bin/activate      # Linux/Mac

# Start API server
python -m uvicorn api.main:app --reload --port 8000
```

**Expected Output**:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete.
```

### 2. Start Frontend (Terminal 2)

```bash
# Navigate to frontend
cd p2p-compute-marketplace/frontend

# Start dev server
npm run dev
```

**Expected Output**:
```
VITE v5.4.2  ready in 500 ms

➜  Local:   http://localhost:5173/
➜  Network: http://192.168.x.x:5173/
```

### 3. Open in Browser

Navigate to: **http://localhost:5173**

You should see:
- ✅ Dark background with cyan accents
- ✅ "KINETIC" logo in top left
- ✅ "LEVERAGE QUANTUM SPEED" hero text
- ✅ Styled buttons and cards
- ✅ Proper fonts and spacing

## Verify Everything Works

### Check Backend:
```bash
curl http://localhost:8000/health
# Should return: {"status":"ok",...}

curl http://localhost:8000/providers
# Should return: [{"id":"provider_001",...}]
```

### Check Frontend:
1. Click "Connect Wallet" button
2. Navigate between pages (Marketplace, Activity, Transactions)
3. Check browser console (F12) - should have no errors
4. Verify styling looks correct

## Troubleshooting

### Backend won't start:
```bash
# Check Python version
python --version  # Should be 3.11+

# Reinstall dependencies
pip install -e .
```

### Frontend won't start:
```bash
# Check Node version
node --version  # Should be 18+

# Reinstall dependencies
npm install

# Clear cache
rm -rf node_modules/.vite
npm run dev
```

### Styling still broken:
```bash
# Run the fix script
.\fix-fonts.ps1

# Restart dev server
npm run dev
```

### Port already in use:
```bash
# Backend (change port)
python -m uvicorn api.main:app --reload --port 8001

# Frontend (change port in vite.config.ts)
# Or kill the process using the port
```

## What You Should See

### Homepage (Dashboard):
- Large hero section with "LEVERAGE QUANTUM SPEED"
- Live market stats (Total Nodes, Active GPUs, etc.)
- Featured providers grid with cards
- "READY TO DEPLOY YOUR OWN GRID?" CTA section

### Providers Page:
- Grid of provider cards
- GPU specifications and pricing
- "Rent" buttons
- Status indicators (Active/Reserved)

### Activity Page:
- Active compute cycle panel
- Circular progress indicator
- Proof of compute timeline
- Live kernel logs terminal

### Transactions Page:
- Wallet balance card
- Total compute spent analytics
- Transaction ledger table
- Quick action cards

## API Endpoints Available

- `GET /health` - Health check
- `GET /providers` - List all providers
- `GET /providers/me` - Current provider info
- `GET /agent/status` - Agent status
- `GET /telemetry` - Telemetry data
- `POST /job` - Submit compute job

## Development Tips

### Hot Reload:
- Frontend: Changes auto-refresh
- Backend: API restarts with `--reload` flag

### API Documentation:
Visit: http://localhost:8000/docs

### Check Logs:
- Backend: Terminal output
- Frontend: Browser console (F12)

### Test API:
Use the Swagger UI at http://localhost:8000/docs to test endpoints

## Common Commands

```bash
# Frontend
npm run dev      # Start dev server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Check TypeScript

# Backend
python -m uvicorn api.main:app --reload  # Start with hot reload
python -m pytest                          # Run tests
```

## Success Checklist

- [ ] Backend running on port 8000
- [ ] Frontend running on port 5173
- [ ] Homepage loads with correct styling
- [ ] Navigation works between pages
- [ ] No console errors
- [ ] Buttons are clickable
- [ ] Fonts look correct
- [ ] Colors are dark + cyan theme

## Need Help?

- 📖 See `TROUBLESHOOTING.md` for detailed help
- 📖 See `STYLING_FIX_SUMMARY.md` for what was fixed
- 📖 See `README.md` for full documentation
- 📖 See `QUICKSTART.md` for setup instructions

---

**Ready to go!** 🎉

Just run the two commands above and you're all set!
