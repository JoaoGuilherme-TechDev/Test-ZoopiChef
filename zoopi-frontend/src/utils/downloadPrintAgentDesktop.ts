/**
 * Zoopi Print Agent Desktop
 * 
 * Baixa TODOS os arquivos do agente desktop para o usuário compilar em .exe
 * Versão corrigida com Node 20 + systray2 + autenticação do agente
 */

import JSZip from "jszip";

function normalizeTextForFilename(filename: string, content: string) {
  const isWindowsBat = /\.(bat|cmd)$/i.test(filename);
  return isWindowsBat ? content.replace(/\n/g, "\r\n") : content;
}

function triggerBrowserDownload(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function downloadZipFile(filename: string, files: Array<{ name: string; content: string }>) {
  const zip = new JSZip();

  for (const f of files) {
    zip.file(f.name, normalizeTextForFilename(f.name, f.content));
  }

  const blob = await zip.generateAsync({ type: "blob" });
  triggerBrowserDownload(filename, blob);
}

export async function downloadPrintAgentDesktop(companyId: string, supabaseUrl: string, supabaseKey: string) {
  // ==================== package.json ====================
  // ==================== package.json (Node 20 + Supabase fixo) ====================
  const packageJson = JSON.stringify({
    name: "zoopi-print-agent",
    version: "2.2.1",
    description: "Agente de impressão Zoopi com system tray para Windows",
    main: "main.js",
    bin: "main.js",
    pkg: {
      scripts: ["**/*.js"],
      assets: ["assets/**/*", "web/**/*", "node_modules/node-notifier/vendor/**/*"],
      targets: ["node20-win-x64"],
      outputPath: "dist"
    },
    scripts: {
      start: "node main.js",
      build: "npx @yao-pkg/pkg . --output dist/ZoopiPrintAgent_v2_2_1.exe --targets node20-win-x64",
      "build:debug": "npx @yao-pkg/pkg . --output dist/ZoopiPrintAgent_v2_2_1.exe --targets node20-win-x64 --debug"
    },
    dependencies: {
      "systray2": "2.1.4",
      "@supabase/supabase-js": "2.49.1",
      "iconv-lite": "0.6.3",
      "node-notifier": "10.0.1",
      "winreg": "1.2.5"
    }
  }, null, 2);

  // ==================== agent-config.json ====================
  const agentConfig = JSON.stringify({
    supabaseUrl: supabaseUrl,
    supabaseKey: supabaseKey,
    companyId: companyId,
    agentEmail: "",
    agentPassword: "",
    printerHost: "192.168.1.100",
    printerPort: 9100,
    printerType: "network",
    printerName: "",
    pollInterval: 3000,
    encoding: "cp860",
    beepOnPrint: true,
    cutAfterPrint: true,
    copies: 1,
    autoStart: true
  }, null, 2);

  // ==================== BUILD.bat ====================
  const buildBat = `@echo off
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

:: Exige Node 20+ (o empacotamento usa runtime Node 20)
:: Extrai versão major removendo o 'v' e pegando antes do primeiro ponto
for /f "tokens=1,2 delims=v." %%a in ('node --version') do (
    set "NODEMAJOR=%%b"
    goto :check_version
)
:check_version
echo [INFO] Node major version: %NODEMAJOR%
if "%NODEMAJOR%"=="" set "NODEMAJOR=0"
set /a NODEMAJOR_NUM=%NODEMAJOR% 2>nul
if %NODEMAJOR_NUM% LSS 20 (
    echo [ERRO] Node.js detectado com versao insuficiente. Este build exige Node.js 20 LTS ou superior.
    echo Baixe em: https://nodejs.org/
    pause
    exit /b 1
)

:: Instala dependências
echo [1/3] Instalando dependências do projeto...
call npm install
if %ERRORLEVEL% neq 0 (
    echo [ERRO] Falha ao instalar dependências
    pause
    exit /b 1
)
echo.

:: Usa o empacotador via npx (evita conflitos/EPERM de instalação global)
echo [2/3] Preparando empacotador (@yao-pkg/pkg)...
call npx -y @yao-pkg/pkg --version >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERRO] Falha ao preparar empacotador via npx
    pause
    exit /b 1
)
echo.

:: Limpa cache do pkg para garantir que baixe o runtime correto
set "PKG_CACHE_PATH=%cd%\\.pkg-cache"
if exist ".pkg-cache" rmdir /s /q ".pkg-cache"

:: Cria pasta dist se não existir
if not exist "dist" mkdir dist

:: Cria pasta assets se não existir
if not exist "assets" mkdir assets

:: Gera executável
echo [3/3] Gerando executável (Node 20)...
set "OUT_EXE=dist\\ZoopiPrintAgent_v2_2.exe"
call npx -y @yao-pkg/pkg . --output "%OUT_EXE%" --targets node20-win-x64
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
echo ║  Arquivo: dist\\ZoopiPrintAgent_v2_2.exe        ║
echo ║  (compat): dist\\ZoopiPrintAgent.exe            ║
echo ║                                                ║
echo ║  Para usar:                                    ║
echo ║  1. Execute a pasta dist inteira               ║
echo ║  2. Acesse http://localhost:3847               ║
echo ║  3. Configure suas credenciais                 ║
echo ║  4. Clique em "Salvar e Iniciar"               ║
echo ╚════════════════════════════════════════════════╝
echo.

:: Mostra tamanho do arquivo
for %%A in ("%OUT_EXE%") do echo Tamanho: %%~zA bytes

echo.
pause
`;

  // ==================== RUN_DEV.bat ====================
  const runDevBat = `@echo off
chcp 65001 >nul
cd /d "%~dp0"

where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
  echo [ERRO] Node.js não encontrado.
  pause
  exit /b 1
)

echo Abrindo o agente em modo DEV (console)...
echo - Se aparecer erro aqui, copie e me envie.
echo - Isso também deve criar: %APPDATA%\\Zoopi\\agent.log
echo.

node main.js

echo.
pause
`;

  // ==================== DIAGNOSTICO.bat ====================
  const diagnosticoBat = `@echo off
chcp 65001 >nul
echo ==== DIAGNÓSTICO ZOOPI PRINT AGENT ====
echo Usuário: %USERNAME%
echo APPDATA: %APPDATA%
echo Pasta atual: %CD%
echo.

echo Node:
where node
node --version
echo.

echo Arquivos (dir):
dir
echo.

echo Se o .exe sumir, rode RUN_DEV.bat e mande a tela/erro.
echo.
pause
`;

  // ==================== LEIAME.txt ====================
  const readme = `╔════════════════════════════════════════════════════════════════╗
║           ZOOPI PRINT AGENT - DESKTOP                          ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║  Este é o agente de impressão que roda como executável         ║
║  Windows com ícone na bandeja do sistema (system tray).        ║
║                                                                ║
╠════════════════════════════════════════════════════════════════╣
║  COMO COMPILAR:                                                ║
║                                                                ║
║  1. Instale Node.js: https://nodejs.org/ (versão 20 LTS)       ║
║  2. Extraia TODOS os arquivos em uma pasta (ex: C:\\Zoopi)     ║
║  3. Execute BUILD.bat (duplo clique)                           ║
║  4. Aguarde a compilação (~2-3 minutos)                        ║
║  5. O executável será gerado em: dist/ZoopiPrintAgent.exe      ║
║                                                                ║
╠════════════════════════════════════════════════════════════════╣
║  COMO USAR:                                                    ║
║                                                                ║
║  1. Execute ZoopiPrintAgent.exe                                ║
║  2. Ícone aparece na bandeja do sistema (próximo ao relógio)   ║
║  3. Clique direito no ícone → Configurações                    ║
║     OU acesse http://localhost:3847                            ║
║  4. Preencha Email e Senha do Agente (usuário do sistema)      ║
║  5. Configure a impressora (IP/porta ou USB)                   ║
║  6. Clique "Salvar e Iniciar"                                  ║
║  7. Pronto! Pedidos serão impressos automaticamente            ║
║                                                                ║
╠════════════════════════════════════════════════════════════════╣
║  CREDENCIAIS JÁ PREENCHIDAS:                                   ║
║                                                                ║
║  - Supabase URL: ${supabaseUrl.substring(0, 40)}...
║  - Empresa ID: ${companyId}
║                                                                ║
║  ATENÇÃO: Você precisa informar Email e Senha de um            ║
║  usuário cadastrado no sistema para o agente funcionar!        ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
`;

  // ==================== main.js ====================
  const mainJs = `/**
 * Zoopi Print Agent - Desktop
 * 
 * Aplicativo Windows com ícone na bandeja do sistema.
 * Monitora a fila de impressão e imprime automaticamente.
 */

// ==================== LOG EM ARQUIVO ====================
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const APPDATA_DIR = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
const LOG_DIR = path.join(APPDATA_DIR, 'Zoopi');
const LOG_PATH = path.join(LOG_DIR, 'agent.log');

// Fallback portátil: grava ao lado do executável se APPDATA falhar
const PORTABLE_LOG_PATH = (() => {
  try {
    const exeDir = path.dirname(process.execPath || __filename);
    return path.join(exeDir, 'agent-portable.log');
  } catch (_) {
    return path.join(process.cwd(), 'agent-portable.log');
  }
})();

// Fallback extra: grava no TEMP (quando a pasta do EXE não é gravável)
const TEMP_LOG_PATH = path.join(os.tmpdir(), 'zoopi-print-agent.log');

function appendLog(level, message) {
  try {
    if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
    const line = '[' + new Date().toISOString() + '] [' + level + '] ' + message + '\\n';
    fs.appendFileSync(LOG_PATH, line, 'utf8');
  } catch (_) {
    try {
      const line = '[' + new Date().toISOString() + '] [' + level + '] ' + message + '\\n';
      fs.appendFileSync(PORTABLE_LOG_PATH, line, 'utf8');
    } catch (_) {
      try {
        const line = '[' + new Date().toISOString() + '] [' + level + '] ' + message + '\\n';
        fs.appendFileSync(TEMP_LOG_PATH, line, 'utf8');
      } catch (_) {}
    }
  }
}

// Força um “sinal de vida” bem no começo
try {
  fs.appendFileSync(PORTABLE_LOG_PATH, '[' + new Date().toISOString() + '] [INFO] boot-early\\n', 'utf8');
} catch (_) {
  try {
    fs.appendFileSync(TEMP_LOG_PATH, '[' + new Date().toISOString() + '] [INFO] boot-early\\n', 'utf8');
  } catch (_) {}
}

const _log = console.log.bind(console);
const _error = console.error.bind(console);
console.log = (...args) => {
  _log(...args);
  appendLog('INFO', args.map(String).join(' '));
};
console.error = (...args) => {
  _error(...args);
  appendLog('ERROR', args.map(String).join(' '));
};

 appendLog('INFO', 'Boot v2.2.1: iniciando Zoopi Print Agent');

// ==================== imports com log granular ====================
appendLog('INFO', 'Carregando web-server...');
let startWebServer;
let webServerLoadError = null;
try {
  ({ startWebServer } = require('./web-server'));
  appendLog('INFO', 'web-server OK');
} catch (e) {
  webServerLoadError = e;
  appendLog('ERROR', 'Falha web-server: ' + (e && e.stack ? e.stack : e.message));
}

appendLog('INFO', 'Carregando config-manager...');
let loadConfig, hasValidConfig, getConfig;
try {
  ({ loadConfig, hasValidConfig, getConfig } = require('./config-manager'));
  appendLog('INFO', 'config-manager OK');
} catch (e) {
  appendLog('ERROR', 'Falha config-manager: ' + (e && e.stack ? e.stack : e.message));
}

appendLog('INFO', 'Carregando agent-core...');
let startAgent, stopAgent;
try {
  ({ startAgent, stopAgent } = require('./agent-core'));
  appendLog('INFO', 'agent-core OK');
} catch (e) {
  appendLog('ERROR', 'Falha agent-core: ' + (e && e.stack ? e.stack : e.message));
  // Fallback para evitar "startAgent is not a function"
  startAgent = async () => ({ success: false, error: 'agent-core indisponível: ' + (e && e.message ? e.message : String(e)) });
  stopAgent = async () => ({ success: false, error: 'agent-core indisponível' });
}

appendLog('INFO', 'Carregando notification-manager...');
let notify;
try {
  ({ notify } = require('./notification-manager'));
  appendLog('INFO', 'notification-manager OK');
} catch (e) {
  appendLog('ERROR', 'Falha notification-manager: ' + (e && e.stack ? e.stack : e.message));
  notify = () => {};
}

appendLog('INFO', 'Carregando tray-manager...');
let startTray = null;
let updateTrayStatus = null;
try {
  ({ startTray, updateTrayStatus } = require('./tray-manager'));
  appendLog('INFO', 'tray-manager OK');
} catch (e) {
  appendLog('ERROR', 'Falha tray-manager: ' + (e && e.stack ? e.stack : e.message));
}

const lockFile = path.join(APPDATA_DIR, 'Zoopi', '.zoopi-print-agent.lock');

function getProcessImageName(pidNum) {
  try {
    const out = execSync('tasklist /FI "PID eq ' + pidNum + '" /FO CSV /NH', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString('utf8')
      .trim();
    if (!out) return null;
    if (/^INFO:/i.test(out)) return null;
    const first = out.split('\\n')[0];
    const m = first.match(/^\"([^\"]+)\"\s*,\s*\"(\\d+)\"/);
    return m ? m[1] : null;
  } catch (_) {
    return null;
  }
}

function checkSingleInstance() {
  try {
    if (fs.existsSync(lockFile)) {
      const pid = fs.readFileSync(lockFile, 'utf8').trim();
      const pidNum = parseInt(pid, 10);
      if (!isNaN(pidNum) && pidNum > 0) {
        try {
          process.kill(pidNum, 0);
          // PID existe. Confere se é realmente o nosso EXE (PID pode ser reaproveitado por outro processo).
          const imageName = getProcessImageName(pidNum);
          const looksLikeZoopi = !!(imageName && /ZoopiPrintAgent/i.test(imageName));
          if (looksLikeZoopi) {
            appendLog('WARN', 'Outra instancia Zoopi ja esta rodando (PID ' + pidNum + ', ' + imageName + '). Encerrando...');
            console.log('Outra instância Zoopi já está rodando (PID ' + pidNum + '). Encerrando...');
            process.exit(0);
          }

          appendLog('WARN', 'Lock encontrado com PID vivo, mas nao parece Zoopi (PID ' + pidNum + ', ' + (imageName || 'desconhecido') + '). Limpando lock...');
          try { fs.unlinkSync(lockFile); } catch (_) {}
        } catch (e) {
          // Processo nao existe mais, podemos limpar o lock
          appendLog('INFO', 'Lock antigo encontrado (PID ' + pidNum + ' morto). Limpando...');
          fs.unlinkSync(lockFile);
        }
      } else {
        // Lock corrompido, limpamos
        fs.unlinkSync(lockFile);
      }
    }
    // Cria novo lock com PID atual
    if (!fs.existsSync(path.dirname(lockFile))) {
      fs.mkdirSync(path.dirname(lockFile), { recursive: true });
    }
    fs.writeFileSync(lockFile, process.pid.toString());
    appendLog('INFO', 'Lock criado com PID ' + process.pid);
  } catch (e) {
    appendLog('ERROR', 'Erro ao verificar instancia: ' + (e && e.message ? e.message : String(e)));
    console.error('Erro ao verificar instância:', e.message);
  }
}

function cleanupLock() {
  try {
    if (fs.existsSync(lockFile)) fs.unlinkSync(lockFile);
  } catch (e) {}
}

async function main() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║     ZOOPI PRINT AGENT - DESKTOP        ║');
  console.log('║     Versão 2.2.0 (Node 20)             ║');
  console.log('╚════════════════════════════════════════╝');
  console.log('');
  
  checkSingleInstance();
  
  const configLoaded = loadConfig();
  console.log(configLoaded ? '✓ Configuração carregada' : '⚠ Sem configuração prévia');
  
  const port = 3847;
  if (typeof startWebServer === 'function') {
    startWebServer(port);
    console.log(\`✓ Interface web em http://localhost:\${port}\`);
  } else {
    const msg = webServerLoadError
      ? (webServerLoadError && webServerLoadError.stack ? webServerLoadError.stack : String(webServerLoadError))
      : 'startWebServer não foi exportado por ./web-server.js';
    console.error('Falha ao iniciar interface web:', msg);
    console.error('Veja o log em:', LOG_PATH);
  }
  
  try {
    if (typeof startTray === 'function') {
      await startTray();
      console.log('✓ Ícone na bandeja do sistema');
    } else {
      console.log('⚠ Bandeja do sistema indisponível');
    }
  } catch (e) {
    console.error('Falha ao iniciar bandeja do sistema:', e && e.stack ? e.stack : e.message);
    try { notify('Zoopi Print Agent', 'Falha ao iniciar o ícone na bandeja. Abra http://localhost:3847'); } catch (_) {}
  }
  
  if (hasValidConfig()) {
    console.log('✓ Configuração válida encontrada, iniciando agente...');
    const result = await startAgent();
    
    if (result.success) {
      if (typeof updateTrayStatus === 'function') updateTrayStatus('running');
      notify('Zoopi Print Agent', 'Agente iniciado e monitorando fila de impressão');
    } else {
      if (typeof updateTrayStatus === 'function') updateTrayStatus('error');
      notify('Zoopi Print Agent', \`Erro ao iniciar: \${result.error}\`);
    }
  } else {
    if (typeof updateTrayStatus === 'function') updateTrayStatus('pending');
    notify('Zoopi Print Agent', 'Configure a impressora acessando localhost:3847');
    
    const config = getConfig();
    if (!config.supabaseUrl) {
      setTimeout(() => {
        require('child_process').exec('start http://localhost:3847');
      }, 1000);
    }
  }
  
  console.log('');
  console.log('Pressione Ctrl+C para encerrar ou use o menu na bandeja do sistema.');
}

process.on('SIGINT', () => {
  console.log('\\nEncerrando...');
  stopAgent();
  cleanupLock();
  process.exit(0);
});

process.on('SIGTERM', () => {
  stopAgent();
  cleanupLock();
  process.exit(0);
});

process.on('exit', () => {
  cleanupLock();
});

process.on('uncaughtException', (err) => {
  console.error('Erro não tratado:', err && err.stack ? err.stack : err.message);
  try { notify('Zoopi Print Agent', \`Erro: \${err.message}\`); } catch (_) {}
});

process.on('unhandledRejection', (reason) => {
  console.error('Promise rejeitada:', reason && reason.stack ? reason.stack : String(reason));
});

main().catch((err) => {
  console.error('Erro fatal:', err && err.stack ? err.stack : err.message);
  try { notify('Zoopi Print Agent', \`Erro fatal: \${err.message}\`); } catch (_) {}
  cleanupLock();
  process.exit(1);
});`;

  // ==================== config-manager.js ====================
  const configManagerJs = `/**
 * Gerenciamento de Configuração
 * Prioridade: config ao lado do exe (portable) > %APPDATA%/Zoopi/agent-config.json
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const APPDATA_DIR = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
const APP_DIR = path.join(APPDATA_DIR, 'Zoopi');

// Config portable: ao lado do executável
const EXE_DIR = (() => {
  try {
    return path.dirname(process.execPath || __filename);
  } catch (_) {
    return process.cwd();
  }
})();
const PORTABLE_CONFIG_PATH = path.join(EXE_DIR, 'agent-config.json');
const PORTABLE_PARENT_CONFIG_PATH = path.join(EXE_DIR, '..', 'agent-config.json');

// Decide qual config usar: portable tem prioridade
function getConfigPath() {
  if (fs.existsSync(PORTABLE_CONFIG_PATH)) {
    console.log('[config] Usando config portable:', PORTABLE_CONFIG_PATH);
    return PORTABLE_CONFIG_PATH;
  }
  // Se o EXE estiver dentro de "dist/", deixa o agent-config.json na pasta pai também funcionar.
  if (fs.existsSync(PORTABLE_PARENT_CONFIG_PATH)) {
    console.log('[config] Usando config portable (pasta pai):', PORTABLE_PARENT_CONFIG_PATH);
    return PORTABLE_PARENT_CONFIG_PATH;
  }
  return path.join(APP_DIR, 'agent-config.json');
}

const defaultConfig = {
  supabaseUrl: '${supabaseUrl}',
  supabaseKey: '${supabaseKey}',
  companyId: '${companyId}',
  agentEmail: '',
  agentPassword: '',
  printerType: 'network',
  printerHost: '192.168.1.100',
  printerPort: 9100,
  printerName: '',
  pollInterval: 3000,
  encoding: 'cp860',
  lineWidth: 48,
  beepOnPrint: true,
  cutAfterPrint: true,
  copies: 1,
  autoStart: true,
};

let config = { ...defaultConfig };
let activeConfigPath = null;

function ensureAppDir() {
  if (!fs.existsSync(APP_DIR)) {
    fs.mkdirSync(APP_DIR, { recursive: true });
  }
}

function loadConfig() {
  try {
    ensureAppDir();
    activeConfigPath = getConfigPath();
    console.log('[config] Lendo de:', activeConfigPath);
    
    if (fs.existsSync(activeConfigPath)) {
      const data = fs.readFileSync(activeConfigPath, 'utf8');
      config = { ...defaultConfig, ...JSON.parse(data) };
      console.log('[config] Configuração carregada com sucesso');
      return true;
    } else {
      console.log('[config] Arquivo não existe, usando defaults');
    }
  } catch (e) {
    console.error('[config] Erro ao carregar:', e.message);
  }
  return false;
}

function saveConfig(newConfig = null) {
  try {
    ensureAppDir();
    
    if (newConfig) {
      config = { ...defaultConfig, ...newConfig };
    }
    
    // Usa o caminho ativo (portable ou APPDATA)
    const savePath = activeConfigPath || getConfigPath();
    console.log('[config] Salvando em:', savePath);
    fs.writeFileSync(savePath, JSON.stringify(config, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('[config] Erro ao salvar:', e.message);
    return false;
  }
}

function getConfig() {
  return { ...config };
}

function updateConfig(updates) {
  config = { ...config, ...updates };
  return saveConfig();
}

function hasValidConfig() {
  return !!(config.supabaseUrl && config.supabaseKey && config.companyId);
}

function getAppDir() {
  ensureAppDir();
  return APP_DIR;
}

function getActiveConfigPath() {
  return activeConfigPath || getConfigPath();
}

module.exports = {
  loadConfig,
  saveConfig,
  getConfig,
  updateConfig,
  hasValidConfig,
  getAppDir,
  getActiveConfigPath,
};`;

  // ==================== notification-manager.js ====================
  const notificationManagerJs = `/**
 * Gerenciamento de Notificações Windows
 */

const notifier = require('node-notifier');
const path = require('path');

const ICON_PATH = path.join(__dirname, 'assets', 'icon.png');

function notify(title, message, options = {}) {
  try {
    notifier.notify({
      title: title || 'Zoopi Print Agent',
      message: message,
      icon: ICON_PATH,
      sound: options.sound !== false,
      wait: options.wait || false,
      appID: 'Zoopi Print Agent',
    });
  } catch (e) {
    console.error('Erro ao exibir notificação:', e.message);
  }
}

function notifyPrintSuccess(orderId) {
  notify('Impressão Concluída', \`Pedido #\${orderId.slice(0, 8)} impresso com sucesso!\`);
}

function notifyPrintError(orderId, error) {
  notify('Erro de Impressão', \`Falha ao imprimir pedido #\${orderId.slice(0, 8)}: \${error}\`);
}

function notifyConnectionLost() {
  notify('Conexão Perdida', 'A conexão com o servidor foi perdida. Tentando reconectar...');
}

function notifyReconnected() {
  notify('Reconectado', 'Conexão restabelecida com sucesso!');
}

module.exports = {
  notify,
  notifyPrintSuccess,
  notifyPrintError,
  notifyConnectionLost,
  notifyReconnected,
};`;

  // ==================== startup-manager.js ====================
  const startupManagerJs = `/**
 * Gerenciamento de Inicialização Automática no Windows
 */

const Winreg = require('winreg');
const path = require('path');

const APP_NAME = 'ZoopiPrintAgent';
const REG_KEY = '\\\\Software\\\\Microsoft\\\\Windows\\\\CurrentVersion\\\\Run';

function getExePath() {
  if (process.pkg) {
    return process.execPath;
  }
  return \`"\${process.execPath}" "\${path.join(__dirname, 'main.js')}"\`;
}

function enableStartup() {
  return new Promise((resolve, reject) => {
    const regKey = new Winreg({
      hive: Winreg.HKCU,
      key: REG_KEY,
    });

    const exePath = getExePath();
    
    regKey.set(APP_NAME, Winreg.REG_SZ, exePath, (err) => {
      if (err) {
        console.error('Erro ao registrar startup:', err.message);
        reject(err);
      } else {
        console.log('✓ Inicialização automática habilitada');
        resolve(true);
      }
    });
  });
}

function disableStartup() {
  return new Promise((resolve, reject) => {
    const regKey = new Winreg({
      hive: Winreg.HKCU,
      key: REG_KEY,
    });

    regKey.remove(APP_NAME, (err) => {
      if (err) {
        if (err.message && err.message.includes('not exist')) {
          resolve(true);
        } else {
          console.error('Erro ao remover startup:', err.message);
          reject(err);
        }
      } else {
        console.log('✓ Inicialização automática desabilitada');
        resolve(true);
      }
    });
  });
}

function isStartupEnabled() {
  return new Promise((resolve) => {
    const regKey = new Winreg({
      hive: Winreg.HKCU,
      key: REG_KEY,
    });

    regKey.get(APP_NAME, (err, item) => {
      if (err || !item) {
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
}

async function toggleStartup() {
  const enabled = await isStartupEnabled();
  
  if (enabled) {
    await disableStartup();
    return false;
  } else {
    await enableStartup();
    return true;
  }
}

module.exports = {
  enableStartup,
  disableStartup,
  isStartupEnabled,
  toggleStartup,
};`;

  // ==================== printer.js ====================
  const printerJs = `/**
 * Funções de Impressão
 * Suporta impressoras de rede (TCP/IP) e USB (Windows)
 */

const net = require('net');
const iconv = require('iconv-lite');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');

const { getConfig } = require('./config-manager');

const ESC = '\\x1B';
const GS = '\\x1D';
const COMMANDS = {
  INIT: ESC + '@',
  CUT: GS + 'V' + '\\x00',
  BEEP: ESC + 'B' + '\\x05' + '\\x02',
  BOLD_ON: ESC + 'E' + '\\x01',
  BOLD_OFF: ESC + 'E' + '\\x00',
  DOUBLE_HEIGHT_ON: GS + '!' + '\\x10',
  DOUBLE_WIDTH_ON: GS + '!' + '\\x20',
  DOUBLE_ON: GS + '!' + '\\x30',
  NORMAL: GS + '!' + '\\x00',
  ALIGN_CENTER: ESC + 'a' + '\\x01',
  ALIGN_LEFT: ESC + 'a' + '\\x00',
  ALIGN_RIGHT: ESC + 'a' + '\\x02',
  LINE_FEED: '\\n',
  // Comandos de inversão (fundo preto, texto branco)
  INVERT_ON: GS + 'B' + '\\x01',
  INVERT_OFF: GS + 'B' + '\\x00',
  // Barcode commands
  BARCODE_HEIGHT: GS + 'h' + '\\x50',   // Height = 80 dots
  BARCODE_WIDTH: GS + 'w' + '\\x02',    // Width multiplier = 2
  BARCODE_HRI: GS + 'H' + '\\x02',      // Print text below
  BARCODE_CODE128: GS + 'k' + '\\x49',  // Code128 type
};

async function listWindowsPrinters() {
  return new Promise((resolve) => {
    if (os.platform() !== 'win32') {
      resolve([]);
      return;
    }
    
    exec('wmic printer get name', { encoding: 'utf8' }, (error, stdout) => {
      if (error) {
        resolve([]);
        return;
      }
      
      const printers = stdout
        .split('\\n')
        .map(line => line.trim())
        .filter(line => line && line !== 'Name');
      
      resolve(printers);
    });
  });
}

async function testNetworkPrinter(host, port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(3000);
    
    socket.connect(port || 9100, host, () => {
      socket.destroy();
      resolve({ success: true });
    });
    
    socket.on('error', (err) => {
      socket.destroy();
      resolve({ success: false, error: err.message });
    });
    
    socket.on('timeout', () => {
      socket.destroy();
      resolve({ success: false, error: 'Timeout - impressora não responde' });
    });
  });
}

async function testUsbPrinter(printerName) {
  const printers = await listWindowsPrinters();
  const found = printers.some(p => p.toLowerCase() === printerName.toLowerCase());
  
  if (found) {
    return { success: true };
  }
  return { success: false, error: \`Impressora "\${printerName}" não encontrada\` };
}

async function printToNetwork(content, options = {}) {
  const config = getConfig();
  const { copies = 1, cut = true, beep = true, host, port } = options;

  const targetHost = host || config.printerHost;
  const targetPort = port || config.printerPort;

  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    socket.setTimeout(10000);

    socket.connect(targetPort, targetHost, () => {
      try {
        socket.write(COMMANDS.INIT);

        if (beep && config.beepOnPrint) {
          socket.write(COMMANDS.BEEP);
        }

        for (let i = 0; i < copies; i++) {
          const encoded = iconv.encode(content, config.encoding);
          socket.write(encoded);

          if (cut && config.cutAfterPrint) {
            socket.write('\\n\\n\\n\\n');
            socket.write(COMMANDS.CUT);
          }
        }

        socket.end();
        resolve({ success: true });
      } catch (error) {
        socket.destroy();
        reject(error);
      }
    });

    socket.on('error', reject);
    socket.on('timeout', () => {
      socket.destroy();
      reject(new Error('Timeout na impressão'));
    });
  });
}

async function printToUsb(content, options = {}) {
  const config = getConfig();
  const { copies = 1, cut = true, beep = true, printerName } = options;
  
  const targetPrinter = printerName || config.printerName;
  
  if (!targetPrinter) {
    return Promise.reject(new Error('Nome da impressora não configurado'));
  }

  return new Promise((resolve, reject) => {
    const tempDir = os.tmpdir();
    const tempFile = path.join(tempDir, \`zoopi-print-\${Date.now()}.prn\`);

    const cleanupTemp = () => {
      try { fs.unlinkSync(tempFile); } catch (e) {}
    };

    try {
      let printData = COMMANDS.INIT;

      if (beep && config.beepOnPrint) {
        printData += COMMANDS.BEEP;
      }

      for (let i = 0; i < copies; i++) {
        printData += content;

        if (cut && config.cutAfterPrint) {
          printData += '\\n\\n\\n\\n';
          printData += COMMANDS.CUT;
        }
      }

      const encoded = iconv.encode(printData, config.encoding);
      fs.writeFileSync(tempFile, encoded);

      console.log(\`   Impressora USB: "\${targetPrinter}"\`);
      
      // Método 1: Usa print /D: com o nome exato da impressora
      const printCmd = \`print /D:"\${targetPrinter}" "\${tempFile}"\`;
      
      exec(printCmd, { timeout: 15000, shell: 'cmd.exe' }, (printError, stdout, stderr) => {
        // Limpa arquivo temp após tentativa
        setTimeout(() => {
          try { fs.unlinkSync(tempFile); } catch (e) {}
        }, 2000);
        
        if (printError) {
          console.log(\`   Aviso: print /D: falhou: \${printError.message}\`);
          
          // Método 2: Fallback usando PowerShell Out-Printer
          const psCmd = \`powershell -NoProfile -ExecutionPolicy Bypass -Command "$b=[System.IO.File]::ReadAllBytes('\${tempFile.replace(/'/g, "''")}'); $s=[System.Text.Encoding]::GetEncoding('iso-8859-1').GetString($b); $s | Out-Printer -Name '\${targetPrinter.replace(/'/g, "''")}';"\`;
          
          exec(psCmd, { timeout: 15000 }, (psError) => {
            if (psError) {
              console.log(\`   Aviso: PowerShell falhou: \${psError.message}\`);
              
              // Método 3: Copy para compartilhamento local
              const hostname = os.hostname();
              const printerPath = \`\\\\\\\\\${hostname}\\\\\${targetPrinter}\`;
              
              exec(\`copy /b "\${tempFile}" "\${printerPath}"\`, { timeout: 15000, shell: 'cmd.exe' }, (copyError) => {
                if (copyError) {
                  reject(new Error(\`Falha ao imprimir via USB: "\${targetPrinter}" - Verifique se a impressora está compartilhada.\`));
                } else {
                  resolve({ success: true });
                }
              });
            } else {
              resolve({ success: true });
            }
          });
        } else {
          resolve({ success: true });
        }
      });

    } catch (error) {
      try { fs.unlinkSync(tempFile); } catch (e) {}
      reject(error);
    }
  });
}

async function printContent(content, options = {}) {
  const config = getConfig();
  
  const printMode = options.printMode || config.printerType;
  
  if (printMode === 'usb' || printMode === 'windows') {
    return printToUsb(content, options);
  }
  
  if (options.printerHost) {
    return printToNetwork(content, { 
      ...options, 
      host: options.printerHost, 
      port: options.printerPort || 9100 
    });
  }
  
  return printToNetwork(content, options);
}

async function printTestPage() {
  const config = getConfig();
  
  let content = '';
  content += COMMANDS.ALIGN_CENTER;
  content += COMMANDS.DOUBLE_ON;
  content += '=== TESTE ===\\n';
  content += COMMANDS.NORMAL;
  content += COMMANDS.ALIGN_LEFT;
  content += ''.padEnd(42, '-') + '\\n';
  content += '\\n';
  content += 'Zoopi Print Agent\\n';
  content += 'Versao 2.0.0\\n';
  content += '\\n';
  content += \`Impressora: \${config.printerType === 'usb' ? config.printerName : config.printerHost}\\n\`;
  content += \`Codificacao: \${config.encoding}\\n\`;
  content += \`Data: \${new Date().toLocaleString('pt-BR')}\\n\`;
  content += '\\n';
  content += 'Caracteres especiais:\\n';
  content += 'aeiouAEIOU\\n';
  content += 'çÇãõÃÕáéíóúÁÉÍÓÚ\\n';
  content += '\\n';
  content += ''.padEnd(42, '-') + '\\n';
  content += COMMANDS.ALIGN_CENTER;
  content += 'Impressao OK!\\n';
  content += COMMANDS.ALIGN_LEFT;
  content += '\\n\\n\\n';
  
  // IMPORTANTE: o teste precisa respeitar explicitamente o modo configurado.
  // Evita cair no caminho de rede por engano e gerar "Timeout na impressão".
  return printContent(content, {
    copies: 1,
    printMode: config.printerType,
    printerName: config.printerName,
    printerHost: config.printerHost,
    printerPort: config.printerPort,
  });
}

module.exports = {
  COMMANDS,
  listWindowsPrinters,
  testNetworkPrinter,
  testUsbPrinter,
  printToNetwork,
  printToUsb,
  printContent,
  printTestPage,
};`;

  // ==================== agent-core.js ====================
  const agentCoreJs = `/**
 * Núcleo do Agente de Impressão
 * Monitora a fila de impressão no banco de dados e processa os jobs
 */

const { createClient } = require('@supabase/supabase-js');
const { getConfig } = require('./config-manager');
const { printContent, printTestPage, COMMANDS } = require('./printer');
const { notifyPrintSuccess, notifyPrintError, notifyConnectionLost, notifyReconnected } = require('./notification-manager');

let supabase = null;
let isProcessing = false;
let processedJobs = new Set();
let pollIntervalId = null;
let realtimeChannel = null;
let reconnectAttempts = 0;
let wasConnected = false;

let stats = {
  started: null,
  printed: 0,
  failed: 0,
  lastPrint: null,
  isRunning: false,
  lastError: null,
};

function formatOrder(order, items, sectorName) {
  const LINE_LEN = 42;
  
  // Helper to remove emojis and special chars that print as "??" on thermal printers
  const sanitize = (str) => {
    if (!str) return '';
    return String(str)
      .replace(/[\\u{1F300}-\\u{1F9FF}]/gu, '')  // Remove emojis
      .replace(/[\\u{2600}-\\u{26FF}]/gu, '')    // Remove misc symbols
      .replace(/[\\u{2700}-\\u{27BF}]/gu, '')    // Remove dingbats
      .replace(/[^\\u0000-\\u007F\\u00C0-\\u00FF]/g, '') // Keep only ASCII + Latin-1
      .trim();
  };
  
  // Helper to truncate text with ellipsis
  const truncate = (text, maxLen) => {
    const clean = sanitize(text).replace(/[\\r\\n]+/g, ' ').replace(/\\s+/g, ' ').trim();
    if (clean.length <= maxLen) return clean;
    if (maxLen <= 1) return '.';
    return clean.slice(0, maxLen - 1) + '.';
  };
  
  // ========== ORIGEM DO PEDIDO (não setor!) ==========
  const getOrderOrigin = () => {
    const source = String(order.source || '').toLowerCase();
    const orderType = String(order.order_type || '').toLowerCase();
    const eatHere = order.eat_here ?? order.eat_in;
    
    // Integrações
    if (source === 'ifood') return 'IFOOD';
    if (source === 'rappi') return 'RAPPI';
    if (source === 'uber_eats' || source === 'ubereats') return 'UBER EATS';
    if (source === '99food') return '99 FOOD';
    if (source === 'whatsapp') return 'WHATSAPP';
    
    // Totem/Kiosk
    if (source === 'kiosk' || source === 'totem') {
      return eatHere ? 'TOTEM - COMER AQUI' : 'TOTEM - LEVAR';
    }
    
    // Mesa
    if (orderType === 'table' || order.table_number) {
      return order.table_number ? \`MESA \${order.table_number}\` : 'MESA';
    }
    
    // Comanda
    if (orderType === 'dine_in' || order.command_number) {
      return order.command_number ? \`COMANDA \${order.command_number}\` : 'COMANDA';
    }
    
    // Balcão
    if (orderType === 'counter') {
      return eatHere ? 'BALCAO - COMER AQUI' : 'BALCAO - LEVAR';
    }
    
    // Telefone
    if (source === 'phone' || orderType === 'phone') return 'TELEFONE';
    
    // Online/Delivery
    if (orderType === 'delivery') return 'ONLINE';
    
    // Retirada
    if (orderType === 'local' || orderType === 'pickup') return 'RETIRADA';
    
    // App/QR
    if (source === 'app' || source === 'qrcode' || source === 'qr') return 'APP / QR CODE';
    
    return 'PEDIDO';
  };
  
  const originLabel = getOrderOrigin();
  
  let ticket = '';

  // ========== CABEÇALHO COM ORIGEM (INVERTIDO) ==========
  ticket += COMMANDS.ALIGN_CENTER;
  ticket += COMMANDS.INVERT_ON;
  ticket += COMMANDS.DOUBLE_ON;
  ticket += \` \${originLabel} \\n\`;
  ticket += COMMANDS.NORMAL;
  ticket += COMMANDS.INVERT_OFF;
  ticket += '\\n';
  
  // ========== NÚMERO DO PEDIDO (NEGRITO DUPLA ALTURA) ==========
  const orderNum = (order.order_number ? String(order.order_number).padStart(3, '0') : order.id.slice(0, 8).toUpperCase());
  ticket += COMMANDS.INVERT_ON;
  ticket += COMMANDS.DOUBLE_ON;
  ticket += \` PEDIDO #\${orderNum} \\n\`;
  ticket += COMMANDS.NORMAL;
  ticket += COMMANDS.INVERT_OFF;
  ticket += COMMANDS.ALIGN_LEFT;
  ticket += '='.repeat(LINE_LEN) + '\\n';

  // Customer name (truncated to fit)
  if (order.customer_name) {
    ticket += COMMANDS.BOLD_ON;
    ticket += \`Cliente: \${truncate(order.customer_name, LINE_LEN - 9)}\\n\`;
    ticket += COMMANDS.BOLD_OFF;
  }

  // Table number with emphasis
  if (order.table_number) {
    ticket += COMMANDS.DOUBLE_HEIGHT_ON;
    ticket += \`MESA: \${order.table_number}\\n\`;
    ticket += COMMANDS.NORMAL;
  }

  // Command info if available
  const cmdNum = order.command_number;
  const cmdName = order.command_name;
  if (cmdNum || cmdName) {
    ticket += COMMANDS.BOLD_ON;
    ticket += \`COMANDA: \${cmdNum ? '#' + cmdNum : ''}\${cmdName ? ' - ' + truncate(cmdName, 20) : ''}\\n\`;
    ticket += COMMANDS.BOLD_OFF;
  }

  // Date/Time
  const orderTime = new Date(order.created_at).toLocaleString('pt-BR');
  ticket += \`Data: \${orderTime}\\n\`;
  ticket += '-'.repeat(LINE_LEN) + '\\n';

  // Items section
  ticket += COMMANDS.BOLD_ON;
  ticket += 'ITENS:\\n';
  ticket += COMMANDS.BOLD_OFF;

  for (const item of items) {
    // Product name with quantity - NEGRITO
    const productName = truncate(item.product_name, LINE_LEN - 6);
    ticket += COMMANDS.BOLD_ON;
    ticket += COMMANDS.DOUBLE_HEIGHT_ON;
    ticket += \`\${item.quantity}x \${productName}\\n\`;
    ticket += COMMANDS.NORMAL;
    ticket += COMMANDS.BOLD_OFF;

    // Selected options (optionals like ice, lemon, etc.)
    if (item.selected_options_json) {
      try {
        const options = typeof item.selected_options_json === 'string'
          ? JSON.parse(item.selected_options_json)
          : item.selected_options_json;

        // Handle {selected_options: [...]} structure
        const groups = options.selected_options || (Array.isArray(options) ? options : []);
        
        for (const group of groups) {
          if (group.items && Array.isArray(group.items)) {
            for (const opt of group.items) {
              const label = sanitize(opt.label || opt.name || '');
              if (label) {
                const qty = opt.quantity || opt.qty || 1;
                ticket += \`   + \${qty}x \${truncate(label, LINE_LEN - 8)}\\n\`;
              }
            }
          } else if (group.selectedOptions) {
            // Legacy structure
            for (const sel of group.selectedOptions) {
              ticket += \`   > \${truncate(sanitize(sel.name), LINE_LEN - 5)}\\n\`;
            }
          }
        }
      } catch (e) {
        // Ignore parse errors
      }
    }

    // Item notes - INVERTIDO para destaque
    if (item.notes) {
      const cleanNotes = truncate(item.notes, LINE_LEN - 8);
      ticket += COMMANDS.INVERT_ON;
      ticket += \`   OBS: \${cleanNotes}\\n\`;
      ticket += COMMANDS.INVERT_OFF;
    }
  }

  // Order-level notes - INVERTIDO
  if (order.notes) {
    ticket += '-'.repeat(LINE_LEN) + '\\n';
    ticket += COMMANDS.INVERT_ON;
    ticket += COMMANDS.BOLD_ON;
    ticket += \`OBS PEDIDO: \${truncate(order.notes, LINE_LEN - 12)}\\n\`;
    ticket += COMMANDS.BOLD_OFF;
    ticket += COMMANDS.INVERT_OFF;
  }

  // Footer
  ticket += '='.repeat(LINE_LEN) + '\\n';
  
  // Qtd itens
  ticket += COMMANDS.BOLD_ON;
  ticket += \`Qtd itens: \${items.length}\\n\`;
  ticket += COMMANDS.BOLD_OFF;
  
  ticket += COMMANDS.ALIGN_CENTER;
  ticket += 'PRODUCAO\\n';
  ticket += \`Impresso: \${new Date().toLocaleString('pt-BR')}\\n\`;
  ticket += COMMANDS.ALIGN_LEFT;
  ticket += '\\n\\n\\n';

  return ticket;
}

/**
 * Format a printer test ticket
 * REGRAS:
 * - Título grande: "TESTE DE IMPRESSORA"
 * - Nome da impressora/setor
 * - Data e hora do teste
 * - Identificação do sistema
 * - Mensagem de sucesso
 */
function formatPrinterTest(sectorName, metadata, config) {
  const LINE_LEN = 42;
  
  const sanitize = (str) => {
    if (str == null) return '';
    const noMarks = String(str).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');
    const noNbsp = noMarks.replace(/[\\u00A0\\u2000-\\u200B\\u202F\\u205F\\u3000]/g, ' ');
    const withRepl = noNbsp
      .replace(/[\\u2013\\u2014]/g, '-')
      .replace(/[\\u201C\\u201D]/g, '"')
      .replace(/[\\u2018\\u2019]/g, "'");
    const printableOnly = withRepl.replace(/[^\\n\\r\\u0020-\\u007E]/g, '');
    return printableOnly.replace(/[\\t ]+/g, ' ').trim();
  };

  const center = (text, width) => {
    const t = sanitize(text);
    if (t.length >= width) return t.slice(0, width);
    const padding = Math.floor((width - t.length) / 2);
    return ' '.repeat(padding) + t;
  };

  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR');
  const timeStr = now.toLocaleTimeString('pt-BR');
  
  let ticket = '';
  
  // Header
  ticket += COMMANDS.INIT;
  ticket += COMMANDS.ALIGN_CENTER;
  ticket += '='.repeat(LINE_LEN) + '\\n';
  ticket += COMMANDS.DOUBLE_ON;
  ticket += 'TESTE DE IMPRESSORA\\n';
  ticket += COMMANDS.NORMAL;
  ticket += '='.repeat(LINE_LEN) + '\\n';
  ticket += '\\n';
  
  // Informações do setor/impressora
  ticket += COMMANDS.BOLD_ON;
  ticket += \`Setor: \${sanitize(sectorName)}\\n\`;
  ticket += COMMANDS.BOLD_OFF;
  ticket += '\\n';
  
  // Modo e configuração
  const printMode = metadata.print_mode || config.printerType || 'network';
  const printerInfo = metadata.printer_info || '';
  
  ticket += \`Modo: \${sanitize(printMode.toUpperCase())}\\n\`;
  if (printerInfo) {
    ticket += \`Config: \${sanitize(printerInfo)}\\n\`;
  }
  ticket += '\\n';
  
  // Data e hora
  ticket += '-'.repeat(LINE_LEN) + '\\n';
  ticket += \`Data: \${dateStr}\\n\`;
  ticket += \`Hora: \${timeStr}\\n\`;
  ticket += '-'.repeat(LINE_LEN) + '\\n';
  ticket += '\\n';
  
  // Sistema
  ticket += COMMANDS.ALIGN_CENTER;
  ticket += \`Sistema: \${sanitize(metadata.system_name || 'Zoopi POS')}\\n\`;
  ticket += '\\n';
  
  // Mensagem de sucesso
  ticket += '='.repeat(LINE_LEN) + '\\n';
  ticket += COMMANDS.BOLD_ON;
  ticket += center('IMPRESSORA OK!', LINE_LEN) + '\\n';
  ticket += COMMANDS.BOLD_OFF;
  ticket += '\\n';
  ticket += 'Se voce esta lendo isto,\\n';
  ticket += 'a impressora esta configurada\\n';
  ticket += 'corretamente.\\n';
  ticket += '='.repeat(LINE_LEN) + '\\n';
  
  // Corte
  ticket += '\\n\\n\\n';
  ticket += COMMANDS.CUT;
  
  return ticket;
}

/**
 * Format a table pre-bill (pré-conta) for printing
 */
function formatTableBill(metadata) {
  const LINE_LEN = Number(metadata?.printerProfile?.columns) || 42;
  
  const sanitize = (str) => {
    if (str == null) return '';
    // Remove diacritics (accents)
    const noMarks = String(str).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');
    // Replace special whitespace with regular space
    const noNbsp = noMarks.replace(/[\\u00A0\\u2000-\\u200B\\u202F\\u205F\\u3000]/g, ' ');
    // Replace special dashes and quotes
    const withRepl = noNbsp
      .replace(/[\\u2013\\u2014]/g, '-')
      .replace(/[\\u201C\\u201D]/g, '"')
      .replace(/[\\u2018\\u2019]/g, "'");
    // Keep only printable ASCII (space to tilde) plus newlines/carriage returns
    // Using Unicode escapes instead of hex to avoid escape issues in generated code
    const printableOnly = withRepl.replace(/[^\\n\\r\\u0020-\\u007E]/g, '');
    return printableOnly.replace(/[\\t ]+/g, ' ').trim();
  };

  const currency = (cents) => {
    const n = Number.isFinite(cents) ? cents : 0;
    const v = (n / 100).toFixed(2).replace('.', ',');
    // IMPORTANT: este arquivo é construído dentro de um template HTML em string.
    // Evite usar crases aqui para não quebrar o template pai.
    return 'R$ ' + v;
  };

  const truncate = (text, maxLen) => {
    const s = sanitize(text);
    if (maxLen <= 0) return '';
    if (s.length <= maxLen) return s;
    if (maxLen <= 3) return s.slice(0, maxLen);
    return s.slice(0, maxLen - 3).trimEnd() + '...';
  };

  const formatLine = (left, right) => {
    const l = sanitize(left);
    const r = sanitize(right);
    const available = Math.max(1, LINE_LEN - r.length);
    const l2 = l.length > available ? l.slice(0, available) : l;
    const pad = Math.max(1, LINE_LEN - l2.length - r.length);
    return l2 + ' '.repeat(pad) + r + '\\n';
  };
  
  let ticket = '';
  
  // Header
  ticket += COMMANDS.ALIGN_CENTER;
  ticket += COMMANDS.DOUBLE_ON;
  ticket += \`\${sanitize(metadata.companyName) || 'ESTABELECIMENTO'}\\n\`;
  ticket += COMMANDS.NORMAL;
  ticket += '='.repeat(LINE_LEN) + '\\n';
  
  // Table number
  ticket += COMMANDS.DOUBLE_ON;
  ticket += \`*** MESA \${metadata.tableNumber} ***\\n\`;
  ticket += COMMANDS.NORMAL;
  
  if (metadata.tableName) {
    ticket += \`\${sanitize(metadata.tableName)}\\n\`;
  }
  
  ticket += '\\n';
  ticket += COMMANDS.ALIGN_CENTER;
  ticket += '*** PRE-CONTA ***\\n';
  ticket += 'NAO E DOCUMENTO FISCAL\\n';
  ticket += COMMANDS.ALIGN_LEFT;
  ticket += '-'.repeat(LINE_LEN) + '\\n';
  
  // Opening time
  if (metadata.openedAt) {
    const opened = new Date(metadata.openedAt).toLocaleString('pt-BR');
    ticket += \`Abertura: \${opened}\\n\`;
  }
  ticket += \`Impresso: \${new Date().toLocaleString('pt-BR')}\\n\`;
  ticket += '-'.repeat(LINE_LEN) + '\\n';
  
  // Commands and items (1 item por linha, preço alinhado à direita)
  if (metadata.commands && Array.isArray(metadata.commands)) {
    for (const cmd of metadata.commands) {
      const cmdLabel = cmd.name || (cmd.number ? \`Comanda #\${cmd.number}\` : 'Itens');
      ticket += COMMANDS.BOLD_ON;
      ticket += \`\${sanitize(cmdLabel)}\\n\`;
      ticket += COMMANDS.BOLD_OFF;
      
      if (cmd.items && Array.isArray(cmd.items)) {
        for (const item of cmd.items) {
          const qty = item.quantity || 1;
          const qtyStr = String(qty) + 'x';
          const priceStr = currency(item.total_price_cents || 0);
          const nameWidth = Math.max(10, LINE_LEN - qtyStr.length - priceStr.length - 2);
          const nameSingle = truncate(String(item.product_name || '').toUpperCase(), nameWidth);
          ticket += qtyStr + ' ' + nameSingle.padEnd(nameWidth) + ' ' + priceStr + '\\n';
        }
      }
      
      ticket += formatLine('SUBTOTAL:', currency(cmd.total_cents || 0));
      ticket += '-'.repeat(LINE_LEN) + '\\n';
    }
  }
  
  // Totals
  ticket += '\\n';
  ticket += formatLine('SUBTOTAL:', currency(metadata.subtotalCents || 0));

  if (metadata.surchargeCents) {
    ticket += formatLine('ACRESCIMO:', '+' + currency(metadata.surchargeCents));
  }

  if (metadata.discountCents) {
    ticket += formatLine('DESCONTO:', '-' + currency(metadata.discountCents));
  }

  ticket += '='.repeat(LINE_LEN) + '\\n';
  ticket += COMMANDS.DOUBLE_ON;
  ticket += formatLine('TOTAL:', currency(metadata.totalCents || 0));
  ticket += COMMANDS.NORMAL;
  ticket += '='.repeat(LINE_LEN) + '\\n';
  
  // Footer
  ticket += '\\n';
  ticket += COMMANDS.ALIGN_CENTER;
  ticket += 'Confira os valores antes do pagamento\\n';
  ticket += 'Obrigado pela preferencia!\\n';
  ticket += COMMANDS.ALIGN_LEFT;
  ticket += '\\n\\n\\n';
  
  return ticket;
}

/**
 * Format a FULL ORDER ticket (with prices and BARCODE for expedition)
 * Used for deliverer tickets / customer receipts
 */
function formatFullOrder(order, items, companyName) {
  const LINE_LEN = 42;
  
  const sanitize = (str) => {
    if (!str) return '';
    return String(str)
      .replace(/[\\u{1F300}-\\u{1F9FF}]/gu, '')
      .replace(/[\\u{2600}-\\u{26FF}]/gu, '')
      .replace(/[\\u{2700}-\\u{27BF}]/gu, '')
      .replace(/[^\\u0000-\\u007F\\u00C0-\\u00FF]/g, '')
      .trim();
  };
  
  const money = (v) => {
    const n = Number(v);
    if (Number.isNaN(n)) return '';
    const value = Number.isInteger(n) && n > 1000 ? n / 100 : n;
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };
  
  const truncate = (text, maxLen) => {
    const clean = sanitize(text).replace(/[\\r\\n]+/g, ' ').replace(/\\s+/g, ' ').trim();
    if (clean.length <= maxLen) return clean;
    return clean.slice(0, maxLen - 1) + '.';
  };
  
  const centerText = (text) => {
    const padding = Math.max(0, Math.floor((LINE_LEN - text.length) / 2));
    return ' '.repeat(padding) + text;
  };
  
  // Determine origin label
  const getOrigin = () => {
    const source = String(order.source || '').toLowerCase();
    const orderType = String(order.order_type || '').toLowerCase();
    
    if (source === 'ifood') return 'IFOOD';
    if (source === 'rappi') return 'RAPPI';
    if (source === 'whatsapp') return 'WHATSAPP';
    if (orderType === 'delivery') return 'DELIVERY';
    if (orderType === 'pickup' || orderType === 'local') return 'RETIRADA';
    if (orderType === 'counter') return 'BALCAO';
    if (order.table_number) return \`MESA \${order.table_number}\`;
    return 'PEDIDO';
  };
  
  // Barcode value for scanner
  const barcodeValue = \`ORDER:\${order.id.slice(0, 8).toUpperCase()}\`;
  
  let ticket = '';
  
  // Header with ORIGIN
  ticket += COMMANDS.ALIGN_CENTER;
  ticket += COMMANDS.DOUBLE_ON;
  ticket += \`*** \${getOrigin()} ***\\n\`;
  ticket += COMMANDS.NORMAL;
  
  if (companyName) {
    ticket += COMMANDS.BOLD_ON;
    ticket += \`\${sanitize(companyName)}\\n\`;
    ticket += COMMANDS.BOLD_OFF;
  }
  
  ticket += COMMANDS.ALIGN_LEFT;
  ticket += '='.repeat(LINE_LEN) + '\\n';
  
  // Order ID
  const orderNum = order.order_number ? String(order.order_number).padStart(3, '0') : order.id.slice(0, 8).toUpperCase();
  ticket += COMMANDS.ALIGN_CENTER;
  ticket += COMMANDS.BOLD_ON;
  ticket += COMMANDS.DOUBLE_ON;
  ticket += \`PEDIDO #\${orderNum}\\n\`;
  ticket += COMMANDS.NORMAL;
  ticket += COMMANDS.BOLD_OFF;
  ticket += COMMANDS.ALIGN_LEFT;
  
  // Date
  ticket += \`Data: \${new Date(order.created_at).toLocaleString('pt-BR')}\\n\`;
  
  ticket += '-'.repeat(LINE_LEN) + '\\n';
  
  // Customer
  ticket += COMMANDS.BOLD_ON;
  ticket += 'CLIENTE\\n';
  ticket += COMMANDS.BOLD_OFF;
  ticket += \`Nome: \${truncate((order.customer_name || 'NAO INFORMADO').toUpperCase(), LINE_LEN - 6)}\\n\`;
  
  if (order.customer_phone) {
    ticket += \`Fone: \${order.customer_phone}\\n\`;
  }
  
  // Address (for delivery)
  if (order.customer_address) {
    ticket += '-'.repeat(LINE_LEN) + '\\n';
    ticket += COMMANDS.BOLD_ON;
    ticket += 'ENDERECO DE ENTREGA\\n';
    ticket += COMMANDS.BOLD_OFF;
    const addr = sanitize(order.customer_address).toUpperCase();
    // Word wrap address
    for (let i = 0; i < addr.length; i += LINE_LEN) {
      ticket += addr.slice(i, i + LINE_LEN) + '\\n';
    }
  }
  
  // Order notes
  if (order.notes) {
    ticket += '-'.repeat(LINE_LEN) + '\\n';
    ticket += COMMANDS.BOLD_ON;
    ticket += \`OBS: \${truncate(order.notes, LINE_LEN - 5)}\\n\`;
    ticket += COMMANDS.BOLD_OFF;
  }
  
  ticket += '='.repeat(LINE_LEN) + '\\n';
  
  // Items with prices
  ticket += COMMANDS.BOLD_ON;
  ticket += 'ITENS\\n';
  ticket += COMMANDS.BOLD_OFF;
  
  let computedTotal = 0;
  
  for (const item of items || []) {
    const qty = Number(item.quantity || 0);
    const unit = Number(item.unit_price ?? 0);
    const lineTotal = qty * unit;
    
    if (!Number.isNaN(lineTotal)) computedTotal += lineTotal;
    
    const qtyStr = \`\${qty}x\`;
    const name = truncate(item.product_name, LINE_LEN - 20);
    const price = money(lineTotal);
    const left = \`\${qtyStr} \${name}\`;
    const spaceCount = Math.max(1, LINE_LEN - left.length - price.length);
    
    ticket += \`\${left}\${' '.repeat(spaceCount)}\${price}\\n\`;
    
    if (item.notes) {
      ticket += \`   OBS: \${truncate(item.notes, LINE_LEN - 8)}\\n\`;
    }
  }
  
  ticket += '='.repeat(LINE_LEN) + '\\n';
  
  // Totals
  const deliveryFee = Number(order.delivery_fee || 0);
  const discount = Number(order.discount || 0);
  const orderTotal = order.total ?? computedTotal;
  
  ticket += \`Subtotal: \${money(computedTotal)}\\n\`;
  if (deliveryFee > 0) {
    ticket += \`Taxa Entrega: \${money(deliveryFee)}\\n\`;
  }
  if (discount > 0) {
    ticket += \`Desconto: -\${money(discount)}\\n\`;
  }
  
  ticket += '-'.repeat(LINE_LEN) + '\\n';
  ticket += COMMANDS.BOLD_ON;
  ticket += COMMANDS.DOUBLE_ON;
  ticket += \`TOTAL: \${money(orderTotal)}\\n\`;
  ticket += COMMANDS.NORMAL;
  ticket += COMMANDS.BOLD_OFF;
  
  // Payment
  ticket += '-'.repeat(LINE_LEN) + '\\n';
  ticket += COMMANDS.BOLD_ON;
  ticket += 'PAGAMENTO\\n';
  ticket += COMMANDS.BOLD_OFF;
  const paymentMethod = order.payment_method || 'NAO INFORMADO';
  ticket += \`\${paymentMethod.toUpperCase()}\\n\`;
  
  // Change
  const changeFor = Number(order.change_for || 0);
  if (changeFor > orderTotal) {
    const change = changeFor - orderTotal;
    ticket += \`TROCO PARA \${money(changeFor)}: \${money(change)}\\n\`;
  }
  
  ticket += '='.repeat(LINE_LEN) + '\\n';
  
  // BARCODE SECTION
  ticket += COMMANDS.ALIGN_CENTER;
  ticket += 'ESCANEIE PARA EXPEDICAO\\n';
  // Print Code128 barcode
  ticket += COMMANDS.BARCODE_HEIGHT;  // Set height
  ticket += COMMANDS.BARCODE_WIDTH;   // Set width
  ticket += COMMANDS.BARCODE_HRI;     // Print text below
  ticket += COMMANDS.BARCODE_CODE128; // Code128
  ticket += String.fromCharCode(barcodeValue.length);
  ticket += barcodeValue;
  ticket += '\\n';
  ticket += \`\${barcodeValue}\\n\`;
  ticket += COMMANDS.ALIGN_LEFT;
  
  ticket += '='.repeat(LINE_LEN) + '\\n';
  
  // Footer
  ticket += COMMANDS.ALIGN_CENTER;
  ticket += COMMANDS.BOLD_ON;
  ticket += 'VIA ENTREGADOR / EXPEDICAO\\n';
  ticket += COMMANDS.BOLD_OFF;
  ticket += \`Impresso: \${new Date().toLocaleString('pt-BR')}\\n\`;
  ticket += 'www.zoopi.app.br\\n';
  ticket += COMMANDS.ALIGN_LEFT;
  ticket += '\\n\\n\\n';
  
  return ticket;
}

async function markJobComplete(jobId) {
  await supabase
    .from('print_job_queue')
    .update({
      status: 'completed',
      printed_at: new Date().toISOString(),
    })
    .eq('id', jobId);
}

async function markJobFailed(jobId, errorMessage) {
  const { data: job } = await supabase
    .from('print_job_queue')
    .select('attempts')
    .eq('id', jobId)
    .single();

  const attempts = (job?.attempts || 0) + 1;
  const status = attempts >= 3 ? 'failed' : 'pending';

  await supabase
    .from('print_job_queue')
    .update({
      status,
      attempts,
      error_message: errorMessage,
    })
    .eq('id', jobId);
}

async function processJob(job) {
  if (processedJobs.has(job.id) || isProcessing) {
    return;
  }

  isProcessing = true;
  processedJobs.add(job.id);
  const config = getConfig();

  try {
    console.log(\`📄 Processando job \${job.id.slice(0, 8)} (tipo: \${job.job_type})...\`);

    // ==== PROCESSAR TABLE_BILL (PRÉ-CONTA) ====
    if (job.job_type === 'table_bill') {
      const metadata = job.metadata;
      if (!metadata) {
        throw new Error('Metadata não encontrada para table_bill');
      }
      
      // Determina impressora do setor ou global
      const printerHost = metadata.printerHost || config.printerHost;
      const printerPort = metadata.printerPort || config.printerPort;
      const printerName = metadata.printerName || config.printerName;
      const printMode = metadata.printMode || config.printerType;
      
      console.log(\`   Pré-conta Mesa \${metadata.tableNumber} - Modo: \${printMode}, Impressora: \${printMode === 'windows' ? printerName : printerHost}\`);
      
      // Prioridade: imprimir ESC/POS RAW já validado (colunas + 1 linha por item)
      // Se não existir RAW, cai no formatter.
      let content = '';
      if (metadata.rawEscPosBase64) {
        try {
          content = atob(String(metadata.rawEscPosBase64));
          console.log('   RAW ESC/POS (base64) detectado - imprimindo sem reformatar', {
            bytes: content.length,
            columns: metadata?.printerProfile?.columns,
          });
        } catch (e) {
          console.warn('   Falha ao decodificar rawEscPosBase64; usando formatter', e);
          content = '';
        }
      }

      if (!content) {
        content = formatTableBill(metadata);
      }
      
      await printContent(content, { 
        copies: 1,
        printerHost,
        printerPort,
        printerName,
        printMode,
      });

      await markJobComplete(job.id);

      stats.printed++;
      stats.lastPrint = new Date().toISOString();
      stats.lastError = null;
      console.log(\`   ✓ Pré-conta impressa!\`);
      
      return;
    }

    // ==== PROCESSAR PRINTER_TEST (TESTE DE IMPRESSORA) ====
    if (job.job_type === 'printer_test') {
      const metadata = job.metadata || {};
      const sectorId = job.print_sector_id;
      
      console.log(\`   Teste de impressora - Setor: \${metadata.sector_name || 'N/A'}\`);
      
      // Buscar configurações do setor
      let sectorPrinterHost = config.printerHost;
      let sectorPrinterPort = config.printerPort;
      let sectorPrinterName = config.printerName;
      let sectorPrintMode = config.printerType;
      let sectorName = metadata.sector_name || 'IMPRESSORA';
      
      if (sectorId) {
        const { data: sector } = await supabase
          .from('print_sectors')
          .select('name, print_mode, printer_name, printer_host, printer_port')
          .eq('id', sectorId)
          .single();
        
        if (sector) {
          sectorName = sector.name.toUpperCase();
          sectorPrintMode = sector.print_mode;
          sectorPrinterName = sector.printer_name;
          sectorPrinterHost = sector.printer_host || config.printerHost;
          sectorPrinterPort = sector.printer_port || config.printerPort;
        }
      }
      
      const content = formatPrinterTest(sectorName, metadata, config);
      
      await printContent(content, { 
        copies: 1,
        printerHost: sectorPrinterHost,
        printerPort: sectorPrinterPort,
        printerName: sectorPrinterName,
        printMode: sectorPrintMode,
      });

      await markJobComplete(job.id);

      stats.printed++;
      stats.lastPrint = new Date().toISOString();
      stats.lastError = null;
      console.log(\`   ✓ Teste de impressora enviado!\`);
      
      return;
    }

    // ==== PROCESSAR SOMMELIER_TICKET (DICA DO ENÓLOGO) ====
    if (job.job_type === 'sommelier_ticket') {
      const md = job.metadata || {};
      const raw = String(md.ticketContent || '').trim();
      if (!raw) throw new Error('ticketContent não encontrado');

      const sanitizeText = (input) => {
        const str = String(input || '')
          .replace(/[\\u{1F300}-\\u{1FAFF}]/gu, '')
          .replace(/[─━]/g, '-')
          .replace(/[═]/g, '=');
        const noDia = str.normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');
        return noDia.replace(/[^\\x0A\\x0D\\x20-\\x7E]/g, '');
      };

      const content = COMMANDS.INIT + COMMANDS.NORMAL + sanitizeText(raw) + '\\n\\n\\n' + COMMANDS.CUT;
      
      await printContent(content, { copies: 1 });
      await markJobComplete(job.id);
      
      stats.printed++;
      stats.lastPrint = new Date().toISOString();
      stats.lastError = null;
      console.log(\`   ✓ Ticket do enólogo impresso!\`);
      
      return;
    }

    // ==== PROCESSAR ROTISSEUR_TICKET (SUGESTÃO DO MAÎTRE RÔTISSEUR) ====
    if (job.job_type === 'rotisseur_ticket') {
      const md = job.metadata || {};
      const raw = String(md.ticketContent || '').trim();
      if (!raw) throw new Error('ticketContent não encontrado');

      const sanitizeText = (input) => {
        const str = String(input || '')
          .replace(/[\\u{1F300}-\\u{1FAFF}]/gu, '')
          .replace(/[─━]/g, '-')
          .replace(/[═]/g, '=');
        const noDia = str.normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');
        return noDia.replace(/[^\\x0A\\x0D\\x20-\\x7E]/g, '');
      };

      const content = COMMANDS.INIT + COMMANDS.NORMAL + sanitizeText(raw) + '\\n\\n\\n' + COMMANDS.CUT;
      
      await printContent(content, { copies: 1 });
      await markJobComplete(job.id);
      
      stats.printed++;
      stats.lastPrint = new Date().toISOString();
      stats.lastError = null;
      console.log(\`   ✓ Ticket do maître rôtisseur impresso!\`);
      
      return;
    }

    // ==== PROCESSAR FULL_ORDER (TICKET COMPLETO) ====
    if (job.job_type === 'full_order') {
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', job.order_id)
        .single();

      if (orderError || !order) {
        throw new Error(\`Pedido não encontrado: \${job.order_id}\`);
      }

      // Buscar nome da empresa
      let companyName = config.companyName || null;
      if (!companyName && order.company_id) {
        const { data: company } = await supabase
          .from('companies')
          .select('name')
          .eq('id', order.company_id)
          .single();
        if (company) companyName = company.name;
      }

      const { data: items, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', job.order_id);

      if (itemsError) {
        throw new Error(\`Erro ao buscar itens: \${itemsError.message}\`);
      }

      const content = formatFullOrder(order, items || [], companyName);
      await printContent(content, { copies: config.copies });

      await markJobComplete(job.id);
      stats.printed++;
      stats.lastPrint = new Date().toISOString();
      stats.lastError = null;
      console.log(\`   ✓ Ticket completo impresso!\`);
      return;
    }

    // ==== PROCESSAR ORDER (PEDIDO) ====
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', job.order_id)
      .single();

    if (orderError || !order) {
      const extra = orderError
        ? \` (\${orderError.code || 'erro'}: \${orderError.message})\`
        : ' (possível falta de permissão: verifique o login do agente)';
      throw new Error(\`Pedido não encontrado: \${job.order_id}\${extra}\`);
    }

    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', job.order_id);

    if (itemsError) {
      throw new Error(\`Erro ao buscar itens: \${itemsError.message}\`);
    }

    let sectorName = 'PRODUÇÃO';
    let sectorPrintMode = null;
    let sectorPrinterName = null;
    let sectorPrinterHost = null;
    let sectorPrinterPort = 9100;
    
    if (job.print_sector_id) {
      const { data: sector } = await supabase
        .from('print_sectors')
        .select('name, print_mode, printer_name, printer_host, printer_port')
        .eq('id', job.print_sector_id)
        .single();
      
      if (sector) {
        sectorName = sector.name.toUpperCase();
        sectorPrintMode = sector.print_mode;
        sectorPrinterName = sector.printer_name;
        sectorPrinterHost = sector.printer_host;
        sectorPrinterPort = sector.printer_port || 9100;
        
        console.log(\`   Setor: \${sectorName}, Modo: \${sectorPrintMode}, Impressora: \${sectorPrinterName || sectorPrinterHost || 'global'}\`);
      }
    }

    let filteredItems = items || [];
    if (job.print_sector_id && items) {
      // OTIMIZAÇÃO: Se o job já tem product_ids no metadata (criado pelo createPrintJobsForOrder),
      // usa diretamente sem fazer queries extras
      const metadataProductIds = job.metadata?.product_ids;
      
      if (metadataProductIds && Array.isArray(metadataProductIds) && metadataProductIds.length > 0) {
        const allowedIds = new Set(metadataProductIds);
        filteredItems = items.filter(item => allowedIds.has(item.product_id));
        console.log(\`   Setor "\${sectorName}": \${filteredItems.length} de \${items.length} itens (via metadata)\`);
      } else {
        // Fallback: buscar dinamicamente (para jobs antigos ou criados manualmente)
        const allowedProductIds = new Set();
        const productIds = items.map(i => i.product_id).filter(Boolean);
        
        // 1) Buscar mapeamentos explícitos (product_print_sectors) - PRIORIDADE
        const { data: explicitMappings } = await supabase
          .from('product_print_sectors')
          .select('product_id')
          .eq('sector_id', job.print_sector_id)
          .in('product_id', productIds);

        const explicitProductIds = new Set((explicitMappings || []).map(m => m.product_id));
        
        // Adicionar os com mapeamento explícito
        explicitProductIds.forEach(id => allowedProductIds.add(id));

        // 2) Para produtos SEM mapeamento explícito, usar production_location
        const productsWithoutMapping = productIds.filter(id => !explicitProductIds.has(id));
        
        if (productsWithoutMapping.length > 0) {
          const { data: products } = await supabase
            .from('products')
            .select(\`
              id,
              production_location,
              subcategory:subcategories (
                production_location,
                category:categories (
                  production_location
                )
              )
            \`)
            .in('id', productsWithoutMapping);

          const normalize = (s) => String(s || '').trim().toLowerCase();
          const sectorNameNorm = normalize(sectorName);

          (products || []).forEach(p => {
            const loc = 
              p.production_location || 
              p.subcategory?.production_location || 
              p.subcategory?.category?.production_location || 
              null;
            
            if (loc && normalize(loc) === sectorNameNorm) {
              allowedProductIds.add(p.id);
            }
          });
        }

        // 3) Filtrar apenas itens permitidos para este setor
        filteredItems = items.filter(item => allowedProductIds.has(item.product_id));
        
        console.log(\`   Setor "\${sectorName}": \${filteredItems.length} de \${items.length} itens (via query)\`);
      }
    }

    if (filteredItems.length === 0) {
      console.log('   Nenhum item para este setor');
      await markJobComplete(job.id);
      return;
    }

    const content = formatOrder(order, filteredItems, sectorName);
    
    await printContent(content, { 
      copies: config.copies,
      printMode: sectorPrintMode,
      printerName: sectorPrinterName,
      printerHost: sectorPrinterHost,
      printerPort: sectorPrinterPort,
    });

    await markJobComplete(job.id);

    stats.printed++;
    stats.lastPrint = new Date().toISOString();
    stats.lastError = null;
    console.log(\`   ✓ Impresso!\`);

  } catch (error) {
    console.error(\`   ❌ Erro: \${error.message}\`);
    await markJobFailed(job.id, error.message);
    stats.failed++;
    stats.lastError = error.message;
    
    notifyPrintError(job.order_id || job.id, error.message);
  } finally {
    isProcessing = false;
  }
}

async function fetchPendingJobs() {
  const config = getConfig();
  
  // Buscar jobs de tipo order, full_order, table_bill, printer_test, sommelier_ticket E rotisseur_ticket
  const query = supabase
    .from('print_job_queue')
    .select('*')
    .eq('status', 'pending')
    .in('job_type', ['order', 'full_order', 'table_bill', 'printer_test', 'sommelier_ticket', 'rotisseur_ticket'])
    .order('created_at', { ascending: true })
    .limit(10);

  if (config.companyId) {
    query.eq('company_id', config.companyId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Erro ao buscar jobs:', error.message);
    return [];
  }

  return data || [];
}

async function pollLoop() {
  if (!stats.isRunning) return;
  
  try {
    const jobs = await fetchPendingJobs();
    for (const job of jobs) {
      await processJob(job);
    }
    
    if (reconnectAttempts > 0 && wasConnected) {
      reconnectAttempts = 0;
      notifyReconnected();
    }
    wasConnected = true;
    
  } catch (error) {
    console.error('Erro no poll:', error.message);
    
    reconnectAttempts++;
    if (reconnectAttempts === 1) {
      notifyConnectionLost();
    }
  }
}

async function startAgent() {
  const config = getConfig();

  if (stats.isRunning) {
    return { success: true, message: 'Já está rodando' };
  }

  if (!config.supabaseUrl || !config.supabaseKey) {
    return { success: false, error: 'Configure URL e Key' };
  }

  if (!config.companyId) {
    return { success: false, error: 'Configure o ID da Empresa' };
  }

  if (!config.agentEmail || !config.agentPassword) {
    return { success: false, error: 'Configure Email e Senha do Agente' };
  }

  try {
    const authClient = createClient(config.supabaseUrl, config.supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    const { data, error } = await authClient.auth.signInWithPassword({
      email: config.agentEmail,
      password: config.agentPassword,
    });

    if (error || !data?.session?.access_token) {
      throw new Error(\`Falha no login do agente: \${error?.message || 'sem sessão'}\`);
    }

    const accessToken = data.session.access_token;
    supabase = createClient(config.supabaseUrl, config.supabaseKey, {
      global: {
        headers: {
          Authorization: \`Bearer \${accessToken}\`,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    console.log('✓ Login do agente OK');

    realtimeChannel = supabase
      .channel('print-agent-desktop')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'print_job_queue',
          filter: \`company_id=eq.\${config.companyId}\`,
        },
        (payload) => {
          console.log('🔔 Novo job via realtime');
          processJob(payload.new);
        }
      )
      .subscribe((status) => {
        console.log('Realtime status:', status);
      });

    pollIntervalId = setInterval(pollLoop, config.pollInterval);

    stats.isRunning = true;
    stats.started = new Date().toISOString();
    stats.lastError = null;
    processedJobs.clear();
    reconnectAttempts = 0;
    wasConnected = false;

    await pollLoop();

    console.log('✓ Agente iniciado');
    return { success: true };
  } catch (e) {
    stats.isRunning = false;
    stats.lastError = e.message;
    console.error('❌ Não foi possível iniciar o agente:', e.message);
    return { success: false, error: e.message };
  }
}

function stopAgent() {
  if (pollIntervalId) {
    clearInterval(pollIntervalId);
    pollIntervalId = null;
  }
  
  if (realtimeChannel) {
    supabase?.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }
  
  stats.isRunning = false;
  console.log('⏹️ Agente parado');
  return { success: true };
}

function getStats() {
  return { ...stats };
}

async function printTest() {
  try {
    await printTestPage();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

module.exports = {
  startAgent,
  stopAgent,
  getStats,
  printTest,
  processJob,
};`;

  // ==================== tray-manager.js ====================
  const trayManagerJs = `/**
 * Gerenciamento do Ícone na Bandeja do Sistema (System Tray)
 */

let SysTray;
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

const { startAgent, stopAgent, getStats, printTest } = require('./agent-core');
const { isStartupEnabled, toggleStartup } = require('./startup-manager');
const { notify } = require('./notification-manager');
const { hasValidConfig } = require('./config-manager');

let ICON_GREEN, ICON_YELLOW, ICON_RED;

let currentStatus = 'stopped';
let systray = null;
let startupChecked = false;

function loadIcons() {
  const assetsDir = path.join(__dirname, 'assets');
  
  try {
    ICON_GREEN = fs.readFileSync(path.join(assetsDir, 'icon-green.png')).toString('base64');
  } catch (e) {
    ICON_GREEN = getDefaultIcon();
  }
  
  try {
    ICON_YELLOW = fs.readFileSync(path.join(assetsDir, 'icon-yellow.png')).toString('base64');
  } catch (e) {
    ICON_YELLOW = getDefaultIcon();
  }
  
  try {
    ICON_RED = fs.readFileSync(path.join(assetsDir, 'icon-red.png')).toString('base64');
  } catch (e) {
    ICON_RED = getDefaultIcon();
  }
}

function getDefaultIcon() {
  return 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAH0lEQVQ4y2Ng+M8w/T8DAwMjI8N/BgYGBkYGBoZ/DACIA/cBEjVFAAAAAElFTkSuQmCC';
}

function getIconForStatus(status) {
  switch (status) {
    case 'running': return ICON_GREEN;
    case 'pending': return ICON_YELLOW;
    case 'error': return ICON_RED;
    default: return ICON_RED;
  }
}

function getTooltipForStatus(status) {
  const stats = getStats();
  switch (status) {
    case 'running': 
      return \`Zoopi Print - Monitorando (\${stats.printed} impressos)\`;
    case 'pending': 
      return 'Zoopi Print - Configuração pendente';
    case 'error': 
      return \`Zoopi Print - Erro: \${stats.lastError || 'Desconhecido'}\`;
    default: 
      return 'Zoopi Print - Parado';
  }
}

async function createMenuItems() {
  const stats = getStats();
  const isRunning = stats.isRunning;
  const startupEnabled = await isStartupEnabled();
  startupChecked = startupEnabled;
  
  return [
    {
      title: isRunning ? '⏹️ Parar Agente' : '▶️ Iniciar Agente',
      tooltip: isRunning ? 'Para o monitoramento' : 'Inicia o monitoramento',
      enabled: hasValidConfig(),
    },
    { title: '', enabled: false },
    {
      title: '⚙️ Configurações',
      tooltip: 'Abre a interface de configuração',
      enabled: true,
    },
    {
      title: '📊 Estatísticas',
      tooltip: 'Mostra estatísticas de impressão',
      enabled: true,
    },
    {
      title: '🖨️ Imprimir Teste',
      tooltip: 'Envia uma página de teste para a impressora',
      enabled: hasValidConfig(),
    },
    { title: '', enabled: false },
    {
      title: startupEnabled ? '✓ Iniciar com Windows' : '○ Iniciar com Windows',
      tooltip: 'Inicia automaticamente quando o Windows ligar',
      enabled: true,
    },
    { title: '', enabled: false },
    {
      title: '❌ Sair',
      tooltip: 'Fecha o agente de impressão',
      enabled: true,
    },
  ];
}

async function startTray() {
  if (!SysTray) {
    try {
      SysTray = require('systray2').default;
    } catch (e) {
      console.error('Falha ao carregar systray:', e && e.stack ? e.stack : e.message);
      throw e;
    }
  }

  loadIcons();

  const menuItems = await createMenuItems();

  try {
    systray = new SysTray({
      menu: {
        icon: getIconForStatus(currentStatus),
        title: '',
        tooltip: getTooltipForStatus(currentStatus),
        items: menuItems,
      },
      debug: false,
      copyDir: true,
    });
  } catch (e) {
    console.error('Falha ao iniciar System Tray:', e && e.stack ? e.stack : e.message);
    notify('Zoopi Print Agent', 'Falha ao iniciar o ícone na bandeja. Veja o log em %APPDATA%\\\\Zoopi\\\\agent.log');
    throw e;
  }

  systray.onClick(async (action) => {
    const idx = action.seq_id;
    
    switch (idx) {
      case 0:
        await handleToggleAgent();
        break;
      case 2:
        exec('start http://localhost:3847');
        break;
      case 3:
        showStatsNotification();
        break;
      case 4:
        await handlePrintTest();
        break;
      case 6:
        await handleToggleStartup();
        break;
      case 8:
        handleExit();
        break;
    }
  });
  
  return systray;
}

async function updateTrayStatus(status) {
  currentStatus = status;
  
  if (!systray) return;
  
  const menuItems = await createMenuItems();
  
  systray.sendAction({
    type: 'update-menu',
    menu: {
      icon: getIconForStatus(status),
      title: '',
      tooltip: getTooltipForStatus(status),
      items: menuItems,
    },
  });
}

async function handleToggleAgent() {
  const stats = getStats();
  
  if (stats.isRunning) {
    stopAgent();
    updateTrayStatus('stopped');
    notify('Zoopi Print Agent', 'Agente parado');
  } else {
    const result = await startAgent();
    if (result.success) {
      updateTrayStatus('running');
      notify('Zoopi Print Agent', 'Agente iniciado e monitorando');
    } else {
      updateTrayStatus('error');
      notify('Zoopi Print Agent', \`Erro: \${result.error}\`);
    }
  }
}

async function handlePrintTest() {
  notify('Zoopi Print Agent', 'Enviando página de teste...');
  
  const result = await printTest();
  
  if (result.success) {
    notify('Zoopi Print Agent', 'Página de teste impressa com sucesso!');
  } else {
    notify('Zoopi Print Agent', \`Erro ao imprimir teste: \${result.error}\`);
  }
}

async function handleToggleStartup() {
  try {
    const enabled = await toggleStartup();
    startupChecked = enabled;
    
    await updateTrayStatus(currentStatus);
    
    notify('Zoopi Print Agent', 
      enabled 
        ? 'Agente irá iniciar automaticamente com Windows' 
        : 'Inicialização automática desabilitada'
    );
  } catch (e) {
    notify('Zoopi Print Agent', \`Erro ao configurar startup: \${e.message}\`);
  }
}

function showStatsNotification() {
  const stats = getStats();
  const uptime = stats.started 
    ? Math.floor((Date.now() - new Date(stats.started).getTime()) / 60000)
    : 0;
  
  notify('Estatísticas de Impressão', 
    \`Impressos: \${stats.printed}\\n\` +
    \`Falhas: \${stats.failed}\\n\` +
    \`Status: \${stats.isRunning ? 'Ativo' : 'Parado'}\\n\` +
    \`Uptime: \${uptime} min\`
  );
}

function handleExit() {
  stopAgent();
  if (systray) {
    systray.kill(false);
  }
  process.exit(0);
}

module.exports = {
  startTray,
  updateTrayStatus,
};`;

  // ==================== web-server.js ====================
  const webServerJs = `/**
 * Servidor Web para Interface de Configuração
 */

const http = require('http');
const { getConfig, saveConfig } = require('./config-manager');
// IMPORTANTE: não deixe o require('./agent-core') derrubar o servidor web.
// Se o agent-core estiver com erro (ex.: regex inválida), a interface web ainda precisa abrir.
let startAgent, stopAgent, getStats, printTest;
try {
  const core = require('./agent-core');
  startAgent = core.startAgent;
  stopAgent = core.stopAgent;
  getStats = core.getStats;
  printTest = core.printTest;
} catch (e) {
  const msg = e && e.stack ? e.stack : (e && e.message ? e.message : String(e));
  console.error('[web-server] Falha ao carregar agent-core:', msg);
  startAgent = async () => ({ success: false, error: 'agent-core indisponível: ' + msg });
  stopAgent = async () => ({ success: false, error: 'agent-core indisponível' });
  getStats = () => ({ started: null, printed: 0, failed: 0, lastPrint: null, isRunning: false, lastError: 'agent-core indisponível' });
  printTest = async () => ({ success: false, error: 'agent-core indisponível' });
}
// Protege requires para não derrubar o módulo inteiro
let listWindowsPrinters, testNetworkPrinter, testUsbPrinter;
try {
  const printer = require('./printer');
  listWindowsPrinters = printer.listWindowsPrinters;
  testNetworkPrinter = printer.testNetworkPrinter;
  testUsbPrinter = printer.testUsbPrinter;
} catch (e) {
  console.error('[web-server] Falha ao carregar printer:', e && e.message ? e.message : String(e));
  listWindowsPrinters = async () => [];
  testNetworkPrinter = async () => ({ success: false, error: 'printer indisponível' });
  testUsbPrinter = async () => ({ success: false, error: 'printer indisponível' });
}

let updateTrayStatus;
try {
  const tray = require('./tray-manager');
  updateTrayStatus = tray.updateTrayStatus;
} catch (e) {
  console.error('[web-server] Falha ao carregar tray-manager:', e && e.message ? e.message : String(e));
  updateTrayStatus = () => {};
}

const HTML_PAGE = \`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Zoopi Print Agent - Configuração</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      min-height: 100vh;
      color: #fff;
      padding: 20px;
    }
    .container { max-width: 600px; margin: 0 auto; }
    h1 { text-align: center; margin-bottom: 30px; font-size: 24px; }
    .card {
      background: rgba(255,255,255,0.1);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 16px;
      backdrop-filter: blur(10px);
    }
    .card h2 {
      font-size: 14px;
      margin-bottom: 16px;
      color: #4ade80;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .form-group { margin-bottom: 14px; }
    label {
      display: block;
      font-size: 13px;
      margin-bottom: 6px;
      color: #94a3b8;
    }
    input, select {
      width: 100%;
      padding: 12px;
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 8px;
      background: rgba(0,0,0,0.3);
      color: #fff;
      font-size: 14px;
    }
    input:focus, select:focus {
      outline: none;
      border-color: #4ade80;
    }
    .row { display: flex; gap: 12px; }
    .row .form-group { flex: 1; }
    button {
      width: 100%;
      padding: 14px;
      border: none;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      margin-bottom: 8px;
    }
    .btn-primary { background: #4ade80; color: #000; }
    .btn-primary:hover { background: #22c55e; }
    .btn-secondary { background: rgba(255,255,255,0.1); color: #fff; }
    .btn-secondary:hover { background: rgba(255,255,255,0.2); }
    .btn-danger { background: #ef4444; color: #fff; }
    .btn-danger:hover { background: #dc2626; }
    .status-bar {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 14px;
      border-radius: 8px;
      margin-bottom: 16px;
    }
    .status-bar.online { background: rgba(74, 222, 128, 0.2); border: 1px solid rgba(74, 222, 128, 0.3); }
    .status-bar.offline { background: rgba(239, 68, 68, 0.2); border: 1px solid rgba(239, 68, 68, 0.3); }
    .status-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      animation: pulse 2s infinite;
    }
    .status-bar.online .status-dot { background: #4ade80; }
    .status-bar.offline .status-dot { background: #ef4444; }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    .stats { display: flex; gap: 20px; font-size: 13px; color: #94a3b8; }
    .printers-list {
      background: rgba(0,0,0,0.2);
      border-radius: 8px;
      padding: 10px;
      max-height: 120px;
      overflow-y: auto;
      font-size: 13px;
    }
    .printers-list div {
      padding: 8px 10px;
      cursor: pointer;
      border-radius: 4px;
      margin-bottom: 2px;
    }
    .printers-list div:hover { background: rgba(255,255,255,0.1); }
    .hidden { display: none; }
    .toast {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 14px;
      z-index: 1000;
      animation: slideUp 0.3s ease;
    }
    .toast.success { background: #4ade80; color: #000; }
    .toast.error { background: #ef4444; color: #fff; }
    @keyframes slideUp {
      from { opacity: 0; transform: translateX(-50%) translateY(20px); }
      to { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
    .checkbox-row {
      display: flex;
      gap: 20px;
    }
    .checkbox-row label {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      color: #fff;
    }
    .checkbox-row input[type="checkbox"] {
      width: 18px;
      height: 18px;
    }
    .version {
      text-align: center;
      font-size: 12px;
      color: #64748b;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🖨️ Zoopi Print Agent</h1>
    
    <div id="status-bar" class="status-bar offline">
      <div class="status-dot"></div>
      <div>
        <div id="status-text" style="font-weight: 600;">Parado</div>
        <div class="stats">
          <span>✅ <span id="stat-printed">0</span></span>
          <span>❌ <span id="stat-failed">0</span></span>
          <span id="stat-last"></span>
        </div>
      </div>
    </div>
    
    <div class="card">
      <h2>🔗 Conexão Zoopi</h2>
      <div class="form-group">
        <label>URL do Supabase</label>
        <input type="text" id="supabaseUrl" placeholder="https://xxx.supabase.co">
      </div>
      <div class="form-group">
        <label>Chave Anon</label>
        <input type="password" id="supabaseKey" placeholder="eyJhbGci...">
      </div>
      <div class="form-group">
        <label>ID da Empresa</label>
        <input type="text" id="companyId" placeholder="uuid-da-empresa">
      </div>

      <div class="row">
        <div class="form-group">
          <label>Email do Agente</label>
          <input type="text" id="agentEmail" placeholder="seu-email@empresa.com">
        </div>
        <div class="form-group">
          <label>Senha do Agente</label>
          <input type="password" id="agentPassword" placeholder="********">
        </div>
      </div>
      <div class="version" style="margin-top: 8px;">
        Necessário para o agente ler/atualizar a fila protegida.
      </div>
    </div>
    
    <div class="card">
      <h2>🖨️ Impressora</h2>
      <div class="form-group">
        <label>Tipo</label>
        <select id="printerType" onchange="togglePrinterType()">
          <option value="network">Rede (TCP/IP)</option>
          <option value="usb">USB (Windows)</option>
        </select>
      </div>
      
      <div id="network-fields">
        <div class="row">
          <div class="form-group">
            <label>IP da Impressora</label>
            <input type="text" id="printerHost" placeholder="192.168.1.100">
          </div>
          <div class="form-group" style="max-width: 100px;">
            <label>Porta</label>
            <input type="number" id="printerPort" value="9100">
          </div>
        </div>
      </div>
      
      <div id="usb-fields" class="hidden">
        <div class="form-group">
          <label>Nome da Impressora</label>
          <input type="text" id="printerName" placeholder="EPSON TM-T20">
        </div>
        <div class="form-group">
          <label>Impressoras Detectadas (clique para selecionar)</label>
          <div id="printers-list" class="printers-list">Carregando...</div>
        </div>
      </div>
      
      <button class="btn-secondary" onclick="testPrinter()">🔍 Testar Conexão</button>
    </div>
    
    <div class="card">
      <h2>⚙️ Opções</h2>
      <div class="row">
        <div class="form-group">
          <label>Codificação</label>
          <select id="encoding">
            <option value="cp860">CP860 (Português)</option>
            <option value="cp850">CP850</option>
            <option value="ascii">ASCII</option>
            <option value="utf8">UTF-8</option>
          </select>
        </div>
        <div class="form-group">
          <label>Cópias</label>
          <input type="number" id="copies" min="1" max="5" value="1">
        </div>
      </div>
      <div class="checkbox-row">
        <label><input type="checkbox" id="beepOnPrint" checked> Beep ao imprimir</label>
        <label><input type="checkbox" id="cutAfterPrint" checked> Cortar papel</label>
      </div>
    </div>
    
    <button class="btn-primary" onclick="saveAndStart()">💾 Salvar e Iniciar</button>
    <button class="btn-danger" onclick="stopAgentBtn()">⏹️ Parar Agente</button>
    <button class="btn-secondary" onclick="printTestBtn()">🖨️ Imprimir Teste</button>
    
    <div class="version">Zoopi Print Agent v2.0.0 - Desktop Edition</div>
  </div>
  
  <script>
    function showToast(msg, type) {
      const existing = document.querySelector('.toast');
      if (existing) existing.remove();
      
      const toast = document.createElement('div');
      toast.className = 'toast ' + type;
      toast.textContent = msg;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    }
    
    function togglePrinterType() {
      const type = document.getElementById('printerType').value;
      document.getElementById('network-fields').classList.toggle('hidden', type !== 'network');
      document.getElementById('usb-fields').classList.toggle('hidden', type !== 'usb');
      if (type === 'usb') loadPrinters();
    }
    
    async function loadPrinters() {
      try {
        const res = await fetch('/api/printers');
        const data = await res.json();
        const list = document.getElementById('printers-list');
        
        if (data.printers?.length > 0) {
          list.innerHTML = data.printers.map(p => 
            '<div onclick="selectPrinter(this)">' + p + '</div>'
          ).join('');
        } else {
          list.innerHTML = '<div style="color:#94a3b8">Nenhuma impressora encontrada</div>';
        }
      } catch (e) {
        console.error(e);
      }
    }
    
    function selectPrinter(el) {
      document.getElementById('printerName').value = el.textContent;
      showToast('Impressora selecionada: ' + el.textContent, 'success');
    }
    
    async function loadConfig() {
      try {
        const res = await fetch('/api/config');
        const data = await res.json();

        document.getElementById('supabaseUrl').value = data.supabaseUrl || '';
        document.getElementById('supabaseKey').value = data.supabaseKey || '';
        document.getElementById('companyId').value = data.companyId || '';
        document.getElementById('agentEmail').value = data.agentEmail || '';
        document.getElementById('agentPassword').value = data.agentPassword || '';
        document.getElementById('printerType').value = data.printerType || 'network';
        document.getElementById('printerHost').value = data.printerHost || '192.168.1.100';
        document.getElementById('printerPort').value = data.printerPort || 9100;
        document.getElementById('printerName').value = data.printerName || '';
        document.getElementById('encoding').value = data.encoding || 'cp860';
        document.getElementById('copies').value = data.copies || 1;
        document.getElementById('beepOnPrint').checked = data.beepOnPrint !== false;
        document.getElementById('cutAfterPrint').checked = data.cutAfterPrint !== false;

        togglePrinterType();
      } catch (e) {
        console.error(e);
      }
    }
    
    async function loadStatus() {
      try {
        const res = await fetch('/api/status');
        const data = await res.json();
        
        const bar = document.getElementById('status-bar');
        const text = document.getElementById('status-text');
        
        if (data.isRunning) {
          bar.className = 'status-bar online';
          text.textContent = 'Monitorando fila...';
        } else {
          bar.className = 'status-bar offline';
          text.textContent = data.lastError || 'Parado';
        }
        
        document.getElementById('stat-printed').textContent = data.printed || 0;
        document.getElementById('stat-failed').textContent = data.failed || 0;
        
        if (data.lastPrint) {
          document.getElementById('stat-last').textContent = 
            '🕐 ' + new Date(data.lastPrint).toLocaleTimeString('pt-BR');
        }
      } catch (e) {
        console.error(e);
      }
    }
    
    async function testPrinter() {
      const type = document.getElementById('printerType').value;
      const body = type === 'usb' 
        ? { type: 'usb', printerName: document.getElementById('printerName').value }
        : { type: 'network', host: document.getElementById('printerHost').value, port: parseInt(document.getElementById('printerPort').value) };
      
      try {
        const res = await fetch('/api/test-printer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        const data = await res.json();
        
        if (data.success) {
          showToast('✅ Impressora conectada!', 'success');
        } else {
          showToast('❌ ' + (data.error || 'Falha'), 'error');
        }
      } catch (e) {
        showToast('❌ Erro ao testar', 'error');
      }
    }
    
    async function saveAndStart() {
      const cfg = {
        supabaseUrl: document.getElementById('supabaseUrl').value.trim(),
        supabaseKey: document.getElementById('supabaseKey').value.trim(),
        companyId: document.getElementById('companyId').value.trim(),
        agentEmail: document.getElementById('agentEmail').value.trim(),
        agentPassword: document.getElementById('agentPassword').value,
        printerType: document.getElementById('printerType').value,
        printerHost: document.getElementById('printerHost').value.trim(),
        printerPort: parseInt(document.getElementById('printerPort').value) || 9100,
        printerName: document.getElementById('printerName').value.trim(),
        encoding: document.getElementById('encoding').value,
        copies: parseInt(document.getElementById('copies').value) || 1,
        beepOnPrint: document.getElementById('beepOnPrint').checked,
        cutAfterPrint: document.getElementById('cutAfterPrint').checked
      };
      
      try {
        const res = await fetch('/api/save-and-start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cfg)
        });
        const data = await res.json();
        
        if (data.success) {
          showToast('✅ Agente iniciado!', 'success');
        } else {
          showToast('❌ ' + (data.error || 'Erro'), 'error');
        }
        
        setTimeout(loadStatus, 500);
      } catch (e) {
        showToast('❌ Erro ao salvar', 'error');
      }
    }
    
    async function stopAgentBtn() {
      try {
        await fetch('/api/stop', { method: 'POST' });
        showToast('⏹️ Agente parado', 'success');
        setTimeout(loadStatus, 500);
      } catch (e) {
        console.error(e);
      }
    }
    
    async function printTestBtn() {
      try {
        const res = await fetch('/api/print-test', { method: 'POST' });
        const data = await res.json();
        
        if (data.success) {
          showToast('✅ Teste enviado!', 'success');
        } else {
          showToast('❌ ' + (data.error || 'Erro'), 'error');
        }
      } catch (e) {
        showToast('❌ Erro ao imprimir', 'error');
      }
    }
    
    loadConfig();
    loadStatus();
    setInterval(loadStatus, 3000);
  </script>
</body>
</html>\`;

function startWebServer(port = 3847) {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, \`http://\${req.headers.host}\`);
    
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }
    
    if (url.pathname === '/' || url.pathname === '/config') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(HTML_PAGE);
      return;
    }
    
    if (url.pathname === '/api/config' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(getConfig()));
      return;
    }
    
    if (url.pathname === '/api/status') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(getStats()));
      return;
    }
    
    if (url.pathname === '/api/printers') {
      const printers = await listWindowsPrinters();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ printers }));
      return;
    }
    
    if (url.pathname === '/api/test-printer' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        try {
          const data = JSON.parse(body);
          let result;
          
          if (data.type === 'usb') {
            result = await testUsbPrinter(data.printerName);
          } else {
            result = await testNetworkPrinter(data.host, data.port);
          }
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: e.message }));
        }
      });
      return;
    }
    
    if (url.pathname === '/api/print-test' && req.method === 'POST') {
      try {
        const result = await printTest();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: e.message }));
      }
      return;
    }
    
    if (url.pathname === '/api/save-and-start' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        try {
          const newConfig = JSON.parse(body);

          stopAgent();
          saveConfig(newConfig);
          const result = await startAgent();

          if (result.success) {
            updateTrayStatus('running');
          } else {
            updateTrayStatus('error');
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: e.message }));
        }
      });
      return;
    }
    
    if (url.pathname === '/api/stop' && req.method === 'POST') {
      const result = stopAgent();
      updateTrayStatus('stopped');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
      return;
    }
    
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  });
  
  server.listen(port, () => {
    console.log(\`Servidor web iniciado em http://localhost:\${port}\`);
  });
  
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(\`Porta \${port} já está em uso\`);
    } else {
      console.error('Erro no servidor:', err.message);
    }
  });
  
  return server;
}

module.exports = {
  startWebServer,
};`;

  // Download em .zip
  await downloadZipFile('ZoopiPrintAgentDesktop.zip', [
    { name: 'package.json', content: packageJson },
    { name: 'agent-config.json', content: agentConfig },
    { name: 'BUILD.bat', content: buildBat },
    { name: 'RUN_DEV.bat', content: runDevBat },
    { name: 'DIAGNOSTICO.bat', content: diagnosticoBat },
    { name: 'LEIAME.txt', content: readme },
    { name: 'main.js', content: mainJs },
    { name: 'config-manager.js', content: configManagerJs },
    { name: 'notification-manager.js', content: notificationManagerJs },
    { name: 'startup-manager.js', content: startupManagerJs },
    { name: 'printer.js', content: printerJs },
    { name: 'agent-core.js', content: agentCoreJs },
    { name: 'tray-manager.js', content: trayManagerJs },
    { name: 'web-server.js', content: webServerJs },
  ]);
}
