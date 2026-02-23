@echo off
title Instalador Zoopi Print Agent
cd /d "%~dp0"

echo.
echo ========================================
echo    INSTALADOR ZOOPI PRINT AGENT
echo ========================================
echo.

:: Verifica se Node.js está instalado
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERRO] Node.js nao encontrado!
    echo.
    echo Baixe e instale em: https://nodejs.org/
    echo Apos instalar, execute este arquivo novamente.
    echo.
    pause
    exit /b 1
)

echo Node.js encontrado: 
node --version
echo.

:: Instala dependências
echo Instalando dependencias...
call npm install

if %errorlevel% neq 0 (
    echo.
    echo [ERRO] Falha ao instalar dependencias!
    pause
    exit /b 1
)

echo.
echo ========================================
echo    INSTALACAO CONCLUIDA!
echo ========================================
echo.
echo Para iniciar o agente, execute: iniciar.bat
echo Ou de duplo-clique em iniciar.bat
echo.

pause
