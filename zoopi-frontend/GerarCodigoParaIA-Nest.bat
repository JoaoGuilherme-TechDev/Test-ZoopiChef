@echo off
cls
echo =====================================
echo   GERADOR DE CODIGO PARA IA
echo =====================================
echo.

powershell -NoExit -ExecutionPolicy Bypass -File "%~dp0gerados.ps1"

echo.
echo =====================================
echo Script finalizado.
pause
