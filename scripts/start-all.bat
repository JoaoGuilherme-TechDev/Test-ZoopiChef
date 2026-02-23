@echo off
echo Starting Zoopi System...

echo Starting Database...
cd backend
docker-compose up -d
cd ..

echo Starting Backend...
start "Zoopi Backend" cmd /c "cd backend && npm run start:dev"

echo Starting Frontend...
start "Zoopi Frontend" cmd /c "cd frontend && npm run dev"

echo System started!
echo Backend: http://localhost:3847
echo Frontend: http://localhost:8080 (or port assigned by Vite)
pause
