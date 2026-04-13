#!/bin/bash

# Kinetic Marketplace Startup Script
# Starts both backend API and frontend web server

echo "============================================================"
echo "🚀 Starting Kinetic Marketplace"
echo "============================================================"
echo ""

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python not found. Please install Python 3.8+"
    exit 1
fi

# Check if virtual environment exists
if [ ! -d ".venv" ]; then
    echo "⚠️  Virtual environment not found. Creating..."
    python3 -m venv .venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source .venv/bin/activate

# Install dependencies if needed
echo "📦 Checking dependencies..."
pip install -q fastapi uvicorn python-dotenv

echo ""
echo "Starting services..."
echo ""

# Start backend API in background
echo "🔌 Starting Backend API on port 8000..."
python -m uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

sleep 2

# Start frontend server in background
echo "🌐 Starting Frontend Server on port 3000..."
python web/server.py &
FRONTEND_PID=$!

sleep 2

echo ""
echo "============================================================"
echo "✅ Kinetic Marketplace is running!"
echo "============================================================"
echo ""
echo "🌐 Frontend:  http://localhost:3000"
echo "🔌 Backend:   http://localhost:8000"
echo "📚 API Docs:  http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Trap Ctrl+C and cleanup
cleanup() {
    echo ""
    echo "🛑 Stopping services..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    echo "✅ All services stopped"
    exit 0
}

trap cleanup INT TERM

# Wait for processes
wait
