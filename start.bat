@echo off
SETLOCAL
TITLE Assessment Forge - Auto Launcher

:: 1. POWER-KILL PORTS
powershell -Command "Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }"
taskkill /f /im node.exe /t 2>nul
taskkill /f /im python.exe /t 2>nul

:: 2. START BACKEND
:: This opens in its own window and stays open
start "Backend Server" cmd /k ".\venv\Scripts\python.exe rag_server.py"

:: 3. AUTOMATIC WAIT
echo [WAIT] Initializing AI Models... 
:: /nobreak makes it so you don't have to press a key
timeout /t 15 /nobreak >nul

:: 4. START FRONTEND
:: This opens in its own window and stays open
start "Frontend Server" cmd /k "npm run dev"

:: 5. FINISH
echo [SUCCESS] Both services are launching. Closing manager...
exit