#!/bin/bash

# KINETIC P2P Compute Marketplace Setup Script

set -e

echo "🚀 Setting up KINETIC P2P Compute Marketplace..."
echo ""

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.11 or higher."
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18 or higher."
    exit 1
fi

echo "✅ Prerequisites check passed"
echo ""

# Backend setup
echo "🐍 Setting up Python backend..."
python3 -m venv .venv
source .venv/bin/activate

echo "📦 Installing Python dependencies..."
pip install --upgrade pip
pip install -e .

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "⚠️  Please edit .env with your configuration"
fi

echo "✅ Backend setup complete"
echo ""

# Frontend setup
echo "⚛️  Setting up React frontend..."
cd frontend

echo "📦 Installing Node dependencies..."
npm install

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating frontend .env file..."
    cp .env.example .env
fi

cd ..

echo "✅ Frontend setup complete"
echo ""

# Summary
echo "🎉 Setup complete!"
echo ""
echo "📚 Next steps:"
echo ""
echo "1. Configure your environment:"
echo "   - Edit .env for backend configuration"
echo "   - Edit frontend/.env for frontend configuration"
echo ""
echo "2. Start the backend:"
echo "   source .venv/bin/activate"
echo "   python -m uvicorn api.main:app --reload --port 8000"
echo ""
echo "3. Start the frontend (in a new terminal):"
echo "   cd frontend"
echo "   npm run dev"
echo ""
echo "4. Access the application:"
echo "   Frontend: http://localhost:5173"
echo "   Backend API: http://localhost:8000"
echo "   API Docs: http://localhost:8000/docs"
echo ""
echo "📖 For more information, see README.md"
