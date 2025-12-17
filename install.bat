@echo off
setlocal
:: ==============================================
:: Assessment Forge - Robust Windows Installer
:: ==============================================
echo 🚀 Setting up Assessment Forge...
echo -----------------------------------

:: --- NODE.JS CHECK & INSTALL ---
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo 📦 Node.js not found. Installing Node.js LTS...
    
    :: Download Node.js MSI
    powershell -Command "Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.10.0/node-v20.10.0-x64.msi' -OutFile 'node_install.msi'"
    
    :: Install Node.js silently
    echo    Running Node.js installer... (this may ask for permission)
    start /wait msiexec /i node_install.msi /quiet /norestart
    
    :: Clean up
    del node_install.msi
    
    echo ✅ Node.js installed.
) else (
    echo ✅ Node.js is already installed.
)

:: --- PYTHON CHECK & INSTALL ---
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo 🐍 Python not found. Installing Python 3.11...
    
    :: Download Python Installer
    powershell -Command "Invoke-WebRequest -Uri 'https://www.python.org/ftp/python/3.11.7/python-3.11.7-amd64.exe' -OutFile 'python_install.exe'"
    
    :: Install Python silently (adding to PATH)
    echo    Running Python installer... (this may ask for permission)
    start /wait python_install.exe /quiet InstallAllUsers=1 PrependPath=1 Include_test=0
    
    :: Clean up
    del python_install.exe
    
    echo ✅ Python installed.
) else (
    echo ✅ Python is already installed.
)

:: --- REFRESH ENVIRONMENT VARIABLES ---
:: Retrieve the new PATH from registry so we can use node/python immediately
:: This is a trick to update %PATH% without restarting cmd
for /f "tokens=2,*" %%A in ('reg query HKCU\Environment /v Path') do set USERPATH=%%B
for /f "tokens=2,*" %%A in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v Path') do set SYSPATH=%%B
set PATH=%USERPATH%;%SYSPATH%;%PATH%

:: --- VERIFY INSTALLATION ---
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ⚠️ Could not detect Node.js even after install attempt.
    echo    Please restart your computer and run this script again.
    pause
    exit /b 1
)

:: --- FRONTEND SETUP ---
echo.
echo 📦 Installing Frontend Dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ❌ npm install failed.
    pause
    exit /b 1
)

:: --- BACKEND SETUP ---
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
echo.
pause
