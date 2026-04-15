# Quick Vercel Deployment Script
# This script helps you deploy Kinetic Marketplace to Vercel

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "    Kinetic Marketplace - Vercel Deployment" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Check if git is initialized
if (-not (Test-Path ".git")) {
    Write-Host "[1/5] Initializing Git repository..." -ForegroundColor Yellow
    git init
    Write-Host "✅ Git initialized" -ForegroundColor Green
} else {
    Write-Host "[1/5] Git repository already initialized" -ForegroundColor Green
}

# Check if Vercel CLI is installed
Write-Host ""
Write-Host "[2/5] Checking Vercel CLI..." -ForegroundColor Yellow
if (-not (Get-Command vercel -ErrorAction SilentlyContinue)) {
    Write-Host "⚠️  Vercel CLI not found. Installing..." -ForegroundColor Yellow
    npm install -g vercel
    Write-Host "✅ Vercel CLI installed" -ForegroundColor Green
} else {
    Write-Host "✅ Vercel CLI found" -ForegroundColor Green
}

# Add files to git
Write-Host ""
Write-Host "[3/5] Staging files for deployment..." -ForegroundColor Yellow
git add .
Write-Host "✅ Files staged" -ForegroundColor Green

# Commit changes
Write-Host ""
Write-Host "[4/5] Creating commit..." -ForegroundColor Yellow
$commitMessage = Read-Host "Enter commit message (or press Enter for default)"
if ([string]::IsNullOrWhiteSpace($commitMessage)) {
    $commitMessage = "Deploy to Vercel - $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
}
git commit -m $commitMessage
Write-Host "✅ Commit created" -ForegroundColor Green

# Deploy to Vercel
Write-Host ""
Write-Host "[5/5] Deploying to Vercel..." -ForegroundColor Yellow
Write-Host ""
Write-Host "⚠️  IMPORTANT: You'll need to set environment variables in Vercel dashboard:" -ForegroundColor Yellow
Write-Host "   - PROVIDER_WALLET" -ForegroundColor White
Write-Host "   - PROVIDER_MNEMONIC" -ForegroundColor White
Write-Host "   - Other config (see VERCEL_DEPLOYMENT.md)" -ForegroundColor White
Write-Host ""

$deploy = Read-Host "Ready to deploy? (y/n)"
if ($deploy -eq "y" -or $deploy -eq "Y") {
    vercel --prod
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Green
    Write-Host "    Deployment Complete!" -ForegroundColor Green
    Write-Host "============================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Go to Vercel dashboard" -ForegroundColor White
    Write-Host "2. Add environment variables (Settings → Environment Variables)" -ForegroundColor White
    Write-Host "3. Redeploy if needed" -ForegroundColor White
    Write-Host "4. Test your deployment" -ForegroundColor White
    Write-Host ""
    Write-Host "See VERCEL_DEPLOYMENT.md for detailed instructions" -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "Deployment cancelled. Run this script again when ready." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
