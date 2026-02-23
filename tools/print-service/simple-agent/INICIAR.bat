@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo ========================================
echo   ZOOPI PRINT AGENT v3.0.0 (GRAFICO)
echo ========================================
echo.
if not exist node_modules (
  echo Instalando bibliotecas de impressao...
  echo.
  call npm install
  echo.
)
echo Iniciando agente...
node agent.js
pause
