@echo off
echo Starting PostgreSQL Database...
cd backend-nest
docker-compose up -d
if %errorlevel% neq 0 (
    echo Error starting Docker. Please make sure Docker Desktop is running.
    pause
    exit /b %errorlevel%
)
echo Database started successfully.
pause
