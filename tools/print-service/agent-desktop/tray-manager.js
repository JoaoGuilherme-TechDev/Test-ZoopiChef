/**
 * Gerenciamento do Ícone na Bandeja do Sistema (System Tray)
 * 
 * IMPORTANTE: Usa @pnlpal/systray2 (não 'systray')
 */

let SysTray = null;
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

// Imports lazy para evitar dependência circular
let agentCore = null;
let startupManager = null;
let notificationManager = null;
let configManager = null;

function getAgentCore() {
  if (!agentCore) agentCore = require('./agent-core');
  return agentCore;
}

function getStartupManager() {
  if (!startupManager) startupManager = require('./startup-manager');
  return startupManager;
}

function getNotificationManager() {
  if (!notificationManager) notificationManager = require('./notification-manager');
  return notificationManager;
}

function getConfigManager() {
  if (!configManager) configManager = require('./config-manager');
  return configManager;
}

// Ícones em Base64 (serão carregados dos arquivos)
let ICON_GREEN, ICON_YELLOW, ICON_RED;

// Estado atual
let currentStatus = 'stopped'; // 'running', 'pending', 'error', 'stopped'
let systray = null;
let startupChecked = false;

/**
 * Carrega ícones dos arquivos
 */
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

/**
 * Ícone padrão simples (16x16 PNG verde)
 */
function getDefaultIcon() {
  // PNG mínimo 16x16 verde
  return 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAH0lEQVQ4y2Ng+M8w/T8DAwMjI8N/BgYGBkYGBoZ/DACIA/cBEjVFAAAAAElFTkSuQmCC';
}

/**
 * Obtém o ícone baseado no status
 */
function getIconForStatus(status) {
  switch (status) {
    case 'running': return ICON_GREEN;
    case 'pending': return ICON_YELLOW;
    case 'error': return ICON_RED;
    default: return ICON_RED;
  }
}

/**
 * Obtém o tooltip baseado no status
 */
function getTooltipForStatus(status) {
  const stats = getAgentCore().getStats();
  switch (status) {
    case 'running': 
      return `Zoopi Print - Monitorando (${stats.printed} impressos)`;
    case 'pending': 
      return 'Zoopi Print - Configuração pendente';
    case 'error': 
      return `Zoopi Print - Erro: ${stats.lastError || 'Desconhecido'}`;
    default: 
      return 'Zoopi Print - Parado';
  }
}

/**
 * Cria os itens do menu
 */
async function createMenuItems() {
  const stats = getAgentCore().getStats();
  const isRunning = stats.isRunning;
  const startupEnabled = await getStartupManager().isStartupEnabled();
  startupChecked = startupEnabled;
  
  return [
    {
      title: isRunning ? '⏹️ Parar Agente' : '▶️ Iniciar Agente',
      tooltip: isRunning ? 'Para o monitoramento' : 'Inicia o monitoramento',
      enabled: getConfigManager().hasValidConfig(),
    },
    { title: '', enabled: false }, // Separador
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
      enabled: getConfigManager().hasValidConfig(),
    },
    { title: '', enabled: false }, // Separador
    {
      title: startupEnabled ? '✓ Iniciar com Windows' : '○ Iniciar com Windows',
      tooltip: 'Inicia automaticamente quando o Windows ligar',
      enabled: true,
    },
    { title: '', enabled: false }, // Separador
    {
      title: '❌ Sair',
      tooltip: 'Fecha o agente de impressão',
      enabled: true,
    },
  ];
}

/**
 * Inicia o system tray
 */
async function startTray() {
  // Carrega o módulo nativo só quando necessário
  if (!SysTray) {
    try {
      // IMPORTANTE: O pacote correto é @pnlpal/systray2
      const systrayModule = require('@pnlpal/systray2');
      SysTray = systrayModule.default || systrayModule.SysTray || systrayModule;
    } catch (e) {
      console.error('Falha ao carregar @pnlpal/systray2:', e && e.stack ? e.stack : e.message);
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
    getNotificationManager().notify('Zoopi Print Agent', 'Falha ao iniciar o ícone na bandeja.');
    throw e;
  }

  // Handler de cliques no menu
  systray.onClick(async (action) => {
    const idx = action.seq_id;
    
    switch (idx) {
      case 0: // Toggle Agente
        await handleToggleAgent();
        break;
      case 2: // Configurações
        exec('start http://localhost:3847');
        break;
      case 3: // Estatísticas
        showStatsNotification();
        break;
      case 4: // Imprimir Teste
        await handlePrintTest();
        break;
      case 6: // Startup Toggle
        await handleToggleStartup();
        break;
      case 8: // Sair
        handleExit();
        break;
    }
  });
  
  return systray;
}

/**
 * Atualiza o status do tray
 */
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

/**
 * Handler: Toggle Agente
 */
async function handleToggleAgent() {
  const { getStats, startAgent, stopAgent } = getAgentCore();
  const { notify } = getNotificationManager();
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
      notify('Zoopi Print Agent', `Erro: ${result.error}`);
    }
  }
}

/**
 * Handler: Imprimir Teste
 */
async function handlePrintTest() {
  const { notify } = getNotificationManager();
  const { printTest } = getAgentCore();
  
  notify('Zoopi Print Agent', 'Enviando página de teste...');
  
  const result = await printTest();
  
  if (result.success) {
    notify('Zoopi Print Agent', 'Página de teste impressa com sucesso!');
  } else {
    notify('Zoopi Print Agent', `Erro ao imprimir teste: ${result.error}`);
  }
}

/**
 * Handler: Toggle Startup
 */
async function handleToggleStartup() {
  const { notify } = getNotificationManager();
  const { toggleStartup } = getStartupManager();
  
  try {
    const enabled = await toggleStartup();
    startupChecked = enabled;
    
    // Atualiza menu
    await updateTrayStatus(currentStatus);
    
    notify('Zoopi Print Agent', 
      enabled 
        ? 'Agente irá iniciar automaticamente com Windows' 
        : 'Inicialização automática desabilitada'
    );
  } catch (e) {
    notify('Zoopi Print Agent', `Erro ao configurar startup: ${e.message}`);
  }
}

/**
 * Mostra notificação com estatísticas
 */
function showStatsNotification() {
  const { getStats } = getAgentCore();
  const { notify } = getNotificationManager();
  const stats = getStats();
  const uptime = stats.started 
    ? Math.floor((Date.now() - new Date(stats.started).getTime()) / 60000)
    : 0;
  
  notify('Estatísticas de Impressão', 
    `Impressos: ${stats.printed}\n` +
    `Falhas: ${stats.failed}\n` +
    `Status: ${stats.isRunning ? 'Ativo' : 'Parado'}\n` +
    `Uptime: ${uptime} min`
  );
}

/**
 * Handler: Sair
 */
function handleExit() {
  const { stopAgent } = getAgentCore();
  stopAgent();
  if (systray) {
    systray.kill(false);
  }
  process.exit(0);
}

module.exports = {
  startTray,
  updateTrayStatus,
};
