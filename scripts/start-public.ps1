# Smart Media Converter - Smart Startup System v1.1

$ErrorActionPreference = "Continue"
$Script:ProcessIds = @()
$Script:TunnelUrl = ""
$Script:BackendTunnelUrl = ""

function Write-Banner {
    Clear-Host
    Write-Host ""
    Write-Host "  ======================================================================" -ForegroundColor Cyan
    Write-Host "       Smart Media Converter - Smart Startup System v1.1               " -ForegroundColor Cyan
    Write-Host "  ======================================================================" -ForegroundColor Cyan
    Write-Host ""
}

function Write-Step {
    param([string]$Step, [string]$Message)
    Write-Host "  [$Step] " -ForegroundColor Yellow -NoNewline
    Write-Host $Message -ForegroundColor White
}

function Write-Success {
    param([string]$Message)
    Write-Host "  [OK] " -ForegroundColor Green -NoNewline
    Write-Host $Message -ForegroundColor Green
}

function Write-Warn {
    param([string]$Message)
    Write-Host "  [!] " -ForegroundColor Yellow -NoNewline
    Write-Host $Message -ForegroundColor Yellow
}

# Step 1: Update Dependencies
function Update-Dependencies {
    Write-Host ""
    Write-Host "  === Step 1: Updating Dependencies ===" -ForegroundColor Cyan
    Write-Host ""
    
    Write-Step "1.1" "Updating yt-dlp..."
    try {
        $null = python -m pip install -U --pre yt-dlp 2>&1
        $ytdlpVersion = python -m yt_dlp --version 2>&1
        Write-Success "yt-dlp: $ytdlpVersion"
    }
    catch {
        Write-Warn "Could not update yt-dlp"
    }
    
    Write-Step "1.2" "Updating Frontend packages..."
    try {
        Push-Location "$PSScriptRoot\.."
        $null = npm install 2>&1
        Write-Success "Frontend packages updated"
        Pop-Location
    }
    catch {
        Write-Warn "Could not update frontend"
        Pop-Location
    }
    
    Write-Step "1.3" "Updating Backend packages..."
    try {
        Push-Location "$PSScriptRoot\..\backend"
        $null = npm install 2>&1
        Write-Success "Backend packages updated"
        Pop-Location
    }
    catch {
        Write-Warn "Could not update backend"
        Pop-Location
    }
    
    Write-Host ""
}

# Step 2: Kill Existing Processes
function Stop-ExistingProcesses {
    Write-Host "  === Step 2: Cleaning Up ===" -ForegroundColor Cyan
    Write-Host ""
    
    Write-Step "2.1" "Stopping existing processes (if any)..."
    try {
        # Redirect error to null and continue on error to prevent script failure if no processes exist
        Stop-Process -Name "node" -ErrorAction SilentlyContinue -Force
        Stop-Process -Name "cloudflared" -ErrorAction SilentlyContinue -Force
        
        # Also try taskkill as a fallback
        taskkill /F /IM node.exe /T 2>$null | Out-Null
        taskkill /F /IM cloudflared.exe /T 2>$null | Out-Null
    }
    catch {
        # Silently ignore errors
    }
    
    Start-Sleep -Seconds 2
    Write-Success "Cleanup complete"
    Write-Host ""
}

# Step 3: Start Backend
function Start-BackendServer {
    Write-Host "  === Step 3: Starting Backend Server ===" -ForegroundColor Cyan
    Write-Host ""
    
    Write-Step "3.1" "Starting Backend on port 3001 (with hot reload)..."
    $backendPath = "$PSScriptRoot\..\backend"
    
    # Start with nodemon for hot reload - changes to code will auto-restart
    $proc = Start-Process -FilePath "cmd" -ArgumentList "/c", "cd /d `"$backendPath`" && npm run dev" -PassThru -WindowStyle Minimized
    $Script:ProcessIds += $proc.Id
    
    Write-Step "3.2" "Waiting for Backend (up to 45 seconds)..."
    $maxAttempts = 45
    $attempt = 0
    $ready = $false
    
    while ($attempt -lt $maxAttempts -and -not $ready) {
        Start-Sleep -Seconds 1
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:3001/api/health" -TimeoutSec 2 -UseBasicParsing -ErrorAction SilentlyContinue
            if ($response.StatusCode -eq 200) { $ready = $true }
        }
        catch {
            $attempt++
            if ($attempt % 5 -eq 0) { Write-Host "." -NoNewline }
        }
    }
    Write-Host ""
    
    if ($ready) {
        Write-Success "Backend running on http://localhost:3001"
    }
    else {
        Write-Warn "Backend may still be starting..."
    }
    Write-Host ""
}

# Step 4: Start Frontend
function Start-FrontendServer {
    Write-Host "  === Step 4: Starting Frontend Server ===" -ForegroundColor Cyan
    Write-Host ""
    
    Write-Step "4.1" "Starting Vite on port 8080..."
    
    # Start in a new window
    $proc = Start-Process -FilePath "cmd" -ArgumentList "/c", "cd /d `"$PSScriptRoot\..`" && npm run dev" -PassThru -WindowStyle Minimized
    $Script:ProcessIds += $proc.Id
    
    Write-Step "4.2" "Waiting for Frontend (up to 30 seconds)..."
    $maxAttempts = 30
    $attempt = 0
    $ready = $false
    
    while ($attempt -lt $maxAttempts -and -not $ready) {
        Start-Sleep -Seconds 1
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:8080" -TimeoutSec 2 -UseBasicParsing -ErrorAction SilentlyContinue
            if ($response.StatusCode -eq 200) { $ready = $true }
        }
        catch {
            $attempt++
            if ($attempt % 5 -eq 0) { Write-Host "." -NoNewline }
        }
    }
    Write-Host ""
    
    if ($ready) {
        Write-Success "Frontend running on http://localhost:8080"
    }
    else {
        Write-Warn "Frontend may still be starting..."
    }
    Write-Host ""
}

# Step 5: Start Cloudflare Tunnels
function Start-CloudflareTunnels {
    Write-Host "  === Step 5: Starting Cloudflare Tunnels ===" -ForegroundColor Cyan
    Write-Host ""
    
    # Frontend Tunnel
    Write-Step "5.1" "Creating Frontend tunnel (port 8080)..."
    $frontendLogFile = "$env:TEMP\cf_frontend_$(Get-Date -Format 'yyyyMMddHHmmss').log"
    $proc = Start-Process -FilePath "cloudflared" -ArgumentList "tunnel", "--url", "http://localhost:8080" -PassThru -WindowStyle Hidden -RedirectStandardError $frontendLogFile
    $Script:ProcessIds += $proc.Id
    
    Write-Step "5.2" "Waiting for Frontend URL..."
    $maxAttempts = 45
    $attempt = 0
    
    while ($attempt -lt $maxAttempts) {
        Start-Sleep -Seconds 1
        if (Test-Path $frontendLogFile) {
            $content = Get-Content $frontendLogFile -Raw -ErrorAction SilentlyContinue
            if ($content -match "https://[a-z0-9-]+\.trycloudflare\.com") {
                $Script:TunnelUrl = $Matches[0]
                break
            }
        }
        $attempt++
        if ($attempt % 5 -eq 0) { Write-Host "." -NoNewline }
    }
    Write-Host ""
    
    if ($Script:TunnelUrl) {
        Write-Success "Frontend URL: $($Script:TunnelUrl)"
    }
    else {
        Write-Warn "Could not get Frontend URL"
    }
    
    # Backend Tunnel
    Write-Step "5.3" "Creating Backend tunnel (port 3001)..."
    $backendLogFile = "$env:TEMP\cf_backend_$(Get-Date -Format 'yyyyMMddHHmmss').log"
    $proc = Start-Process -FilePath "cloudflared" -ArgumentList "tunnel", "--url", "http://localhost:3001" -PassThru -WindowStyle Hidden -RedirectStandardError $backendLogFile
    $Script:ProcessIds += $proc.Id
    
    Write-Step "5.4" "Waiting for Backend URL..."
    $attempt = 0
    
    while ($attempt -lt $maxAttempts) {
        Start-Sleep -Seconds 1
        if (Test-Path $backendLogFile) {
            $content = Get-Content $backendLogFile -Raw -ErrorAction SilentlyContinue
            if ($content -match "https://[a-z0-9-]+\.trycloudflare\.com") {
                $Script:BackendTunnelUrl = $Matches[0]
                break
            }
        }
        $attempt++
        if ($attempt % 5 -eq 0) { Write-Host "." -NoNewline }
    }
    Write-Host ""
    
    if ($Script:BackendTunnelUrl) {
        Write-Success "Backend URL: $($Script:BackendTunnelUrl)"
        
        # Inject config into public/api-config.js
        Write-Step "5.5" "Injecting API configuration..."
        $configPath = "$PSScriptRoot\..\public\api-config.js"
        $timestamp = [DateTimeOffset]::Now.ToUnixTimeMilliseconds()
        $configContent = @"
/**
 * Runtime API Configuration
 * Auto-generated by start.ps1 - DO NOT EDIT MANUALLY
 * Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
 */
window.__API_CONFIG__ = {
  backendUrl: '$($Script:BackendTunnelUrl)',
  frontendUrl: '$($Script:TunnelUrl)',
  timestamp: $timestamp
};
"@
        Set-Content -Path $configPath -Value $configContent -Encoding UTF8
        Write-Success "API config injected successfully"
    }
    else {
        Write-Warn "Could not get Backend URL"
    }
    Write-Host ""
}

# Step 6: Health Check
function Show-HealthReport {
    Write-Host "  === Step 6: Health Check ===" -ForegroundColor Cyan
    Write-Host ""
    
    # Give servers a bit more time
    Start-Sleep -Seconds 3
    
    $allHealthy = $true
    
    Write-Step "6.1" "Checking Backend..."
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3001/api/health" -TimeoutSec 10 -UseBasicParsing
        Write-Success "Backend: OK (Port 3001)"
    }
    catch {
        Write-Host "  [X] Backend: NOT responding" -ForegroundColor Red
        $allHealthy = $false
    }
    
    Write-Step "6.2" "Checking Frontend..."
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8080" -TimeoutSec 10 -UseBasicParsing
        Write-Success "Frontend: OK (Port 8080)"
    }
    catch {
        Write-Host "  [X] Frontend: NOT responding" -ForegroundColor Red
        $allHealthy = $false
    }
    
    Write-Step "6.3" "Checking yt-dlp..."
    try {
        $ytdlpVersion = python -m yt_dlp --version 2>&1
        Write-Success "yt-dlp: $ytdlpVersion"
    }
    catch {
        Write-Warn "yt-dlp: Not available"
    }
    
    return $allHealthy
}

# Final Report
function Show-FinalReport {
    param([bool]$AllHealthy)
    
    Write-Host ""
    Write-Host ""
    
    if ($AllHealthy) {
        Write-Host "  ======================================================================" -ForegroundColor Green
        Write-Host "     SYSTEM RUNNING SUCCESSFULLY - NO ISSUES DETECTED!                 " -ForegroundColor Green
        Write-Host "  ======================================================================" -ForegroundColor Green
    }
    else {
        Write-Host "  ======================================================================" -ForegroundColor Yellow
        Write-Host "     System started - Some services may still be initializing          " -ForegroundColor Yellow
        Write-Host "  ======================================================================" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "  +--------------------------------------------------------------------+" -ForegroundColor Cyan
    Write-Host "  |                         LINKS                                      |" -ForegroundColor Cyan
    Write-Host "  +--------------------------------------------------------------------+" -ForegroundColor Cyan
    Write-Host "  |  Local Frontend:  http://localhost:8080                            |" -ForegroundColor White
    Write-Host "  |  Local Backend:   http://localhost:3001/api/health                 |" -ForegroundColor White
    Write-Host "  +--------------------------------------------------------------------+" -ForegroundColor Cyan
    
    if ($Script:TunnelUrl) {
        Write-Host "  |  PUBLIC SITE:    $($Script:TunnelUrl)" -ForegroundColor Green
    }
    if ($Script:BackendTunnelUrl) {
        Write-Host "  |  PUBLIC API:     $($Script:BackendTunnelUrl)" -ForegroundColor Green
    }
    
    Write-Host "  +--------------------------------------------------------------------+" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Services are running in minimized windows." -ForegroundColor DarkGray
    Write-Host "  Close this window or press Ctrl+C to stop all services." -ForegroundColor DarkGray
    Write-Host ""
}

# Cleanup - Fixed: use $processId instead of $pid (reserved)
function Stop-AllServices {
    Write-Host ""
    Write-Host "  Stopping all services..." -ForegroundColor Yellow
    
    foreach ($processId in $Script:ProcessIds) {
        try { Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue } catch {}
    }
    
    taskkill /F /IM node.exe 2>$null | Out-Null
    taskkill /F /IM cloudflared.exe 2>$null | Out-Null
    
    Write-Host "  All services stopped. Goodbye!" -ForegroundColor Green
    Write-Host ""
}

# Main
try {
    Write-Banner
    Update-Dependencies
    Stop-ExistingProcesses
    Start-BackendServer
    Start-FrontendServer
    Start-CloudflareTunnels
    $allHealthy = Show-HealthReport
    Show-FinalReport -AllHealthy $allHealthy
    
    # Keep running - wait for user to close window or Ctrl+C
    Write-Host "  Waiting... (Press Enter to stop services)" -ForegroundColor Cyan
    Read-Host
    
}
finally {
    Stop-AllServices
}
