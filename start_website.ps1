# Smart Desk CVIP PowerShell Launcher
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host "          SMART DESK OBJECT DETECTION AND MONITORING SYSTEM          " -ForegroundColor White
Write-Host "                    CVIP ACADEMIC PROJECT LAUNCHER                    " -ForegroundColor Green
Write-Host "=====================================================================" -ForegroundColor Cyan

if (Get-Command node -ErrorAction SilentlyContinue) {
    Write-Host "[OK] Node.js runtime detected! Starting local server on http://localhost:3000..." -ForegroundColor Green
    Start-Process "http://localhost:3000"
    node server.js
} else {
    Write-Host "[INFO] Opening index.html directly in default browser..." -ForegroundColor Yellow
    Start-Process (Join-Path $PSScriptRoot "index.html")
}
