# Smart Media Converter - Health Check
# Checks the health of all services

Write-Host ""
Write-Host "  ======================================================================" -ForegroundColor Cyan
Write-Host "       Smart Media Converter - Health Check                             " -ForegroundColor Cyan
Write-Host "  ======================================================================" -ForegroundColor Cyan
Write-Host ""

$allHealthy = $true

# Check Backend
Write-Host "  [1] Checking Backend (localhost:3001)..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/api/health" -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
    $health = $response.Content | ConvertFrom-Json
    Write-Host "  [OK] Backend: Running" -ForegroundColor Green
    Write-Host "       Status: $($health.status)" -ForegroundColor Gray
}
catch {
    Write-Host "  [X] Backend: NOT responding" -ForegroundColor Red
    $allHealthy = $false
}

# Check Frontend
Write-Host "  [2] Checking Frontend (localhost:8080)..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8080" -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
    Write-Host "  [OK] Frontend: Running" -ForegroundColor Green
}
catch {
    Write-Host "  [X] Frontend: NOT responding" -ForegroundColor Red
    $allHealthy = $false
}

# Check yt-dlp
Write-Host "  [3] Checking yt-dlp..." -ForegroundColor Yellow
try {
    $ytdlpVersion = python -m yt_dlp --version 2>&1
    Write-Host "  [OK] yt-dlp: v$ytdlpVersion" -ForegroundColor Green
}
catch {
    Write-Host "  [!] yt-dlp: Not installed or not in PATH" -ForegroundColor Yellow
}

# Check FFmpeg
Write-Host "  [4] Checking FFmpeg..." -ForegroundColor Yellow
try {
    $ffmpegVersion = ffmpeg -version 2>&1 | Select-Object -First 1
    if ($ffmpegVersion -match "ffmpeg version") {
        Write-Host "  [OK] FFmpeg: Installed" -ForegroundColor Green
    }
    else {
        Write-Host "  [!] FFmpeg: May not be properly installed" -ForegroundColor Yellow
    }
}
catch {
    Write-Host "  [!] FFmpeg: Not installed or not in PATH" -ForegroundColor Yellow
}

# Check Cloudflared
Write-Host "  [5] Checking Cloudflared..." -ForegroundColor Yellow
try {
    $cfVersion = cloudflared --version 2>&1
    if ($cfVersion -match "cloudflared") {
        Write-Host "  [OK] Cloudflared: Installed" -ForegroundColor Green
    }
    else {
        Write-Host "  [!] Cloudflared: May not be properly installed" -ForegroundColor Yellow
    }
}
catch {
    Write-Host "  [!] Cloudflared: Not installed (optional for local mode)" -ForegroundColor Yellow
}

# Check Redis
Write-Host "  [6] Checking Redis..." -ForegroundColor Yellow
try {
    $tcpClient = New-Object System.Net.Sockets.TcpClient
    $tcpClient.Connect("127.0.0.1", 6379)
    $tcpClient.Close()
    Write-Host "  [OK] Redis: Running on port 6379" -ForegroundColor Green
}
catch {
    Write-Host "  [!] Redis: Not running (optional for video studio)" -ForegroundColor Yellow
}

# Summary
Write-Host ""
if ($allHealthy) {
    Write-Host "  ======================================================================" -ForegroundColor Green
    Write-Host "       All core services are healthy!                                   " -ForegroundColor Green
    Write-Host "  ======================================================================" -ForegroundColor Green
}
else {
    Write-Host "  ======================================================================" -ForegroundColor Yellow
    Write-Host "       Some services are not running. Run: npm run start:local          " -ForegroundColor Yellow
    Write-Host "  ======================================================================" -ForegroundColor Yellow
}
Write-Host ""
