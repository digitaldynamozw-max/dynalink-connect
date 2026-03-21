# Setup Environment Variables for Vercel (PowerShell)

Clear-Host
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   DynaLink Connect - Environment Variables Setup               ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Check if vercel is installed
$vercelCommand = Get-Command vercel -ErrorAction SilentlyContinue
if (-not $vercelCommand) {
    Write-Host "✗ Vercel CLI not installed. Please run: npm install -g vercel" -ForegroundColor Red
    exit 1
}

# Variables to collect
$envVars = @{
    "DATABASE_URL" = "Your MySQL connection string (e.g., mysql://user:pass@host:3306/db)"
    "NEXTAUTH_SECRET" = "Generate with: openssl rand -base64 32"
    "NEXTAUTH_URL" = "Your Vercel app URL (e.g., https://dynalink-connect.vercel.app)"
    "DATABASE_URL" = "file:./dev.db (SQLite database)"
    "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" = "From: https://dashboard.stripe.com/apikeys (Publishable Key)"
}

# Collect values
$values = @{}
foreach ($key in $envVars.Keys) {
    Write-Host ""
    Write-Host "Enter $key" -ForegroundColor Cyan
    Write-Host "Description: $($envVars[$key])" -ForegroundColor Yellow
    
    if ($key -eq "NEXTAUTH_SECRET") {
        Write-Host "Generate a secure key by running: openssl rand -base64 32" -ForegroundColor DarkGray
    }
    
    $value = Read-Host "> "
    if (-not [string]::IsNullOrWhiteSpace($value)) {
        $values[$key] = $value
    } else {
        Write-Host "Skipped (will use existing value if set)" -ForegroundColor Yellow
    }
}

# Confirm before applying
Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   Ready to apply environment variables?                        ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "Variables to be set:" -ForegroundColor Yellow
foreach ($key in $values.Keys) {
    $displayValue = if ($values[$key].Length -gt 30) { $values[$key].Substring(0, 27) + "..." } else { $values[$key] }
    Write-Host "  $key = $displayValue" -ForegroundColor Gray
}

$confirm = Read-Host ""
if ($confirm -eq "y" -or $confirm -eq "Y") {
    Write-Host ""
    Write-Host "Setting environment variables..." -ForegroundColor Cyan
    
    foreach ($key in $values.Keys) {
        if ([string]::IsNullOrWhiteSpace($values[$key]) -eq $false) {
            Write-Host "Setting $key..." -NoNewline
            & vercel env add $key $values[$key] 2>&1 | Out-Null
            Write-Host " ✓" -ForegroundColor Green
        }
    }
    
    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║   Environment variables successfully set!                      ║" -ForegroundColor Green
    Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Deploy to preview: vercel"
    Write-Host "2. Deploy to production: vercel --prod"
    Write-Host "3. Monitor: https://vercel.com/dashboard"
} else {
    Write-Host "Cancelled." -ForegroundColor Yellow
}
