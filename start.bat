@echo off
title KisanSetu V8 - SIH 26032
cd /d "%~dp0"
start "KisanSetu Backend" cmd /k "cd /d "%~dp0backend" && venv\Scripts\python.exe -m uvicorn main:app --reload"
timeout /t 2 /nobreak >nul
start "KisanSetu Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"
echo.
echo KisanSetu V8 started.
echo Backend : http://127.0.0.1:8000
 echo Frontend: http://localhost:5173
pause
