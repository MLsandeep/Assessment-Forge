@echo off
SETLOCAL EnableDelayedExpansion
TITLE Assessment Forge - Auto Launcher

echo.
echo ============================================
echo   Assessment Forge - Starting Services
echo ============================================
echo.

:: --- REFRESH PATH (in case Node.js was just installed) ---
powershell -NoProfile -ExecutionPolicy Bypass -Command "$env:Path = [System.Environment]::GetEnvironmentVariable('Path','User') + ';' + [System.Environment]::GetEnvironmentVariable('Path','Machine')"
set "PATH=%PATH%;%USERPROFILE%\Documents\NodeJS\node-v22.12.0-win-x64"

:: --- 1. POWER-KILL PORTS ---
echo [INFO] Cleaning up previous processes...
powershell -Command "Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }" 2>nul
powershell -Command "Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }" 2>nul
taskkill /f /im node.exe /t 2>nul
echo.

:: --- 2. ACTIVATE VENV AND START BACKEND ---
echo [INFO] Starting Backend Server (Python + FastAPI)...
start "Backend Server" cmd /k "cd /d %CD% && call venv\Scripts\activate.bat && python rag_server.py"

:: --- 3. AUTOMATIC WAIT ---
echo [WAIT] Initializing AI Models (15 seconds)... 
timeout /t 15 /nobreak >nul
echo.

:: --- 4. START FRONTEND ---
echo [INFO] Starting Frontend Server (npm run dev)...
start "Frontend Server" cmd /k "cd /d %CD% && npm run dev"

:: --- 5. WAIT AND OPEN BROWSER ---
echo [WAIT] Waiting for frontend to start...
timeout /t 5 /nobreak >nul

:: --- 6. FINISH ---
echo.
echo ============================================
echo   [SUCCESS] Assessment Forge is running!
echo ============================================
echo.
echo   Backend:  http://localhost:8000
echo   Frontend: http://localhost:3000
echo.
echo   Close this window to keep servers running.
echo   Or close the Backend/Frontend windows to stop.
echo.

:: Open browser automatically
start "" http://localhost:3000

exit