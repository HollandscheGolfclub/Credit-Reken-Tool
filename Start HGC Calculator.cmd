@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is niet gevonden.
  echo Gebruik in plaats daarvan "HGC Calculator.exe".
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath 'node' -ArgumentList 'dev-server.mjs','8765' -WorkingDirectory (Get-Location).Path -WindowStyle Hidden"
powershell -NoProfile -Command "Start-Sleep -Milliseconds 700"
if /I not "%HGC_NO_BROWSER%"=="1" start "" http://127.0.0.1:8765
endlocal
