@echo off
setlocal enabledelayedexpansion
:: ==============================================
:: Assessment Forge - Windows Installer v5 (ASCII Safe)
:: ==============================================
echo [INFO] Setting up Assessment Forge...
echo -----------------------------------

set "INSTALLER_DIR=%CD%"
set "NEEDS_RESTART=0"

:: --- NODE.JS CHECK ---
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [INFO] Node.js not found. Installing Node.js...
    
    echo        Downloading Node.js...
    powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.10.0/node-v20.10.0-x64.msi' -OutFile 'node_install.msi'"
    
    if not exist node_install.msi (
        echo [ERROR] Download failed. Check internet connection.
        pause
        exit /b 1
    )
    
    echo        Installing Node.js...
    start /wait msiexec /i node_install.msi /quiet /norestart
    
    del node_install.msi
    set "NEEDS_RESTART=1"
    echo [OK] Node.js installed.
) else (
    echo [OK] Node.js is ready.
)

:: --- PYTHON CHECK ---
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [INFO] Python not found. Installing Python 3.11...
    
    echo        Downloading Python...
    powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://www.python.org/ftp/python/3.11.7/python-3.11.7-amd64.exe' -OutFile 'python_install.exe'"
    
    if not exist python_install.exe (
        echo [ERROR] Download failed.
        pause
        exit /b 1
    )

    echo        Installing Python...
    start /wait python_install.exe /quiet InstallAllUsers=0 PrependPath=1 Include_test=0 Include_tcltk=0 Include_launcher=1
    
    del python_install.exe
    set "NEEDS_RESTART=1"
    echo [OK] Python installed.
) else (
    echo [OK] Python is ready.
)

:: --- RESTART CHECK ---
if "%NEEDS_RESTART%"=="1" (
    echo.
    echo ========================================================
    echo [IMPORTANT] New tools were installed.
    echo             Windows requires a restart of the terminal.
    echo.
    echo   1. CLOSE this window.
    echo   2. OPEN a new command prompt.
    echo   3. RUN .\install.bat again.
    echo ========================================================
    echo.
    pause
    exit /b 0
)

:: --- BACKEND SETUP ---
echo.
echo [INFO] Setting up Python Virtual Environment...

if not exist venv (
    echo        Creating venv...
    python -m venv venv
    if !errorlevel! neq 0 (
        echo [ERROR] Failed to create venv.
        echo         Please restart this script.
        pause
        exit /b 1
    )
)

echo        Activating venv...
call venv\Scripts\activate.bat

echo [INFO] Installing Python Dependencies...
pip install -r requirements.txt
if !errorlevel! neq 0 (
    echo [ERROR] Pip install failed.
    pause
    exit /b 1
)

:: --- FRONTEND SETUP ---
echo.
echo [INFO] Installing Frontend Dependencies...
call npm install
if !errorlevel! neq 0 (
    echo [ERROR] npm install failed.
    echo         Please restart this script.
    pause
    exit /b 1
)

echo.
echo ==============================================
echo [OK] Setup Fully Complete!
echo ==============================================
echo.
echo To start: .\start.bat
echo.
pause
