@echo off
title Smart Desk CVIP Monitoring System Launcher
color 0b

echo =====================================================================
echo           SMART DESK OBJECT DETECTION AND MONITORING SYSTEM
echo                     CVIP ACADEMIC PROJECT LAUNCHER
echo =====================================================================
echo.

where node >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] Node.js runtime detected! Starting local HTTP server...
    start "" http://localhost:3000
    node server.js
) else (
    echo [INFO] Node.js not found in PATH. Opening index.html directly in browser...
    start "" "%~dp0index.html"
)

pause
