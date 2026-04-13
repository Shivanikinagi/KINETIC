# KINETIC P2P Compute Marketplace Setup Script (PowerShell)

Write-Host "🚀 Setting up KINETIC P2P Compute Marketplace..." -ForegroundColor Cyan
Write-Host ""

# Check prerequisites
Write-Host "📋 Checking prerequisites..." -ForegroundColor Yellow

$pythonInstalled = Get-Command python -ErrorAction SilentlyContinue
if (-not $pythonInstalled) {
    Write-Host "❌ Python 3 is not installed. Please install Python 3.11 or higher." -ForegroundColor Red
    exit 1
}

$nodeInstalled = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeInstalled) {
    Write-Host "❌ Node.js is not installed. Please install Node.js 18 or higher." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Prerequisites check passed" -ForegroundColor Green
Write-Host ""

# Backend setup
Write-Host "🐍 Setting up Python backend..." -ForegroundColor Yellow
python -m venv .venv
.\.venv\Scripts\Activate.ps1

Write-Host "📦 Installing Python dependencies..." -ForegroundColor Yellow
python -m pip install --upgrade pip
pip install -e .

# Create .env if it doesn't exist
if (-not (Test-Path .env)) {
    Write-Host "📝 Creating .env file..." -ForegroundColor Yellow
    Copy-Item .env.example .env
    Write-Host "⚠️  Please edit .env with your configuration" -ForegroundColor Yellow
}

Write-Host "✅ Backend setup complete" -ForegroundColor Green
Write-Host ""

# Frontend setup
Write-Host "⚛️  Setting up React frontend..." -ForegroundColor Yellow
Set-Location frontend

Write-Host "📦 Installing Node dependencies..." -ForegroundColor Yellow
npm install

# Create .env if it doesn't exist
if (-not (Test-Path .env)) {
    Write-Host "📝 Creating frontend .env file..." -ForegroundColor Yellow
    Copy-Item .env.example .env
}

Set-Location ..

Write-Host "✅ Frontend setup complete" -ForegroundColor Green
Write-Host ""

# Summary
Write-Host "🎉 Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📚 Next steps:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Configure your environment:"
Write-Host "   - Edit .env for backend configuration"
Write-Host "   - Edit frontend\.env for frontend configuration"
Write-Host ""
Write-Host "2. Start the backend:"
Write-Host "   .\.venv\Scripts\Activate.ps1"
Write-Host "   python -m uvicorn api.main:app --reload --port 8000"
Write-Host ""
Write-Host "3. Start the frontend (in a new terminal):"
Write-Host "   cd frontend"
Write-Host "   npm run dev"
Write-Host ""
Write-Host "4. Access the application:"
Write-Host "   Frontend: http://localhost:5173"
Write-Host "   Backend API: http://localhost:8000"
Write-Host "   API Docs: http://localhost:8000/docs"
Write-Host ""
Write-Host "📖 For more information, see README.md" -ForegroundColor Cyan
