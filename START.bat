@echo off
:: ══════════════════════════════════════════════════════════════════════════════
::              Smart Media Converter - One-Click Launcher
::              نظام التشغيل الذكي - تشغيل بضغطة واحدة
:: ══════════════════════════════════════════════════════════════════════════════

title Smart Media Converter - Starting...
echo.
echo   Starting Smart Media Converter...
echo   جاري تشغيل النظام الذكي...
echo.

:: Run the PowerShell script with execution policy bypass
powershell.exe -ExecutionPolicy Bypass -File "%~dp0start.ps1"

pause
