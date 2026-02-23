@echo off
title Zoopi Print Agent
cd /d "%~dp0"

echo.
echo ========================================
echo    ZOOPI PRINT AGENT
echo ========================================
echo.

:: Verifica se Node.js está instalado
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERRO] Node.js nao encontrado!
    echo.
    echo Baixe e instale em: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: Verifica se as dependências estão instaladas
if not exist "node_modules" (
    echo Instalando dependencias...
    echo.
    call npm install
    echo.
)

:: Inicia o agente
echo Iniciando agente de impressao...
echo.
node agent.js

pause
