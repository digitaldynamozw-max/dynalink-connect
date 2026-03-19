# Vercel Deployment Automation Script for DynaLink Connect (PowerShell)

Clear-Host
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║    DynaLink Connect - Vercel Deployment Automation             ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Step 1: Verify Git
Write-Host "[Step 1/6] Verifying Git repository..." -ForegroundColor Cyan
try {
    git rev-parse --git-dir | Out-Null
    Write-Host "✓ Git repository found" -ForegroundColor Green
} catch {
    Write-Host "✗ Git repository not found" -ForegroundColor Red
    exit 1
}

# Step 2: Check Vercel CLI
Write-Host ""
Write-Host "[Step 2/6] Checking Vercel CLI..." -ForegroundColor Cyan
$vercelCommand = Get-Command vercel -ErrorAction SilentlyContinue
if ($vercelCommand) {
    Write-Host "✓ Vercel CLI is installed" -ForegroundColor Green
    vercel --version
} else {
    Write-Host "! Vercel CLI not found. Installing..." -ForegroundColor Yellow
    npm install -g vercel
}

# Step 3: Check Node modules
Write-Host ""
Write-Host "[Step 3/6] Checking project dependencies..." -ForegroundColor Cyan
if (Test-Path "node_modules") {
    Write-Host "✓ Dependencies already installed" -ForegroundColor Green
} else {
    Write-Host "! Installing dependencies..." -ForegroundColor Yellow
    npm install
}

# Step 4: Build test
Write-Host ""
Write-Host "[Step 4/6] Testing build..." -ForegroundColor Cyan
$buildOutput = npm run build 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Build successful" -ForegroundColor Green
} else {
    Write-Host "✗ Build failed - check logs above" -ForegroundColor Red
    Write-Host $buildOutput
}

# Step 5: Environment setup reminder
Write-Host ""
Write-Host "[Step 5/6] Environment Variables Required" -ForegroundColor Cyan
Write-Host "Please have the following ready:" -ForegroundColor Yellow
Write-Host "  • DATABASE_URL (MySQL connection string)"
Write-Host "  • NEXTAUTH_SECRET (generated secure key)"
Write-Host "  • STRIPE_SECRET_KEY"
Write-Host "  • NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"

# Step 6: Deploy
Write-Host ""
Write-Host "[Step 6/6] Initiating Vercel deployment..." -ForegroundColor Cyan
Write-Host "Note: You will be prompted to:" -ForegroundColor Yellow
Write-Host "  1. Login to Vercel (if not already logged in)"
Write-Host "  2. Link to your project"
Write-Host "  3. Add environment variables"
Write-Host ""
$response = Read-Host "Ready to deploy? (y/n)"
if ($response -eq "y" -or $response -eq "Y") {
    vercel
} else {
    Write-Host "Deployment cancelled." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║    Deployment initialization complete!                         ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:"
Write-Host "1. Add your environment variables in Vercel dashboard"
Write-Host "2. Run: vercel --prod (to deploy to production)"
Write-Host "3. Monitor: https://vercel.com/dashboard"
