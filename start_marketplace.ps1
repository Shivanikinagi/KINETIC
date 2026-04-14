# Kinetic Marketplace Startup Script
# Starts both backend API and frontend web server

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "    Starting Kinetic Marketplace" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Check if Python is available
if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Python not found. Please install Python 3.8+" -ForegroundColor Red
    exit 1
}

# Install dependencies if needed
Write-Host "[INFO] Installing dependencies..." -ForegroundColor Yellow
pip install -q fastapi uvicorn python-dotenv sse-starlette py-algorand-sdk

Write-Host ""
Write-Host "Starting services..." -ForegroundColor Green
Write-Host ""

# Start backend API in background
Write-Host "[BACKEND] Starting API on port 8000..." -ForegroundColor Cyan
$backendJob = Start-Job -ScriptBlock {
    param($path)
    Set-Location $path
    python -m uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
} -ArgumentList (Get-Location).Path

Start-Sleep -Seconds 3

# Check if Node.js is available for frontend
if (Get-Command node -ErrorAction SilentlyContinue) {
    Write-Host "[FRONTEND] Starting Vite dev server on port 3000..." -ForegroundColor Cyan
    $frontendJob = Start-Job -ScriptBlock {
        param($path)
        Set-Location "$path\web"
        npm run dev
    } -ArgumentList (Get-Location).Path
} else {
    Write-Host "[WARN] Node.js not found. Starting Python fallback server..." -ForegroundColor Yellow
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
Write-Host "Frontend:  " -NoNewline -ForegroundColor Cyan
Write-Host "http://localhost:3000" -ForegroundColor White
Write-Host "Backend:   " -NoNewline -ForegroundColor Cyan
Write-Host "http://localhost:8000" -ForegroundColor White
Write-Host "API Docs:  " -NoNewline -ForegroundColor Cyan
Write-Host "http://localhost:8000/docs" -ForegroundColor White
Write-Host "Realtime:  " -NoNewline -ForegroundColor Cyan
Write-Host "http://localhost:8000/realtime/stream" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop all services" -ForegroundColor Yellow
Write-Host ""

# Show job output
Write-Host "[INFO] Checking service status..." -ForegroundColor Yellow
Start-Sleep -Seconds 2

# Get job output to see any errors
$backendOutput = Receive-Job -Job $backendJob -Keep
if ($backendOutput) {
    Write-Host "[BACKEND OUTPUT]" -ForegroundColor Cyan
    Write-Host $backendOutput
}

$frontendOutput = Receive-Job -Job $frontendJob -Keep
if ($frontendOutput) {
    Write-Host "[FRONTEND OUTPUT]" -ForegroundColor Cyan
    Write-Host $frontendOutput
}

# Monitor jobs
try {
    while ($true) {
        Start-Sleep -Seconds 5
        
        # Check if jobs are still running
        if ($backendJob.State -ne "Running") {
            Write-Host "[ERROR] Backend stopped unexpectedly" -ForegroundColor Red
            $backendOutput = Receive-Job -Job $backendJob
            Write-Host $backendOutput -ForegroundColor Red
            break
        }
        if ($frontendJob.State -ne "Running") {
            Write-Host "[ERROR] Frontend stopped unexpectedly" -ForegroundColor Red
            $frontendOutput = Receive-Job -Job $frontendJob
            Write-Host $frontendOutput -ForegroundColor Red
            break
        }
        
        Write-Host "." -NoNewline -ForegroundColor Green
    }
}
finally {
    Write-Host ""
    Write-Host "[INFO] Stopping services..." -ForegroundColor Yellow
    Stop-Job -Job $backendJob, $frontendJob -ErrorAction SilentlyContinue
    Remove-Job -Job $backendJob, $frontendJob -ErrorAction SilentlyContinue
    Write-Host "[SUCCESS] All services stopped" -ForegroundColor Green
}
