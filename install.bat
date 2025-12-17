@echo off
:: ==============================================
:: Assessment Forge - Windows Install Script
:: ==============================================
echo 🚀 Setting up Assessment Forge...

:: 1. Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install from https://nodejs.org
    pause
    exit /b 1
)

:: 2. Check Python
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Python is not installed. Please install from https://python.org
    pause
    exit /b 1
)

:: 3. Frontend Setup
echo.
echo 📦 Installing Frontend Dependencies...
call npm install

:: 4. Backend Setup
echo.
echo 🐍 Setting up Python Virtual Environment...
if not exist venv (
    echo    Creating venv...
    python -m venv venv
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
pause
