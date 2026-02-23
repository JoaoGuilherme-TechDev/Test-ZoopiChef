/**
 * Zoopi Print Agent - Desktop
 * 
 * Aplicativo Windows com ícone na bandeja do sistema.
 * Monitora a fila de impressão e imprime automaticamente.
 */

// ==================== LOG EM ARQUIVO (para diagnosticar "pisca e some") ====================
const fs = require('fs');
const path = require('path');
const os = require('os');

// Usa APPDATA real do Windows quando disponível
const APPDATA_DIR = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
const LOG_DIR = path.join(APPDATA_DIR, 'Zoopi');
const LOG_PATH = path.join(LOG_DIR, 'agent.log');

// Fallback: se por algum motivo não der pra gravar no APPDATA (permissão, env quebrada, etc.),
// grava um log "portátil" ao lado do executável.
const PORTABLE_LOG_PATH = (() => {
  try {
    const exeDir = path.dirname(process.execPath || __filename);
    return path.join(exeDir, 'agent-portable.log');
  } catch (_) {
    return path.join(process.cwd(), 'agent-portable.log');
  }
})();

function appendLog(level, message) {
  try {
    if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
    const line = `[${new Date().toISOString()}] [${level}] ${message}\n`;
    fs.appendFileSync(LOG_PATH, line, 'utf8');
  } catch (_) {
    // se até log falhar no APPDATA, tenta um log portátil
    try {
      const line = `[${new Date().toISOString()}] [${level}] ${message}\n`;
      fs.appendFileSync(PORTABLE_LOG_PATH, line, 'utf8');
    } catch (_) {
      // se até log portátil falhar, não derruba o app
    }
  }
}

// espelha console -> arquivo
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

appendLog('INFO', 'Boot v2.1: iniciando Zoopi Print Agent');
appendLog('INFO', 'Passo 1: variaveis...');

// ==================== imports (DEPOIS do log) ====================
// Cada require em try/catch para identificar qual módulo falha

let startWebServer = null;
let loadConfig = null;
let hasValidConfig = null;
let getConfig = null;
let startAgent = null;
let stopAgent = null;
let notify = null;
let startTray = null;
let updateTrayStatus = null;

try {
  appendLog('INFO', 'Carregando web-server...');
  ({ startWebServer } = require('./web-server'));
  appendLog('INFO', 'web-server OK');
} catch (e) {
  appendLog('ERROR', 'Falha ao carregar web-server: ' + (e && e.stack ? e.stack : e.message));
}

try {
  appendLog('INFO', 'Carregando config-manager...');
  ({ loadConfig, hasValidConfig, getConfig } = require('./config-manager'));
  appendLog('INFO', 'config-manager OK');
} catch (e) {
  appendLog('ERROR', 'Falha ao carregar config-manager: ' + (e && e.stack ? e.stack : e.message));
}

try {
  appendLog('INFO', 'Carregando agent-core...');
  ({ startAgent, stopAgent } = require('./agent-core'));
  appendLog('INFO', 'agent-core OK');
} catch (e) {
  appendLog('ERROR', 'Falha ao carregar agent-core: ' + (e && e.stack ? e.stack : e.message));
}

try {
  appendLog('INFO', 'Carregando notification-manager...');
  ({ notify } = require('./notification-manager'));
  appendLog('INFO', 'notification-manager OK');
} catch (e) {
  appendLog('ERROR', 'Falha ao carregar notification-manager: ' + (e && e.stack ? e.stack : e.message));
}

try {
  appendLog('INFO', 'Carregando tray-manager...');
  ({ startTray, updateTrayStatus } = require('./tray-manager'));
  appendLog('INFO', 'tray-manager OK');
} catch (e) {
  appendLog('ERROR', 'Falha ao carregar tray-manager: ' + (e && e.stack ? e.stack : e.message));
}

// Previne múltiplas instâncias
const lockFile = path.join(APPDATA_DIR, 'Zoopi', '.zoopi-print-agent.lock');

function checkSingleInstance() {
  try {
    // Tenta criar lock file
    if (fs.existsSync(lockFile)) {
      const pid = fs.readFileSync(lockFile, 'utf8');
      try {
        // Verifica se processo ainda existe
        process.kill(parseInt(pid), 0);
        console.log('Outra instância já está rodando. Encerrando...');
        process.exit(0);
      } catch (e) {
        // Processo não existe, podemos continuar
      }
    }
    fs.writeFileSync(lockFile, process.pid.toString());
  } catch (e) {
    console.error('Erro ao verificar instância:', e.message);
  }
}

function cleanupLock() {
  try {
    if (fs.existsSync(lockFile)) {
      fs.unlinkSync(lockFile);
    }
  } catch (e) {}
}

async function main() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║     ZOOPI PRINT AGENT - DESKTOP        ║');
  console.log('║     Versão 2.0.0                       ║');
  console.log('╚════════════════════════════════════════╝');
  console.log('');
  
  // Verifica instância única
  checkSingleInstance();
  
  // Carrega configuração
  const configLoaded = loadConfig ? loadConfig() : false;
  console.log(configLoaded ? '✓ Configuração carregada' : '⚠ Sem configuração prévia');
  
  // Inicia servidor web de configuração (com fallback automático de porta)
  let port = 3847;
  if (startWebServer) {
    const result = startWebServer(3847, { maxPort: 3852 }) || { port: 3847 };
    port = result.port || 3847;
  }
  console.log(`✓ Interface web em http://localhost:${port}`);
  
  // Inicia system tray (não pode derrubar o app)
  try {
    if (typeof startTray === 'function') {
      await startTray();
      console.log('✓ Ícone na bandeja do sistema');
    } else {
      console.log('⚠ Bandeja do sistema indisponível (módulo não carregou)');
    }
  } catch (e) {
    console.error('Falha ao iniciar bandeja do sistema:', e && e.stack ? e.stack : e.message);
    try {
      notify('Zoopi Print Agent', 'Falha ao iniciar o ícone na bandeja. Abra http://localhost:3847');
    } catch (_) {}
  }
  
  // Se já configurado, inicia agente automaticamente
  if (hasValidConfig && hasValidConfig()) {
    console.log('✓ Configuração válida encontrada, iniciando agente...');
    if (startAgent) {
      const result = await startAgent();
      
      if (result.success) {
        if (updateTrayStatus) updateTrayStatus('running');
        if (notify) notify('Zoopi Print Agent', 'Agente iniciado e monitorando fila de impressão');
      } else {
        if (updateTrayStatus) updateTrayStatus('error');
        if (notify) notify('Zoopi Print Agent', `Erro ao iniciar: ${result.error}`);
      }
    }
  } else {
    if (updateTrayStatus) updateTrayStatus('pending');
    if (notify) notify('Zoopi Print Agent', 'Configure a impressora acessando localhost:3847');
    
    // Abre navegador automaticamente na primeira vez
    const config = getConfig ? getConfig() : {};
    if (!config.supabaseUrl) {
      setTimeout(() => {
        require('child_process').exec('start http://localhost:3847');
      }, 1000);
    }
  }
  
  console.log('');
  console.log('Pressione Ctrl+C para encerrar ou use o menu na bandeja do sistema.');
}

// Cleanup ao encerrar
process.on('SIGINT', () => {
  console.log('\nEncerrando...');
  if (stopAgent) stopAgent();
  cleanupLock();
  process.exit(0);
});

process.on('SIGTERM', () => {
  if (stopAgent) stopAgent();
  cleanupLock();
  process.exit(0);
});

process.on('exit', () => {
  cleanupLock();
});

// Captura erros não tratados
process.on('uncaughtException', (err) => {
  console.error('Erro não tratado:', err && err.stack ? err.stack : err.message);
  if (notify) notify('Zoopi Print Agent', `Erro: ${err.message}`);
});

process.on('unhandledRejection', (reason) => {
  console.error('Promise rejeitada:', reason && reason.stack ? reason.stack : String(reason));
});

// Inicia
main().catch((err) => {
  console.error('Erro fatal:', err);
  if (notify) notify('Zoopi Print Agent', `Erro fatal: ${err.message}`);
  cleanupLock();
  process.exit(1);
});
