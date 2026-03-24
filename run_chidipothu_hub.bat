@echo off
setlocal
cd /d "%~dp0"

echo Checking prerequisites...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python not found. Please install Python 3.
    pause
    exit /b
)

echo.
echo [1/2] Starting Backend on http://localhost:8001...
start "Chidipothu Hub Backend" cmd /k "cd backend && python -m uvicorn server:app --host 0.0.0.0 --port 8001"

echo [2/2] Starting Frontend on http://localhost:3000...
start "Chidipothu Hub Frontend" cmd /k "cd frontend && npm start"

echo.
echo Both servers are starting up.
echo Backend:  http://localhost:8001
echo Frontend: http://localhost:3000
echo.
echo If the dashboard says "Failed to load data", check the Backend window for errors.
echo.
pause
