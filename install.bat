@echo off
SETLOCAL EnableDelayedExpansion
:: ==============================================
:: Assessment Forge - Windows Installer v6
:: ==============================================
echo.
echo ============================================
echo   Assessment Forge - Setup Script
echo ============================================
echo.

set "INSTALLER_DIR=%CD%"
set "NEEDS_RESTART=0"

:: --- NODE.JS CHECK & INSTALL (Portable) ---
where node >nul 2>nul
if !errorlevel! neq 0 (
    echo [INFO] Node.js not found. Installing portable Node.js v22...
    echo.
    
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Write-Host '[1/6] Downloading Node.js...' -ForegroundColor Cyan; Invoke-WebRequest -Uri 'https://nodejs.org/dist/v22.12.0/node-v22.12.0-win-x64.zip' -OutFile $env:TEMP\node.zip; Write-Host '[2/6] Creating destination folder...' -ForegroundColor Cyan; New-Item -ItemType Directory -Force -Path $env:USERPROFILE\Documents\NodeJS | Out-Null; Write-Host '[3/6] Extracting Node.js...' -ForegroundColor Cyan; Expand-Archive -Path $env:TEMP\node.zip -DestinationPath $env:USERPROFILE\Documents\NodeJS -Force; $nodePath = $env:USERPROFILE + '\Documents\NodeJS\node-v22.12.0-win-x64'; Write-Host '[4/6] Adding to current session...' -ForegroundColor Cyan; $env:Path += ';' + $nodePath; Write-Host '[5/6] Adding to permanent User PATH...' -ForegroundColor Cyan; $currentUserPath = [Environment]::GetEnvironmentVariable('Path', 'User'); if ($currentUserPath -notlike '*node-v22*') { [Environment]::SetEnvironmentVariable('Path', $currentUserPath + ';' + $nodePath, 'User') }; Write-Host '[6/6] Cleaning up...' -ForegroundColor Cyan; Remove-Item -Force $env:TEMP\node.zip -ErrorAction SilentlyContinue; Write-Host '[OK] Node.js installed!' -ForegroundColor Green; Write-Host '     Node.js version:' (node -v); Write-Host '     npm version:' (npm -v)"

    :: Update PATH for this batch session
    set "PATH=!PATH!;%USERPROFILE%\Documents\NodeJS\node-v22.12.0-win-x64"
    set "NEEDS_RESTART=1"
    
    echo.
    echo [OK] Node.js installed to %USERPROFILE%\Documents\NodeJS
) else (
    echo [OK] Node.js is already installed.
    for /f "tokens=*" %%i in ('node -v') do echo      Node.js Version: %%i
    for /f "tokens=*" %%i in ('npm -v') do echo      npm Version: %%i
)

echo.

:: --- PYTHON 3.12 CHECK & INSTALL ---
where py >nul 2>nul
if !errorlevel! neq 0 (
    echo [INFO] Python launcher not found. Installing Python 3.12 via winget...
    echo.
    winget install --id Python.Python.3.12 -v 3.12.10 --scope user --force --override "InstallAllUsers=0 PrependPath=1" --accept-package-agreements --accept-source-agreements
    set "NEEDS_RESTART=1"
    echo.
    echo [OK] Python 3.12 installed.
) else (
    :: Check if 3.12 specifically exists
    py -3.12 --version >nul 2>nul
    if !errorlevel! neq 0 (
        echo [INFO] Python 3.12 not found. Installing via winget...
        echo.
        winget install --id Python.Python.3.12 -v 3.12.10 --scope user --force --override "InstallAllUsers=0 PrependPath=1" --accept-package-agreements --accept-source-agreements
        set "NEEDS_RESTART=1"
        echo.
        echo [OK] Python 3.12 installed.
    ) else (
        echo [OK] Python 3.12 is already installed.
        for /f "tokens=*" %%i in ('py -3.12 --version') do echo      Version: %%i
    )
)

echo.

:: --- INFO MESSAGE (No restart needed - PATH updated in current session) ---
if "!NEEDS_RESTART!"=="1" (
    echo.
    echo [INFO] New tools were installed and added to the current session.
    echo        Continuing with installation...
    echo.
)

:: --- BACKEND SETUP (Python venv) ---
echo.
echo [INFO] Setting up Python Virtual Environment...
echo.

if not exist venv (
    echo        Creating venv with Python 3.12...
    py -3.12 -m venv venv
    if !errorlevel! neq 0 (
        echo [ERROR] Failed to create venv.
        exit /b 1
    )
)

echo        Activating venv...
call venv\Scripts\activate.bat

echo        Verifying Python version...
python --version

echo.
echo [INFO] Installing Python Dependencies (this may take a few minutes)...
pip install --upgrade pip
pip install -r requirements.txt
if !errorlevel! neq 0 (
    echo [ERROR] Pip install failed.
    exit /b 1
)

echo.
echo [OK] Python backend setup complete.

:: --- FRONTEND SETUP (NPM) ---
echo.
echo [INFO] Installing Frontend Dependencies (npm install)...
echo.

call npm install
if !errorlevel! neq 0 (
    echo [ERROR] npm install failed.
    exit /b 1
)

echo.
echo ============================================
echo   [SUCCESS] Setup Complete!
echo ============================================
echo.

:: --- REFRESH PATH FOR POWERSHELL ---
if "!NEEDS_RESTART!"=="1" (
    echo [INFO] Refreshing PATH for your terminal session...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "$env:Path = [System.Environment]::GetEnvironmentVariable('Path','User') + ';' + [System.Environment]::GetEnvironmentVariable('Path','Machine'); Write-Host '[OK] PATH refreshed!' -ForegroundColor Green"
    echo.
)

:: --- VERIFY INSTALLATIONS ---
echo [INFO] Verifying installed tools...
echo.
echo        Node.js version:
call node -v
echo        npm version:
call npm -v
echo        Python version:
call python --version
echo.

echo To start the application, run:
echo    .\start.bat
echo.
