# Quick Reference Guide

## 🚀 Start the Application

```bash
# Windows
.\start_marketplace.ps1

# Linux/Mac
./start_marketplace.sh
```

## 🌐 URLs

- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- API Docs: http://localhost:8000/docs
- Real-time Stream: http://localhost:8000/realtime/stream

## 🔧 Manual Commands

### Backend
```bash
python -m uvicorn api.main:app --reload
```

### Frontend
```bash
cd web
npm run dev
```

### Install Dependencies
```bash
# Backend
pip install -e .

# Frontend
cd web
npm install
```

## 📝 Key Features

- ✅ Real-time updates via SSE
- ✅ Pera Wallet integration
- ✅ Autonomous agent operation
- ✅ True P2P decentralization
- ✅ Zero human intervention

## 🐛 Troubleshooting

### Buttons not working?
- Refresh browser (Ctrl+F5)
- Check console for errors
- Verify backend is running

### Wallet not connecting?
- Install Pera Wallet app or extension
- Check you're on TestNet
- Clear browser cache

### Real-time updates not showing?
- Check backend is running
- Open http://localhost:8000/realtime/stream
- Check browser console

## 📚 Documentation

- `README.md` - Full documentation
- `FINAL_STATUS.md` - Current status
- `REALTIME_IMPLEMENTATION.md` - Real-time guide
- `BUTTONS_FIXED.md` - Button fixes
- `WALLET_FIX.md` - Wallet integration

## 🎯 Test Checklist

- [ ] Backend running on port 8000
- [ ] Frontend running on port 3000
- [ ] Wallet connects successfully
- [ ] Provision buttons work
- [ ] Real-time updates appear
- [ ] Activity page shows live logs

## 🔑 Environment Variables

```env
# Algorand
ALGOD_SERVER=https://testnet-api.algonode.cloud
INDEXER_SERVER=https://testnet-idx.algonode.cloud

# Provider
PROVIDER_WALLET=YOUR_ADDRESS
PROVIDER_GPU_MODEL=RTX4090
PROVIDER_ENDPOINT=https://your-endpoint.com

# Agent
AGENT_WALLET_MNEMONIC=your 25 word mnemonic
AGENT_MAX_BUDGET_ALGO=100
```

## 📊 Status

✅ All features working
✅ Real-time updates implemented
✅ Wallet integration complete
✅ Buttons functional
✅ Documentation complete

**Ready for demo and deployment!**
