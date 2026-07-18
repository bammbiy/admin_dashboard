@echo off
setlocal

set "APP_DIR=%~dp0"

where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo npm.cmd was not found. Please install Node.js first.
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -Command "$dir=$env:APP_DIR; $server=Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue; if (-not $server) { Start-Process -FilePath 'npm.cmd' -ArgumentList 'start' -WorkingDirectory $dir -WindowStyle Minimized; Start-Sleep -Seconds 2 }; Start-Process 'http://localhost:3000'"

exit /b 0
