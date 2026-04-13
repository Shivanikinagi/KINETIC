# Kinetic Marketplace Startup Script
# Starts both backend API and frontend web server

Write-Host "=" -NoNewline -ForegroundColor Cyan
Write-Host ("=" * 59) -ForegroundColor Cyan
Write-Host "🚀 Starting Kinetic Marketplace" -ForegroundColor Cyan
Write-Host "=" -NoNewline -ForegroundColor Cyan
Write-Host ("=" * 59) -ForegroundColor Cyan
Write-Host ""

# Check if Python is available
if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Python not found. Please install Python 3.8+" -ForegroundColor Red
    exit 1
}

# Check if virtual environment exists
if (-not (Test-Path ".venv")) {
    Write-Host "⚠️  Virtual environment not found. Creating..." -ForegroundColor Yellow
    python -m venv .venv
}

# Activate virtual environment
Write-Host "🔧 Activating virtual environment..." -ForegroundColor Yellow
& .\.venv\Scripts\Activate.ps1

# Install dependencies if needed
Write-Host "📦 Checking dependencies..." -ForegroundColor Yellow
pip install -q fastapi uvicorn python-dotenv

Write-Host ""
Write-Host "Starting services..." -ForegroundColor Green
Write-Host ""

# Start backend API in background
Write-Host "🔌 Starting Backend API on port 8000..." -ForegroundColor Cyan
$backendJob = Start-Job -ScriptBlock {
    param($path)
    Set-Location $path
    & .\.venv\Scripts\Activate.ps1
    python -m uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
} -ArgumentList (Get-Location).Path

Start-Sleep -Seconds 2

# Start frontend server in background
Write-Host "🌐 Starting Frontend Server on port 3000..." -ForegroundColor Cyan
$frontendJob = Start-Job -ScriptBlock {
    param($path)
    Set-Location $path
    & .\.venv\Scripts\Activate.ps1
    python web/server.py
} -ArgumentList (Get-Location).Path

Start-Sleep -Seconds 2

Write-Host ""
Write-Host "=" -NoNewline -ForegroundColor Green
Write-Host ("=" * 59) -ForegroundColor Green
Write-Host "✅ Kinetic Marketplace is running!" -ForegroundColor Green
Write-Host "=" -NoNewline -ForegroundColor Green
Write-Host ("=" * 59) -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Frontend:  " -NoNewline -ForegroundColor Cyan
Write-Host "http://localhost:3000" -ForegroundColor White
Write-Host "🔌 Backend:   " -NoNewline -ForegroundColor Cyan
Write-Host "http://localhost:8000" -ForegroundColor White
Write-Host "📚 API Docs:  " -NoNewline -ForegroundColor Cyan
Write-Host "http://localhost:8000/docs" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop all services" -ForegroundColor Yellow
Write-Host ""

# Monitor jobs
try {
    while ($true) {
        Start-Sleep -Seconds 1
        
        # Check if jobs are still running
        if ($backendJob.State -ne "Running") {
            Write-Host "❌ Backend stopped unexpectedly" -ForegroundColor Red
            break
        }
        if ($frontendJob.State -ne "Running") {
            Write-Host "❌ Frontend stopped unexpectedly" -ForegroundColor Red
            break
        }
    }
}
finally {
    Write-Host ""
    Write-Host "🛑 Stopping services..." -ForegroundColor Yellow
    Stop-Job -Job $backendJob, $frontendJob
    Remove-Job -Job $backendJob, $frontendJob
    Write-Host "✅ All services stopped" -ForegroundColor Green
}
