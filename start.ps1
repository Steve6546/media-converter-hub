# ╔══════════════════════════════════════════════════════════════════════════════╗
# ║              🚀 Smart Media Converter - نظام التشغيل الذكي 🚀                ║
# ║                    Smart Startup System v1.0                                  ║
# ╚══════════════════════════════════════════════════════════════════════════════╝

# Configuration
$ErrorActionPreference = "Continue"
$HOST_COLOR = "Cyan"
$SUCCESS_COLOR = "Green"
$WARNING_COLOR = "Yellow"
$ERROR_COLOR = "Red"

# Store PIDs for cleanup
$Script:ProcessIds = @()
$Script:TunnelUrl = ""
$Script:BackendTunnelUrl = ""

function Write-Banner {
    Clear-Host
    Write-Host ""
    Write-Host "  ╔══════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "  ║       🎬 Smart Media Converter - Smart Startup System 🎬         ║" -ForegroundColor Cyan
    Write-Host "  ║                     نظام التشغيل الذكي                           ║" -ForegroundColor Cyan
    Write-Host "  ╚══════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
}

function Write-Step {
    param([string]$Step, [string]$Message)
    Write-Host "  [$Step] " -ForegroundColor Yellow -NoNewline
    Write-Host $Message -ForegroundColor White
}

function Write-Success {
    param([string]$Message)
    Write-Host "  ✅ " -ForegroundColor Green -NoNewline
    Write-Host $Message -ForegroundColor Green
}

function Write-Error {
    param([string]$Message)
    Write-Host "  ❌ " -ForegroundColor Red -NoNewline
    Write-Host $Message -ForegroundColor Red
}

function Write-Warning {
    param([string]$Message)
    Write-Host "  ⚠️  " -ForegroundColor Yellow -NoNewline
    Write-Host $Message -ForegroundColor Yellow
}

function Write-Info {
    param([string]$Message)
    Write-Host "  ℹ️  " -ForegroundColor Cyan -NoNewline
    Write-Host $Message -ForegroundColor White
}

# ════════════════════════════════════════════════════════════════════════════════
# Step 1: Update Dependencies
# ════════════════════════════════════════════════════════════════════════════════
function Update-Dependencies {
    Write-Host ""
    Write-Host "  ════════════════════════════════════════════════════════════════" -ForegroundColor DarkCyan
    Write-Host "  📦 Step 1: Updating Dependencies | تحديث المكتبات" -ForegroundColor Cyan
    Write-Host "  ════════════════════════════════════════════════════════════════" -ForegroundColor DarkCyan
    Write-Host ""
    
    # Update yt-dlp
    Write-Step "1.1" "Updating yt-dlp to latest nightly..."
    try {
        $ytdlpOutput = python -m pip install -U --pre yt-dlp 2>&1
        $ytdlpVersion = python -m yt_dlp --version 2>&1
        Write-Success "yt-dlp updated to version: $ytdlpVersion"
    } catch {
        Write-Warning "Could not update yt-dlp: $($_.Exception.Message)"
    }
    
    # Update npm packages in root
    Write-Step "1.2" "Updating Frontend npm packages..."
    try {
        Push-Location $PSScriptRoot
        $npmOutput = npm install 2>&1
        Write-Success "Frontend packages updated"
        Pop-Location
    } catch {
        Write-Warning "Could not update frontend packages"
        Pop-Location
    }
    
    # Update npm packages in backend
    Write-Step "1.3" "Updating Backend npm packages..."
    try {
        Push-Location "$PSScriptRoot\backend"
        $npmOutput = npm install 2>&1
        Write-Success "Backend packages updated"
        Pop-Location
    } catch {
        Write-Warning "Could not update backend packages"
        Pop-Location
    }
    
    Write-Host ""
    return $true
}

# ════════════════════════════════════════════════════════════════════════════════
# Step 2: Kill Existing Processes
# ════════════════════════════════════════════════════════════════════════════════
function Stop-ExistingProcesses {
    Write-Host "  ════════════════════════════════════════════════════════════════" -ForegroundColor DarkCyan
    Write-Host "  🧹 Step 2: Cleaning Up | تنظيف العمليات السابقة" -ForegroundColor Cyan
    Write-Host "  ════════════════════════════════════════════════════════════════" -ForegroundColor DarkCyan
    Write-Host ""
    
    Write-Step "2.1" "Stopping any existing node processes..."
    taskkill /F /IM node.exe 2>$null | Out-Null
    
    Write-Step "2.2" "Stopping any existing cloudflared processes..."
    taskkill /F /IM cloudflared.exe 2>$null | Out-Null
    
    Start-Sleep -Seconds 2
    Write-Success "Cleanup complete"
    Write-Host ""
    return $true
}

# ════════════════════════════════════════════════════════════════════════════════
# Step 3: Start Backend Server
# ════════════════════════════════════════════════════════════════════════════════
function Start-BackendServer {
    Write-Host "  ════════════════════════════════════════════════════════════════" -ForegroundColor DarkCyan
    Write-Host "  🖥️  Step 3: Starting Backend Server | تشغيل الخادم الخلفي" -ForegroundColor Cyan
    Write-Host "  ════════════════════════════════════════════════════════════════" -ForegroundColor DarkCyan
    Write-Host ""
    
    Write-Step "3.1" "Starting Backend on port 3001..."
    
    $backendPath = "$PSScriptRoot\backend"
    $backendProcess = Start-Process -FilePath "npm" -ArgumentList "start" -WorkingDirectory $backendPath -PassThru -WindowStyle Hidden
    $Script:ProcessIds += $backendProcess.Id
    
    # Wait for backend to be ready
    Write-Step "3.2" "Waiting for Backend to initialize..."
    $maxAttempts = 30
    $attempt = 0
    $ready = $false
    
    while ($attempt -lt $maxAttempts -and -not $ready) {
        Start-Sleep -Seconds 1
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:3001/api/health" -TimeoutSec 2 -UseBasicParsing -ErrorAction SilentlyContinue
            if ($response.StatusCode -eq 200) {
                $ready = $true
            }
        } catch {
            $attempt++
            Write-Host "." -NoNewline
        }
    }
    Write-Host ""
    
    if ($ready) {
        Write-Success "Backend server is running on http://localhost:3001"
        return $true
    } else {
        Write-Warning "Backend may not be fully ready, continuing anyway..."
        return $true
    }
}

# ════════════════════════════════════════════════════════════════════════════════
# Step 4: Start Frontend Server
# ════════════════════════════════════════════════════════════════════════════════
function Start-FrontendServer {
    Write-Host ""
    Write-Host "  ════════════════════════════════════════════════════════════════" -ForegroundColor DarkCyan
    Write-Host "  🌐 Step 4: Starting Frontend Server | تشغيل واجهة المستخدم" -ForegroundColor Cyan
    Write-Host "  ════════════════════════════════════════════════════════════════" -ForegroundColor DarkCyan
    Write-Host ""
    
    Write-Step "4.1" "Starting Vite dev server on port 8080..."
    
    $frontendProcess = Start-Process -FilePath "npm" -ArgumentList "run", "dev" -WorkingDirectory $PSScriptRoot -PassThru -WindowStyle Hidden
    $Script:ProcessIds += $frontendProcess.Id
    
    # Wait for frontend to be ready
    Write-Step "4.2" "Waiting for Frontend to initialize..."
    $maxAttempts = 30
    $attempt = 0
    $ready = $false
    
    while ($attempt -lt $maxAttempts -and -not $ready) {
        Start-Sleep -Seconds 1
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:8080" -TimeoutSec 2 -UseBasicParsing -ErrorAction SilentlyContinue
            if ($response.StatusCode -eq 200) {
                $ready = $true
            }
        } catch {
            $attempt++
            Write-Host "." -NoNewline
        }
    }
    Write-Host ""
    
    if ($ready) {
        Write-Success "Frontend server is running on http://localhost:8080"
        return $true
    } else {
        Write-Warning "Frontend may not be fully ready, continuing anyway..."
        return $true
    }
}

# ════════════════════════════════════════════════════════════════════════════════
# Step 5: Start Cloudflare Tunnels
# ════════════════════════════════════════════════════════════════════════════════
function Start-CloudflareTunnels {
    Write-Host ""
    Write-Host "  ════════════════════════════════════════════════════════════════" -ForegroundColor DarkCyan
    Write-Host "  🌍 Step 5: Starting Cloudflare Tunnels | تشغيل الأنفاق العامة" -ForegroundColor Cyan
    Write-Host "  ════════════════════════════════════════════════════════════════" -ForegroundColor DarkCyan
    Write-Host ""
    
    # Frontend Tunnel
    Write-Step "5.1" "Creating public tunnel for Frontend (port 8080)..."
    
    $frontendLogFile = "$env:TEMP\cf_frontend_$(Get-Date -Format 'yyyyMMddHHmmss').log"
    $frontendTunnelProcess = Start-Process -FilePath "cloudflared" -ArgumentList "tunnel", "--url", "http://localhost:8080" -PassThru -WindowStyle Hidden -RedirectStandardError $frontendLogFile
    $Script:ProcessIds += $frontendTunnelProcess.Id
    
    # Wait for tunnel URL
    Write-Step "5.2" "Waiting for Frontend tunnel URL..."
    $maxAttempts = 30
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
        Write-Host "." -NoNewline
    }
    Write-Host ""
    
    if ($Script:TunnelUrl) {
        Write-Success "Frontend Public URL: $($Script:TunnelUrl)"
    } else {
        Write-Warning "Could not get Frontend tunnel URL"
    }
    
    # Backend Tunnel
    Write-Step "5.3" "Creating public tunnel for Backend (port 3001)..."
    
    $backendLogFile = "$env:TEMP\cf_backend_$(Get-Date -Format 'yyyyMMddHHmmss').log"
    $backendTunnelProcess = Start-Process -FilePath "cloudflared" -ArgumentList "tunnel", "--url", "http://localhost:3001" -PassThru -WindowStyle Hidden -RedirectStandardError $backendLogFile
    $Script:ProcessIds += $backendTunnelProcess.Id
    
    # Wait for tunnel URL
    Write-Step "5.4" "Waiting for Backend tunnel URL..."
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
        Write-Host "." -NoNewline
    }
    Write-Host ""
    
    if ($Script:BackendTunnelUrl) {
        Write-Success "Backend Public URL: $($Script:BackendTunnelUrl)"
    } else {
        Write-Warning "Could not get Backend tunnel URL"
    }
    
    Write-Host ""
    return $true
}

# ════════════════════════════════════════════════════════════════════════════════
# Step 6: Health Check and Final Report
# ════════════════════════════════════════════════════════════════════════════════
function Show-HealthReport {
    Write-Host ""
    Write-Host "  ════════════════════════════════════════════════════════════════" -ForegroundColor DarkCyan
    Write-Host "  📊 Step 6: Health Check | فحص الحالة النهائية" -ForegroundColor Cyan
    Write-Host "  ════════════════════════════════════════════════════════════════" -ForegroundColor DarkCyan
    Write-Host ""
    
    $allHealthy = $true
    
    # Check Backend
    Write-Step "6.1" "Checking Backend health..."
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3001/api/health" -TimeoutSec 5 -UseBasicParsing
        Write-Success "Backend: ✅ Healthy (Port 3001)"
    } catch {
        Write-Error "Backend: ❌ Not responding"
        $allHealthy = $false
    }
    
    # Check Frontend
    Write-Step "6.2" "Checking Frontend health..."
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8080" -TimeoutSec 5 -UseBasicParsing
        Write-Success "Frontend: ✅ Healthy (Port 8080)"
    } catch {
        Write-Error "Frontend: ❌ Not responding"
        $allHealthy = $false
    }
    
    # Check Tunnels
    Write-Step "6.3" "Checking Tunnel status..."
    if ($Script:TunnelUrl) {
        Write-Success "Frontend Tunnel: ✅ Active"
    } else {
        Write-Warning "Frontend Tunnel: ⚠️ URL not captured"
    }
    
    if ($Script:BackendTunnelUrl) {
        Write-Success "Backend Tunnel: ✅ Active"
    } else {
        Write-Warning "Backend Tunnel: ⚠️ URL not captured"
    }
    
    # Check yt-dlp
    Write-Step "6.4" "Checking yt-dlp..."
    try {
        $ytdlpVersion = python -m yt_dlp --version 2>&1
        Write-Success "yt-dlp: ✅ Version $ytdlpVersion"
    } catch {
        Write-Warning "yt-dlp: ⚠️ Not available"
    }
    
    return $allHealthy
}

function Show-FinalReport {
    param([bool]$AllHealthy)
    
    Write-Host ""
    Write-Host ""
    
    if ($AllHealthy) {
        Write-Host "  ╔══════════════════════════════════════════════════════════════════╗" -ForegroundColor Green
        Write-Host "  ║                                                                  ║" -ForegroundColor Green
        Write-Host "  ║   ✅ النظام يعمل بنجاح، السيرفر والموقع نشطان، لا توجد مشاكل   ║" -ForegroundColor Green
        Write-Host "  ║   ✅ System running successfully - No issues detected!           ║" -ForegroundColor Green
        Write-Host "  ║                                                                  ║" -ForegroundColor Green
        Write-Host "  ╚══════════════════════════════════════════════════════════════════╝" -ForegroundColor Green
    } else {
        Write-Host "  ╔══════════════════════════════════════════════════════════════════╗" -ForegroundColor Yellow
        Write-Host "  ║   ⚠️ System started with some warnings - Check logs above       ║" -ForegroundColor Yellow
        Write-Host "  ╚══════════════════════════════════════════════════════════════════╝" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "  ┌──────────────────────────────────────────────────────────────────┐" -ForegroundColor Cyan
    Write-Host "  │                    🔗 الروابط | Links                            │" -ForegroundColor Cyan
    Write-Host "  ├──────────────────────────────────────────────────────────────────┤" -ForegroundColor Cyan
    Write-Host "  │  Local Frontend:  " -ForegroundColor Cyan -NoNewline
    Write-Host "http://localhost:8080                         " -ForegroundColor White -NoNewline
    Write-Host "│" -ForegroundColor Cyan
    Write-Host "  │  Local Backend:   " -ForegroundColor Cyan -NoNewline
    Write-Host "http://localhost:3001/api/health              " -ForegroundColor White -NoNewline
    Write-Host "│" -ForegroundColor Cyan
    Write-Host "  ├──────────────────────────────────────────────────────────────────┤" -ForegroundColor Cyan
    
    if ($Script:TunnelUrl) {
        Write-Host "  │  🌍 Public Site:  " -ForegroundColor Cyan -NoNewline
        $paddedUrl = $Script:TunnelUrl.PadRight(47)
        Write-Host "$paddedUrl" -ForegroundColor Green -NoNewline
        Write-Host "│" -ForegroundColor Cyan
    }
    
    if ($Script:BackendTunnelUrl) {
        Write-Host "  │  🌍 Public API:   " -ForegroundColor Cyan -NoNewline
        $paddedUrl = $Script:BackendTunnelUrl.PadRight(47)
        Write-Host "$paddedUrl" -ForegroundColor Green -NoNewline
        Write-Host "│" -ForegroundColor Cyan
    }
    
    Write-Host "  └──────────────────────────────────────────────────────────────────┘" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  💡 Press Ctrl+C to stop all services | اضغط Ctrl+C للإيقاف" -ForegroundColor DarkGray
    Write-Host ""
}

# ════════════════════════════════════════════════════════════════════════════════
# Cleanup Handler
# ════════════════════════════════════════════════════════════════════════════════
function Stop-AllServices {
    Write-Host ""
    Write-Host "  🛑 Stopping all services..." -ForegroundColor Yellow
    
    foreach ($pid in $Script:ProcessIds) {
        try {
            Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
        } catch {}
    }
    
    taskkill /F /IM node.exe 2>$null | Out-Null
    taskkill /F /IM cloudflared.exe 2>$null | Out-Null
    
    Write-Host "  ✅ All services stopped. Goodbye! | تم الإيقاف. مع السلامة!" -ForegroundColor Green
    Write-Host ""
}

# Register cleanup on Ctrl+C
Register-EngineEvent -SourceIdentifier PowerShell.Exiting -Action { Stop-AllServices } | Out-Null

# ════════════════════════════════════════════════════════════════════════════════
# Main Execution
# ════════════════════════════════════════════════════════════════════════════════
try {
    Write-Banner
    
    $step1 = Update-Dependencies
    $step2 = Stop-ExistingProcesses
    $step3 = Start-BackendServer
    $step4 = Start-FrontendServer
    $step5 = Start-CloudflareTunnels
    $allHealthy = Show-HealthReport
    
    Show-FinalReport -AllHealthy $allHealthy
    
    # Keep script running
    Write-Host "  📡 System is running. Press any key to stop..." -ForegroundColor Cyan
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    
} finally {
    Stop-AllServices
}
