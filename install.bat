@echo off
SETLOCAL EnableDelayedExpansion
:: ==============================================
:: Assessment Forge - Windows Installer v7
:: Robust installation with health checks
:: ==============================================
echo.
echo ============================================
echo   Assessment Forge - Setup Script v7
echo ============================================
echo.

set "INSTALLER_DIR=%CD%"
set "NEEDS_RESTART=0"
set "PYTHON_CMD="
set "NODE_OK=0"
set "PYTHON_OK=0"

:: ==============================================
:: PHASE 1: NODE.JS CHECK & INSTALL
:: ==============================================
echo [PHASE 1/4] Checking Node.js...
echo.

:: Try to find node
where node >nul 2>nul
if !errorlevel! equ 0 (
    for /f "tokens=*" %%i in ('node -v 2^>nul') do set "NODE_VER=%%i"
    echo [OK] Node.js found: !NODE_VER!
    set "NODE_OK=1"
) else (
    echo [INFO] Node.js not found. Installing portable Node.js v22...
    echo.
    
    :: Download and extract Node.js (portable, no admin needed)
    powershell -NoProfile -ExecutionPolicy Bypass -Command ^
        "Write-Host 'Downloading Node.js...' -ForegroundColor Cyan; ^
        $ProgressPreference = 'SilentlyContinue'; ^
        Invoke-WebRequest -Uri 'https://nodejs.org/dist/v22.12.0/node-v22.12.0-win-x64.zip' -OutFile $env:TEMP\node.zip; ^
        Write-Host 'Extracting...' -ForegroundColor Cyan; ^
        Expand-Archive -Path $env:TEMP\node.zip -DestinationPath $env:USERPROFILE\Documents\NodeJS -Force; ^
        Remove-Item $env:TEMP\node.zip -Force -ErrorAction SilentlyContinue; ^
        $nodePath = $env:USERPROFILE + '\Documents\NodeJS\node-v22.12.0-win-x64'; ^
        $currentPath = [Environment]::GetEnvironmentVariable('Path', 'User'); ^
        if ($currentPath -notlike '*node-v22*') { ^
            [Environment]::SetEnvironmentVariable('Path', $currentPath + ';' + $nodePath, 'User'); ^
            Write-Host '[OK] Node.js installed and added to PATH' -ForegroundColor Green ^
        }"
    
    :: Add to current session PATH
    set "PATH=!PATH!;%USERPROFILE%\Documents\NodeJS\node-v22.12.0-win-x64"
    set "NEEDS_RESTART=1"
    set "NODE_OK=1"
    echo [OK] Node.js installed to %USERPROFILE%\Documents\NodeJS
)

echo.

:: ==============================================
:: PHASE 2: PYTHON CHECK & INSTALL
:: ==============================================
echo [PHASE 2/4] Checking Python...
echo.

:: Strategy: Try multiple ways to find Python
:: 1. Try 'py -3' (Python Launcher)
:: 2. Try 'python3'
:: 3. Try 'python'
:: 4. Install if none found

set "PYTHON_CMD="

:: Try py launcher first (most reliable on Windows)
py -3 --version >nul 2>nul
if !errorlevel! equ 0 (
    set "PYTHON_CMD=py -3"
    for /f "tokens=*" %%i in ('py -3 --version 2^>nul') do echo [OK] Found: %%i
    set "PYTHON_OK=1"
    goto :python_found
)

:: Try python command
python --version >nul 2>nul
if !errorlevel! equ 0 (
    :: Verify it's Python 3, not Python 2
    for /f "tokens=2" %%i in ('python --version 2^>nul') do set "PY_VER=%%i"
    echo !PY_VER! | findstr /b "3." >nul
    if !errorlevel! equ 0 (
        set "PYTHON_CMD=python"
        echo [OK] Found: Python !PY_VER!
        set "PYTHON_OK=1"
        goto :python_found
    )
)

:: Python not found - try to install
echo [INFO] Python 3 not found. Attempting installation...
echo.

:: Try winget first (Windows 10/11)
where winget >nul 2>nul
if !errorlevel! equ 0 (
    echo        Using winget to install Python 3.12...
    winget install --id Python.Python.3.12 --scope user --accept-package-agreements --accept-source-agreements --silent
    if !errorlevel! equ 0 (
        set "PYTHON_CMD=py -3"
        set "PYTHON_OK=1"
        set "NEEDS_RESTART=1"
        echo [OK] Python 3.12 installed via winget
        goto :python_found
    )
)

:: Fallback: Direct download
echo        Winget failed or unavailable. Downloading Python directly...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "Write-Host 'Downloading Python 3.12...' -ForegroundColor Cyan; ^
    $ProgressPreference = 'SilentlyContinue'; ^
    Invoke-WebRequest -Uri 'https://www.python.org/ftp/python/3.12.8/python-3.12.8-amd64.exe' -OutFile $env:TEMP\python_install.exe; ^
    Write-Host 'Installing Python (this may take a minute)...' -ForegroundColor Cyan; ^
    Start-Process -FilePath $env:TEMP\python_install.exe -ArgumentList '/quiet', 'InstallAllUsers=0', 'PrependPath=1', 'Include_launcher=1' -Wait; ^
    Remove-Item $env:TEMP\python_install.exe -Force -ErrorAction SilentlyContinue; ^
    Write-Host '[OK] Python installed' -ForegroundColor Green"

set "PYTHON_CMD=py -3"
set "PYTHON_OK=1"
set "NEEDS_RESTART=1"

:python_found
echo.

:: Verify Python works
if "!PYTHON_CMD!"=="" (
    echo [ERROR] Could not find or install Python 3.
    echo         Please install Python 3.10+ from https://python.org
    echo         Make sure to check "Add Python to PATH" during installation.
    pause
    exit /b 1
)

:: ==============================================
:: PHASE 3: VIRTUAL ENVIRONMENT SETUP
:: ==============================================
echo [PHASE 3/4] Setting up Python Virtual Environment...
echo.

:: Remove broken venv if it exists but is incomplete
if exist venv (
    if not exist venv\Scripts\python.exe (
        echo        Removing incomplete venv...
        rmdir /s /q venv
    )
)

:: Create venv if needed
if not exist venv (
    echo        Creating virtual environment...
    !PYTHON_CMD! -m venv venv
    if !errorlevel! neq 0 (
        echo [ERROR] Failed to create virtual environment.
        echo         Try running: !PYTHON_CMD! -m venv venv
        pause
        exit /b 1
    )
    echo [OK] Virtual environment created.
) else (
    echo [OK] Virtual environment already exists.
)

:: Activate venv
echo        Activating virtual environment...
call venv\Scripts\activate.bat
if !errorlevel! neq 0 (
    echo [ERROR] Failed to activate virtual environment.
    pause
    exit /b 1
)

:: Verify activation
python --version >nul 2>nul
if !errorlevel! neq 0 (
    echo [ERROR] Python not accessible in virtual environment.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('python --version') do echo        Using: %%i

:: Install dependencies
echo.
echo        Installing Python dependencies...
python -m pip install --upgrade pip --quiet
python -m pip install -r requirements.txt
if !errorlevel! neq 0 (
    echo [ERROR] Failed to install Python dependencies.
    pause
    exit /b 1
)

echo [OK] Python backend ready.
echo.

:: ==============================================
:: PHASE 4: FRONTEND SETUP
:: ==============================================
echo [PHASE 4/4] Installing Frontend Dependencies...
echo.

call npm install
if !errorlevel! neq 0 (
    echo [ERROR] npm install failed.
    echo         Make sure Node.js is installed correctly.
    pause
    exit /b 1
)

echo [OK] Frontend dependencies installed.
echo.

:: ==============================================
:: HEALTH CHECK
:: ==============================================
echo ============================================
echo   HEALTH CHECK
echo ============================================
echo.

set "HEALTH_OK=1"

:: Check Node
where node >nul 2>nul
if !errorlevel! equ 0 (
    for /f "tokens=*" %%i in ('node -v') do echo [OK] Node.js: %%i
) else (
    echo [FAIL] Node.js not found
    set "HEALTH_OK=0"
)

:: Check npm
where npm >nul 2>nul
if !errorlevel! equ 0 (
    for /f "tokens=*" %%i in ('npm -v') do echo [OK] npm: %%i
) else (
    echo [FAIL] npm not found
    set "HEALTH_OK=0"
)

:: Check venv
if exist venv\Scripts\python.exe (
    for /f "tokens=*" %%i in ('venv\Scripts\python.exe --version') do echo [OK] Venv Python: %%i
) else (
    echo [FAIL] Virtual environment broken
    set "HEALTH_OK=0"
)

:: Check node_modules
if exist node_modules (
    echo [OK] node_modules installed
) else (
    echo [FAIL] node_modules missing
    set "HEALTH_OK=0"
)

:: Check RAG server importable
echo.
echo        Testing RAG server module...
venv\Scripts\python.exe -c "import rag_server; print('[OK] RAG server module loads correctly')" 2>nul
if !errorlevel! neq 0 (
    echo [WARN] RAG server module test failed - may need additional setup
)

echo.

if "!HEALTH_OK!"=="1" (
    echo ============================================
    echo   [SUCCESS] Installation Complete!
    echo ============================================
    echo.
    echo   To start the application, run:
    echo      .\start.bat
    echo.
) else (
    echo ============================================
    echo   [WARNING] Some checks failed
    echo ============================================
    echo.
    echo   The installation may be incomplete.
    echo   Please review the errors above.
    echo.
)

if "!NEEDS_RESTART!"=="1" (
    echo [NOTE] New tools were installed. If you encounter issues,
    echo        please close this window and open a new terminal.
    echo.
)

pause
