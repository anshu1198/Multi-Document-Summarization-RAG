@echo off
title ContextIQ Backend Server
echo ============================================================
echo   ContextIQ -- AI Document Intelligence
echo   Backend Server (FastAPI + Uvicorn)
echo ============================================================
echo.

REM Activate virtual environment
set VENV_PATH=C:\Users\chari\Downloads\Multi-Document-Summarization-RAG-main (1)\.venv\Scripts\activate.bat

if not exist "%VENV_PATH%" (
    echo [ERROR] Virtual environment not found at:
    echo         %VENV_PATH%
    echo.
    echo Please check the venv path in this script.
    pause
    exit /b 1
)

call "%VENV_PATH%"

REM Move to project root
cd /d "%~dp0"

echo [INFO] Virtual environment activated.
echo [INFO] Starting backend on http://localhost:8000
echo [INFO] API docs available at http://localhost:8000/docs
echo [INFO] Press CTRL+C to stop the server.
echo.

REM Start uvicorn
uvicorn backend.app:app --reload --host 0.0.0.0 --port 8000

pause
