@echo off
echo Starting Frontend (Vite)...
cd frontend
call npm install --legacy-peer-deps
call npm run dev
pause
