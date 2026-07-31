@echo off
echo ==========================================
echo   DocMind - AI Document Manager
echo ==========================================
echo.

:: Check if .env exists
if not exist "backend\.env" (
    echo [!] backend\.env not found. Creating from template...
    copy "backend\.env.example" "backend\.env"
    echo [!] Please edit backend\.env and set your OPENAI_API_KEY
    echo.
)

echo [1] Starting Backend (FastAPI)...
echo [2] Starting Frontend (React)
echo.
echo Backend will run at: http://localhost:8000
echo Frontend will run at: http://localhost:5173
echo.

:: Start backend in new window
start "DocMind Backend" cmd /k "cd backend && python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000"

:: Wait a bit for backend
timeout /t 3 /nobreak >nul

:: Start frontend in new window
start "DocMind Frontend" cmd /k "cd frontend && npm install && npm run dev"

echo Both services are starting...
echo.
echo Press any key to exit this window.
pause >nul
