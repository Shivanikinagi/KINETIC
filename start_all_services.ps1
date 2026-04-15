# Kinetic Marketplace - Complete Startup Script
# Starts backend API, agent bridge, and frontend web server

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "    Starting Kinetic Marketplace (Full Stack)" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Check if Python is available
if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Python not found. Please install Python 3.8+" -ForegroundColor Red
    exit 1
}

# Install dependencies if needed
Write-Host "[INFO] Checking dependencies..." -ForegroundColor Yellow
pip install -q fastapi uvicorn python-dotenv sse-starlette py-algorand-sdk httpx

Write-Host ""
Write-Host "Starting services..." -ForegroundColor Green
Write-Host ""

# Start backend API in background
Write-Host "[1/3] Starting Backend API on port 8000..." -ForegroundColor Cyan
$backendJob = Start-Job -ScriptBlock {
    param($path)
    Set-Location $path
    python -m uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
} -ArgumentList (Get-Location).Path

Start-Sleep -Seconds 3

# Start agent bridge in background
Write-Host "[2/3] Starting Agent Bridge on port 3001..." -ForegroundColor Cyan
$agentJob = Start-Job -ScriptBlock {
    param($path)
    Set-Location $path
    python -m uvicorn api.agent_bridge:app --host 0.0.0.0 --port 3001 --reload
} -ArgumentList (Get-Location).Path

Start-Sleep -Seconds 3

# Check if Node.js is available for frontend
if (Get-Command node -ErrorAction SilentlyContinue) {
    Write-Host "[3/3] Starting Frontend (Vite) on port 3000..." -ForegroundColor Cyan
    $frontendJob = Start-Job -ScriptBlock {
        param($path)
        Set-Location "$path\web"
        npm run dev
    } -ArgumentList (Get-Location).Path
} else {
    Write-Host "[3/3] Starting Frontend (Python) on port 3000..." -ForegroundColor Yellow
    $frontendJob = Start-Job -ScriptBlock {
        param($path)
        Set-Location $path
        python web/server.py
    } -ArgumentList (Get-Location).Path
}

Start-Sleep -Seconds 3

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "    Kinetic Marketplace is running!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Services:" -ForegroundColor Cyan
Write-Host "  Frontend:      " -NoNewline -ForegroundColor White
Write-Host "http://localhost:3000" -ForegroundColor Yellow
Write-Host "  Backend API:   " -NoNewline -ForegroundColor White
Write-Host "http://localhost:8000" -ForegroundColor Yellow
Write-Host "  Agent Bridge:  " -NoNewline -ForegroundColor White
Write-Host "http://localhost:3001" -ForegroundColor Yellow
Write-Host ""
Write-Host "Useful URLs:" -ForegroundColor Cyan
Write-Host "  API Docs:      " -NoNewline -ForegroundColor White
Write-Host "http://localhost:8000/docs" -ForegroundColor Yellow
Write-Host "  Realtime SSE:  " -NoNewline -ForegroundColor White
Write-Host "http://localhost:8000/realtime/stream" -ForegroundColor Yellow
Write-Host "  Agent Status:  " -NoNewline -ForegroundColor White
Write-Host "http://localhost:3001/agent/status" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press Ctrl+C to stop all services" -ForegroundColor Red
Write-Host ""

# Show initial job output
Write-Host "[INFO] Checking service status..." -ForegroundColor Yellow
Start-Sleep -Seconds 2

# Monitor jobs
try {
    $iteration = 0
    while ($true) {
        Start-Sleep -Seconds 5
        $iteration++
        
        # Check if jobs are still running
        if ($backendJob.State -ne "Running") {
            Write-Host ""
            Write-Host "[ERROR] Backend API stopped unexpectedly" -ForegroundColor Red
            $backendOutput = Receive-Job -Job $backendJob
            Write-Host $backendOutput -ForegroundColor Red
            break
        }
        if ($agentJob.State -ne "Running") {
            Write-Host ""
            Write-Host "[ERROR] Agent Bridge stopped unexpectedly" -ForegroundColor Red
            $agentOutput = Receive-Job -Job $agentJob
            Write-Host $agentOutput -ForegroundColor Red
            break
        }
        if ($frontendJob.State -ne "Running") {
            Write-Host ""
            Write-Host "[ERROR] Frontend stopped unexpectedly" -ForegroundColor Red
            $frontendOutput = Receive-Job -Job $frontendJob
            Write-Host $frontendOutput -ForegroundColor Red
            break
        }
        
        # Show heartbeat every 30 seconds
        if ($iteration % 6 -eq 0) {
            Write-Host "[$(Get-Date -Format 'HH:mm:ss')] All services running..." -ForegroundColor Green
        } else {
            Write-Host "." -NoNewline -ForegroundColor Green
        }
    }
}
finally {
    Write-Host ""
    Write-Host "[INFO] Stopping all services..." -ForegroundColor Yellow
    Stop-Job -Job $backendJob, $agentJob, $frontendJob -ErrorAction SilentlyContinue
    Remove-Job -Job $backendJob, $agentJob, $frontendJob -ErrorAction SilentlyContinue
    Write-Host "[SUCCESS] All services stopped" -ForegroundColor Green
}
