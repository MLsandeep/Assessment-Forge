@echo off
setlocal enabledelayedexpansion
:: ==============================================
:: Assessment Forge - Robust Windows Installer v3
:: ==============================================
echo 🚀 Setting up Assessment Forge...
echo -----------------------------------

set "NEEDS_RESTART=0"

:: --- NODE.JS CHECK & INSTALL ---
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo 📦 Node.js not found. Installing Node.js LTS...
    
    :: Try downloading with curl first (faster/simpler on Win10/11)
    echo    Downloading Node.js installer...
    curl -o node_install.msi https://nodejs.org/dist/v20.10.0/node-v20.10.0-x64.msi
    
    if not exist node_install.msi (
        echo    Curl failed. Trying PowerShell...
        powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.10.0/node-v20.10.0-x64.msi' -OutFile 'node_install.msi'"
    )

    if not exist node_install.msi (
        echo ❌ Failed to download Node.js installer. Check your internet connection.
        pause
        exit /b 1
    )
    
    echo    Running Node.js installer... (please accept the prompt)
    start /wait msiexec /i node_install.msi /quiet /norestart
    
    del node_install.msi
    echo ✅ Node.js installed.
    set "NEEDS_RESTART=1"
) else (
    echo ✅ Node.js is already installed.
)

:: --- PYTHON CHECK & INSTALL ---
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo 🐍 Python not found. Installing Python 3.11...
    
    echo    Downloading Python installer...
    curl -o python_install.exe https://www.python.org/ftp/python/3.11.7/python-3.11.7-amd64.exe
    
    if not exist python_install.exe (
        echo    Curl failed. Trying PowerShell...
        powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://www.python.org/ftp/python/3.11.7/python-3.11.7-amd64.exe' -OutFile 'python_install.exe'"
    )
    
    if not exist python_install.exe (
        echo ❌ Failed to download Python installer. Check your internet connection.
        echo    You can try installing manually from: python.org
        pause
        exit /b 1
    )

    echo    Running Python installer... (please accept the prompt)
    start /wait python_install.exe /quiet InstallAllUsers=1 PrependPath=1 Include_test=0
    
    del python_install.exe
    echo ✅ Python installed.
    set "NEEDS_RESTART=1"
) else (
    echo ✅ Python is already installed.
)

:: --- IF NEW TOOLS INSTALLED, FORCE RESTART OF SCRIPT ---
if "%NEEDS_RESTART%"=="1" (
    echo.
    echo ========================================================
    echo ⚠️  IMPORTANT: New tools were installed (Node.js/Python).
    echo    Please CLOSE this window and RUN .\install.bat AGAIN
    echo    to recognize the new commands.
    echo ========================================================
    echo.
    pause
    exit /b 0
)

:: --- VIRTUAL ENV SETUP (The user's question about venv) ---
echo.
echo 🐍 Setting up Python Virtual Environment...
:: We install backend deps in a dedicated 'venv' folder
if not exist venv (
    echo    Creating venv...
    python -m venv venv
    if !errorlevel! neq 0 (
        echo ❌ Failed to create virtual environment. Ensure Python 3 is installed correctly.
        pause
        exit /b 1
    )
)

echo    Activating venv...
call venv\Scripts\activate.bat

echo 📦 Installing Backend Requirements...
pip install -r requirements.txt
if !errorlevel! neq 0 (
    echo ❌ Pip install failed. Check errors above.
    pause
    exit /b 1
)

:: --- FRONTEND SETUP ---
echo.
echo 📦 Installing Frontend Dependencies...
:: Ensure npm is found or provide valid error
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ 'npm' command not found.
    echo    If you just installed Node.js, please CLOSE this window and run install.bat again.
    pause
    exit /b 1
)

call npm install
if !errorlevel! neq 0 (
    echo ❌ npm install failed.
    pause
    exit /b 1
)

echo.
echo ==============================================
echo ✅ Setup Fully Complete!
echo ==============================================
echo.
echo To start the app: double-click start.bat
echo.
pause
