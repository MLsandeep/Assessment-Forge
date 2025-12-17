@echo off
:: ==============================================
:: Assessment Forge - Windows Auto-Install Script
:: ==============================================
echo 🚀 Setting up Assessment Forge...
echo -----------------------------------

:: Check for Winget (Windows Package Manager)
where winget >nul 2>nul
if %errorlevel% neq 0 (
    echo ⚠️ Winget not found. Auto-installation of tools might not work.
)

:: 1. Check & Install Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo 📦 Node.js not found. Attempting to auto-install...
    winget install OpenJS.NodeJS -e --silent --accept-source-agreements --accept-package-agreements
    if %errorlevel% neq 0 (
        echo ❌ Failed to install Node.js. Please install manually: https://nodejs.org
        pause
        exit /b 1
    )
    echo ✅ Node.js installed. You may need to restart your terminal after this script finishes.
)

:: 2. Check & Install Python
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo 🐍 Python not found. Attempting to auto-install...
    winget install Python.Python.3 -e --silent --accept-source-agreements --accept-package-agreements
    if %errorlevel% neq 0 (
        echo ❌ Failed to install Python. Please install manually: https://python.org
        pause
        exit /b 1
    )
    echo ✅ Python installed. You may need to restart your terminal after this script finishes.
)

:: Refresh Environment (Attempt to use new paths without restart)
call RefreshEnv.cmd >nul 2>nul

:: 3. Frontend Setup
echo.
echo 📦 Installing Frontend Dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ⚠️ 'npm' command failed. If you just installed Node.js, please CLOSE this window and run install.bat again.
    pause
    exit /b 1
)

:: 4. Backend Setup
echo.
echo 🐍 Setting up Python Virtual Environment...
if not exist venv (
    echo    Creating venv...
    python -m venv venv
    if %errorlevel% neq 0 (
        echo ⚠️ 'python' command failed. If you just installed Python, please CLOSE this window and run install.bat again.
        pause
        exit /b 1
    )
)

echo    Activating venv...
call venv\Scripts\activate.bat

echo 📦 Installing Backend Dependencies...
pip install -r requirements.txt

echo.
echo ==============================================
echo ✅ Setup Complete!
echo ==============================================
echo.
echo To start the application, double-click start.bat
echo or run: start.bat
echo.
echo NOTE: If you just installed Node or Python, please close this window and restart.
pause
