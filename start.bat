@echo off
:: ==============================================
:: Assessment Forge - Windows Start Script
:: ==============================================

:: Activate Virtual Environment
if exist venv\Scripts\activate.bat (
    call venv\Scripts\activate.bat
) else (
    echo [WARN] No virtual environment found. Python backend might fail.
)

echo [INFO] Starting Assessment Forge...
echo =================================

:: Start RAG Backend
echo [INFO] Starting RAG Backend (Port 8000)...
start "Assessment Forge RAG Backend" cmd /k "python rag_server.py"

:: Wait a moment
timeout /t 3 >nul

:: Start Frontend
echo [INFO] Starting Frontend (Port 3000)...
start "Assessment Forge Frontend" cmd /k "npm run dev"

echo.
echo [OK] Services started in new windows!
echo.
echo To stop: Close the opened command windows.
