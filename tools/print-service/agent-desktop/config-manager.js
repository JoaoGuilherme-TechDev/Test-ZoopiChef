/**
 * Gerenciamento de Configuração
 * Salva em %APPDATA%/Zoopi/agent-config.json
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// Diretório de dados do app
const APP_DIR = path.join(os.homedir(), 'AppData', 'Roaming', 'Zoopi');
const CONFIG_PATH = path.join(APP_DIR, 'agent-config.json');

// Configuração padrão
const defaultConfig = {
  supabaseUrl: '',
  supabaseKey: '',
  companyId: '',

  // Autenticação (necessária quando a fila está protegida)
  // Use um usuário do sistema que tenha acesso à empresa.
  agentEmail: '',
  agentPassword: '',

  printerType: 'network',
  printerHost: '192.168.1.100',
  printerPort: 9100,
  printerName: '',
  pollInterval: 3000,
  encoding: 'cp860',
  beepOnPrint: true,
  cutAfterPrint: true,
  copies: 1,
  autoStart: true,
};

let config = { ...defaultConfig };

/**
 * Garante que o diretório do app existe
 */
function ensureAppDir() {
  if (!fs.existsSync(APP_DIR)) {
    fs.mkdirSync(APP_DIR, { recursive: true });
  }
}

/**
 * Carrega configuração do disco
 */
function loadConfig() {
  try {
    ensureAppDir();
    
    if (fs.existsSync(CONFIG_PATH)) {
      const data = fs.readFileSync(CONFIG_PATH, 'utf8');
      config = { ...defaultConfig, ...JSON.parse(data) };
      return true;
    }
  } catch (e) {
    console.error('Erro ao carregar configuração:', e.message);
  }
  return false;
}

/**
 * Salva configuração no disco
 */
function saveConfig(newConfig = null) {
  try {
    ensureAppDir();
    
    if (newConfig) {
      config = { ...defaultConfig, ...newConfig };
    }
    
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('Erro ao salvar configuração:', e.message);
    return false;
  }
}

/**
 * Retorna a configuração atual
 */
function getConfig() {
  return { ...config };
}

/**
 * Atualiza configuração parcialmente
 */
function updateConfig(updates) {
  config = { ...config, ...updates };
  return saveConfig();
}

/**
 * Verifica se a configuração é válida para iniciar o agente
 */
function hasValidConfig() {
  return !!(config.supabaseUrl && config.supabaseKey && config.companyId);
}

/**
 * Retorna o caminho do diretório do app
 */
function getAppDir() {
  ensureAppDir();
  return APP_DIR;
}

module.exports = {
  loadConfig,
  saveConfig,
  getConfig,
  updateConfig,
  hasValidConfig,
  getAppDir,
  CONFIG_PATH,
};
