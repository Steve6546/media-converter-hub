# Smart Media Converter - Update Dependencies
# Updates all project dependencies and tools

Write-Host ""
Write-Host "  ======================================================================" -ForegroundColor Cyan
Write-Host "       Smart Media Converter - Update Dependencies                      " -ForegroundColor Cyan
Write-Host "  ======================================================================" -ForegroundColor Cyan
Write-Host ""

# Update yt-dlp
Write-Host "  [1] Updating yt-dlp..." -ForegroundColor Yellow
try {
    python -m pip install -U --pre yt-dlp 2>&1 | Out-Null
    $ytdlpVersion = python -m yt_dlp --version 2>&1
    Write-Host "  [OK] yt-dlp updated to v$ytdlpVersion" -ForegroundColor Green
}
catch {
    Write-Host "  [!] Could not update yt-dlp" -ForegroundColor Yellow
}

# Update Frontend packages
Write-Host "  [2] Updating Frontend packages..." -ForegroundColor Yellow
Push-Location "$PSScriptRoot\.."
try {
    npm update 2>&1 | Out-Null
    Write-Host "  [OK] Frontend packages updated" -ForegroundColor Green
}
catch {
    Write-Host "  [!] Could not update frontend packages" -ForegroundColor Yellow
}
Pop-Location

# Update Backend packages
Write-Host "  [3] Updating Backend packages..." -ForegroundColor Yellow
Push-Location "$PSScriptRoot\..\backend"
try {
    npm update 2>&1 | Out-Null
    Write-Host "  [OK] Backend packages updated" -ForegroundColor Green
}
catch {
    Write-Host "  [!] Could not update backend packages" -ForegroundColor Yellow
}
Pop-Location

Write-Host ""
Write-Host "  ======================================================================" -ForegroundColor Green
Write-Host "       All dependencies updated!                                        " -ForegroundColor Green
Write-Host "  ======================================================================" -ForegroundColor Green
Write-Host ""
