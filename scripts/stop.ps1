# Smart Media Converter - Stop All Services
# Cleanly stops all running services

Write-Host ""
Write-Host "  ======================================================================" -ForegroundColor Cyan
Write-Host "       Smart Media Converter - Stopping Services                        " -ForegroundColor Cyan
Write-Host "  ======================================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "  [1] Stopping Node.js processes..." -ForegroundColor Yellow
$nodeCount = (Get-Process node -ErrorAction SilentlyContinue | Measure-Object).Count
if ($nodeCount -gt 0) {
    taskkill /F /IM node.exe 2>$null | Out-Null
    Write-Host "  [OK] Stopped $nodeCount Node.js process(es)" -ForegroundColor Green
}
else {
    Write-Host "  [OK] No Node.js processes running" -ForegroundColor Gray
}

Write-Host "  [2] Stopping Cloudflared tunnels..." -ForegroundColor Yellow
$cfCount = (Get-Process cloudflared -ErrorAction SilentlyContinue | Measure-Object).Count
if ($cfCount -gt 0) {
    taskkill /F /IM cloudflared.exe 2>$null | Out-Null
    Write-Host "  [OK] Stopped $cfCount Cloudflared process(es)" -ForegroundColor Green
}
else {
    Write-Host "  [OK] No Cloudflared processes running" -ForegroundColor Gray
}

Write-Host ""
Write-Host "  ======================================================================" -ForegroundColor Green
Write-Host "       All services stopped successfully!                               " -ForegroundColor Green
Write-Host "  ======================================================================" -ForegroundColor Green
Write-Host ""
