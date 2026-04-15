# Start Agent Bridge on port 3001
# This service handles autonomous agent job dispatching

Write-Host "Starting Kinetic Agent Bridge..." -ForegroundColor Cyan
Write-Host ""

# Check if Python is available
try {
    $pythonVersion = python --version 2>&1
    Write-Host "Python: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "Error: Python not found. Please install Python 3.8+" -ForegroundColor Red
    exit 1
}

# Check if we're in the right directory
if (-not (Test-Path "api/agent_bridge.py")) {
    Write-Host "Error: Must run from p2p-compute-marketplace directory" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Agent Bridge will run on: http://localhost:3001" -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
Write-Host ""

# Start the agent bridge
python -m uvicorn api.agent_bridge:app --host 0.0.0.0 --port 3001 --reload
