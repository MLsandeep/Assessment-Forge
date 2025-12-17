@echo off
setlocal enabledelayedexpansion
:: ==============================================
:: Assessment Forge - Windows Installer v4 (PowerShell Native)
:: ==============================================
echo 🚀 Setting up Assessment Forge...
echo -----------------------------------

set "INSTALLER_DIR=%CD%"
set "NEEDS_RESTART=0"

:: --- NODE.JS CHECK & INSTALL ---
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo 📦 Node.js not found. Installing Node.js (User Scope)...
    
    :: Use PowerShell to download (Reliable)
    echo    Downloading Node.js...
    powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.10.0/node-v20.10.0-x64.msi' -OutFile 'node_install.msi'"
    
    if not exist node_install.msi (
        echo ❌ Download failed. Check internet connection.
        pause
        exit /b 1
    )
    
    :: Install for current user to avoid UAC blocking
    echo    Installing Node.js...
    start /wait msiexec /i node_install.msi /quiet /norestart
    
    del node_install.msi
    set "NEEDS_RESTART=1"
    echo ✅ Node.js installed.
) else (
    echo ✅ Node.js is ready.
)

:: --- PYTHON CHECK & INSTALL ---
:: Check for 'py' launcher or 'python'
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo 🐍 Python not found. Installing Python 3.11...
    
    echo    Downloading Python...
    powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://www.python.org/ftp/python/3.11.7/python-3.11.7-amd64.exe' -OutFile 'python_install.exe'"
    
    if not exist python_install.exe (
        echo ❌ Download failed.
        pause
        exit /b 1
    )

    echo    Installing Python (Current User)...
    :: InstallAllUsers=0 (No Admin needed), PrependPath=1 (Add to PATH)
    start /wait python_install.exe /quiet InstallAllUsers=0 PrependPath=1 Include_test=0 Include_tcltk=0 Include_launcher=1
    
    del python_install.exe
    set "NEEDS_RESTART=1"
    echo ✅ Python installed.
) else (
    echo ✅ Python is ready.
)

:: --- RESTART CHECK ---
if "%NEEDS_RESTART%"=="1" (
    echo.
    echo ========================================================
    echo ⚠️  IMPORTANT: Tools were installed.
    echo    Windows requires a restart of the terminal to see them.
    echo.
    echo    1. CLOSE this window.
    echo    2. OPEN a new command prompt/terminal.
    echo    3. RUN .\install.bat again.
    echo ========================================================
    echo.
    pause
    exit /b 0
)

:: --- BACKEND SETUP (Virtual Env) ---
echo.
echo 🐍 Verification: Settings up Virtual Environment...

:: Create venv
if not exist venv (
    echo    Creating venv...
    python -m venv venv
    if !errorlevel! neq 0 (
        echo ❌ Error creating venv. Python might not be in PATH yet.
        echo    Please restart this script/terminal.
        pause
        exit /b 1
    )
)

:: Activate venv
echo    Activating venv...
call venv\Scripts\activate.bat

:: Install Requirements
echo 📦 Installing Python Dependencies...
pip install -r requirements.txt
if !errorlevel! neq 0 (
    echo ❌ Pip install failed.
    pause
    exit /b 1
)

:: --- FRONTEND SETUP ---
echo.
echo 📦 Installing Frontend Dependencies...
call npm install
if !errorlevel! neq 0 (
    echo ❌ npm install failed. Node.js might not be in PATH yet.
    echo    Please restart this script/terminal.
    pause
    exit /b 1
)

echo.
echo ==============================================
echo ✅ Setup Fully Complete!
echo ==============================================
echo.
echo To start: .\start.bat
echo.
pause
