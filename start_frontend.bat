@echo off
title ContextIQ Frontend Dev Server
echo ============================================================
echo   ContextIQ -- AI Document Intelligence
echo   Frontend Dev Server (Vite + React)
echo ============================================================
echo.

REM Move to frontend directory
cd /d "%~dp0frontend"

if not exist "node_modules" (
    echo [INFO] node_modules not found. Running npm install first...
    npm install
    echo.
)

echo [INFO] Starting frontend dev server on http://localhost:5173
echo [INFO] The app proxies /api requests to http://localhost:8000
echo [INFO] Make sure the backend is running before using the app.
echo [INFO] Press CTRL+C to stop.
echo.

npm run dev

pause
