# Complete Vercel Deployment Automation (PowerShell)
# Usage: .\auto-deploy.ps1

param(
    [switch]$SkipBuild = $false,
    [switch]$SkipGit = $false,
    [switch]$Interactive = $false
)

Clear-Host
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "   DynaLink Connect - Complete Vercel Deployment" -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host ""

$totalSteps = 7
$currentStep = 0

# Function to show progress
function Show-Step {
    param([string]$message)
    $script:currentStep++
    Write-Host "[$script:currentStep/$totalSteps] $message" -ForegroundColor Cyan
}

# Function to show success
function Show-Success {
    param([string]$message)
    Write-Host "[OK] $message" -ForegroundColor Green
}

# Function to show error
function Show-Error {
    param([string]$message)
    Write-Host "[ERROR] $message" -ForegroundColor Red
}

# Function to show warning
function Show-Warning {
    param([string]$message)
    Write-Host "[WARN] $message" -ForegroundColor Yellow
}

# Step 1: Verify Git and commit
if (-not $SkipGit) {
    Show-Step "Verifying Git repository"
    try {
        git rev-parse --git-dir | Out-Null
        Show-Success "Git repository found"
        
        $status = git status --porcelain
        if ($status) {
            Show-Warning "Uncommitted changes detected"
            Write-Host "Staging and committing changes..." -ForegroundColor Yellow
            git add .
            git commit -m "Prepare for Vercel deployment"
            Show-Success "Changes committed"
        } else {
            Show-Success "Repository is clean"
        }
    } catch {
        Show-Error "Git repository not found"
        exit 1
    }
}

# Step 2: Verify Vercel CLI
Show-Step "Checking Vercel CLI"
$vercelCommand = Get-Command vercel -ErrorAction SilentlyContinue
if ($vercelCommand) {
    Show-Success "Vercel CLI is installed"
} else {
    Show-Warning "Installing Vercel CLI"
    npm install -g vercel
    if ($LASTEXITCODE -eq 0) {
        Show-Success "Vercel CLI installed"
    } else {
        Show-Error "Failed to install Vercel CLI"
        exit 1
    }
}

# Step 3: Install dependencies
Show-Step "Installing dependencies"
if (Test-Path "node_modules") {
    Show-Success "Dependencies already installed"
} else {
    Write-Host "Installing packages..." -ForegroundColor Gray
    npm install
    if ($LASTEXITCODE -eq 0) {
        Show-Success "Dependencies installed"
    } else {
        Show-Error "Failed to install dependencies"
        exit 1
    }
}

# Step 4: Build test
if (-not $SkipBuild) {
    Show-Step "Running build test"
    Write-Host "Building project..." -ForegroundColor Gray
    npm run build 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Show-Success "Build successful"
    } else {
        Show-Error "Build failed"
        Write-Host "Try running: npm run build"
        exit 1
    }
}

# Step 5: Check authentication
Show-Step "Checking Vercel authentication"
$auth = vercel whoami 2>&1
if ($auth -contains "Not authenticated") {
    Show-Warning "Not authenticated with Vercel"
    Write-Host "Logging in..." -ForegroundColor Yellow
    vercel login
    if ($LASTEXITCODE -eq 0) {
        Show-Success "Successfully logged in"
    } else {
        Show-Error "Authentication failed"
        exit 1
    }
} else {
    Show-Success "Authenticated"
}

# Step 6: Link or create project
Show-Step "Setting up Vercel project"
if (Test-Path ".vercel") {
    Show-Success "Project already linked"
} else {
    Write-Host "Linking project..." -ForegroundColor Yellow
    vercel link --confirm
    if ($LASTEXITCODE -eq 0) {
        Show-Success "Project linked"
    } else {
        Show-Error "Failed to link project"
        exit 1
    }
}

# Step 7: Environment variables
Show-Step "Environment variables setup"
Write-Host ""
Write-Host "Environment Variables Status:" -ForegroundColor Cyan
Write-Host "  - Required variables must be set in Vercel dashboard" -ForegroundColor Gray
Write-Host "  - Visit: https://vercel.com/dashboard" -ForegroundColor Gray
Write-Host ""
Write-Host "Required environment variables:" -ForegroundColor Yellow
Write-Host "  1. DATABASE_URL" -ForegroundColor Gray
Write-Host "  2. NEXTAUTH_SECRET" -ForegroundColor Gray
Write-Host "  3. NEXTAUTH_URL" -ForegroundColor Gray
Write-Host "  4. STRIPE_SECRET_KEY" -ForegroundColor Gray
Write-Host "  5. NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" -ForegroundColor Gray

if ($Interactive) {
    Write-Host ""
    $setupEnv = Read-Host "Setup environment variables now? (y/n)"
    if ($setupEnv -eq "y" -or $setupEnv -eq "Y") {
        & ".\setup-env.ps1"
    }
}

# Deployment ready
Write-Host ""
Write-Host "==================================================================" -ForegroundColor Green
Write-Host "   Deployment Ready!" -ForegroundColor Green
Write-Host "==================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Set environment variables in Vercel dashboard" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Deploy to preview:" -ForegroundColor Gray
Write-Host "   vercel" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Deploy to production:" -ForegroundColor Gray
Write-Host "   vercel --prod" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Monitor deployment:" -ForegroundColor Gray
Write-Host "   https://vercel.com/dashboard" -ForegroundColor Gray
Write-Host ""
