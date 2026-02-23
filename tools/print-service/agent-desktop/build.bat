@echo off
chcp 65001 >nul
echo.
echo ╔════════════════════════════════════════════════╗
echo ║     ZOOPI PRINT AGENT - BUILD                  ║
echo ╠════════════════════════════════════════════════╣
echo ║  Gerando executável Windows (.exe)             ║
echo ╚════════════════════════════════════════════════╝
echo.

cd /d "%~dp0"

:: Verifica se Node está instalado
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERRO] Node.js não encontrado!
    echo Por favor, instale o Node.js em https://nodejs.org/
    pause
    exit /b 1
)

:: Mostra versão do Node
echo [INFO] Node.js versão:
node --version
echo.

:: Instala dependências
echo [1/3] Instalando dependências do projeto...
call npm install
if %ERRORLEVEL% neq 0 (
    echo [ERRO] Falha ao instalar dependências
    pause
    exit /b 1
)
echo.

:: Instala pkg globalmente (versão compatível com Node 20)
echo [2/3] Instalando empacotador pkg (Node 20)...
call npm install -g pkg@5.8.1
if %ERRORLEVEL% neq 0 (
    echo [ERRO] Falha ao instalar pkg
    pause
    exit /b 1
)
echo.

:: Limpa cache do pkg para garantir que baixe o runtime correto
set "PKG_CACHE_PATH=%cd%\.pkg-cache"
if exist ".pkg-cache" rmdir /s /q ".pkg-cache"

:: Cria pasta dist se não existir
if not exist "dist" mkdir dist

:: Cria pasta assets se não existir
if not exist "assets" mkdir assets

:: Verifica se o executável está em uso e encerra o processo
echo [3/4] Verificando se o agente está em execução...
tasklist /FI "IMAGENAME eq ZoopiPrintAgent.exe" 2>NUL | find /I /N "ZoopiPrintAgent.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo [INFO] Agente em execução detectado. Encerrando...
    taskkill /F /IM ZoopiPrintAgent.exe >NUL 2>&1
    echo [INFO] Aguardando liberação do arquivo...
    timeout /t 5 /nobreak >NUL
)

:: Tenta encerrar qualquer processo node que possa estar usando
taskkill /F /IM node.exe /FI "WINDOWTITLE eq Zoopi*" >NUL 2>&1

:: Remove o executável antigo se existir
if exist "dist\ZoopiPrintAgent.exe" (
    echo [INFO] Removendo executável antigo...
    
    :: Tenta renomear primeiro (às vezes funciona melhor)
    move /Y "dist\ZoopiPrintAgent.exe" "dist\ZoopiPrintAgent.exe.old" >NUL 2>&1
    del /F /Q "dist\ZoopiPrintAgent.exe.old" >NUL 2>&1
    
    :: Se ainda existir, tenta deletar diretamente
    if exist "dist\ZoopiPrintAgent.exe" (
        del /F /Q "dist\ZoopiPrintAgent.exe" >NUL 2>&1
        timeout /t 2 /nobreak >NUL
    )
    
    :: Verifica novamente
    if exist "dist\ZoopiPrintAgent.exe" (
        echo.
        echo [ERRO] Não foi possível remover o executável antigo.
        echo.
        echo        SOLUÇÃO: Feche o ZoopiPrintAgent na bandeja do sistema
        echo        ^(clique com botão direito no ícone e selecione "Sair"^)
        echo        ou reinicie o computador e tente novamente.
        echo.
        pause
        exit /b 1
    )
    echo [INFO] Executável antigo removido.
)

:: Gera executável
echo [4/4] Gerando executável...
set "OUT_EXE=dist\\ZoopiPrintAgent_v2_1_bitmap.exe"
call pkg . --output "%OUT_EXE%" --targets node20-win-x64
if %ERRORLEVEL% neq 0 (
    echo [ERRO] Falha ao gerar executável
    pause
    exit /b 1
)

:: Mantém também o nome "padrão" para compatibilidade (atalhos/scripts antigos)
copy /Y "%OUT_EXE%" "dist\\ZoopiPrintAgent.exe" >NUL

echo.
echo ╔════════════════════════════════════════════════╗
echo ║     BUILD CONCLUÍDO COM SUCESSO!               ║
echo ╠════════════════════════════════════════════════╣
echo ║  Arquivo: dist\ZoopiPrintAgent_v2_1_bitmap.exe ║
echo ║  (compat): dist\ZoopiPrintAgent.exe            ║
echo ║                                                ║
echo ║  NOVIDADE v2.1:                                ║
echo ║  - QR Code e Barcode como IMAGEM (bitmap)      ║
echo ║  - Compatível com todas as impressoras         ║
echo ║                                                ║
echo ║  Para usar:                                    ║
echo ║  1. Execute ZoopiPrintAgent.exe                ║
echo ║  2. Acesse http://localhost:3847               ║
echo ║  3. Configure suas credenciais                 ║
echo ║  4. Clique em "Salvar e Iniciar"               ║
echo ╚════════════════════════════════════════════════╝
echo.

:: Mostra tamanho do arquivo
for %%A in ("%OUT_EXE%") do echo Tamanho: %%~zA bytes

echo.
pause
