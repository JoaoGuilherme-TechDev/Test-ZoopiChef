/**
 * Zoopi Print Agent v3.0
 * 
 * Agente de Impressão Local baseado em Electron
 * - Roda em segundo plano (system tray)
 * - Servidor HTTP local para receber jobs
 * - Conexão com Supabase Realtime para fila
 * - Suporte a impressoras USB e Rede (ESC/POS)
 */

const { app, BrowserWindow, Tray, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const Store = require('electron-store');
const { createServer } = require('./server');
const { PrinterManager } = require('./printer-manager');
const { SupabaseClient } = require('./supabase-client');

// Configurações persistentes
const store = new Store({
  defaults: {
    supabaseUrl: '',
    supabaseKey: '',
    companyId: '',
    printers: [],
    serverPort: 9898,
    autoStart: true,
    minimizeToTray: true
  }
});

let mainWindow = null;
let tray = null;
let server = null;
let printerManager = null;
let supabaseClient = null;

// Previne múltiplas instâncias
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    minWidth: 600,
    minHeight: 400,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
    show: false
  });

  mainWindow.loadFile('renderer/index.html');

  mainWindow.on('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('close', (event) => {
    if (store.get('minimizeToTray')) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

function createTray() {
  const iconPath = path.join(__dirname, 'assets', 'tray-icon.png');
  tray = new Tray(iconPath);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Abrir Painel',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    {
      label: 'Status',
      submenu: [
        {
          label: `Servidor: Porta ${store.get('serverPort')}`,
          enabled: false
        },
        {
          label: supabaseClient?.isConnected ? '🟢 Conectado' : '🔴 Desconectado',
          enabled: false
        }
      ]
    },
    { type: 'separator' },
    {
      label: 'Testar Impressão',
      click: async () => {
        const printers = store.get('printers');
        if (printers.length > 0) {
          await printerManager.testPrint(printers[0]);
        } else {
          dialog.showMessageBox({
            type: 'warning',
            title: 'Nenhuma Impressora',
            message: 'Configure pelo menos uma impressora primeiro.'
          });
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Sair',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip('Zoopi Print Agent');
  tray.setContextMenu(contextMenu);

  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

async function initializeServices() {
  // Inicializa gerenciador de impressoras
  printerManager = new PrinterManager();

  // Inicia servidor HTTP local
  const port = store.get('serverPort');
  server = createServer(port, printerManager, store);

  // Conecta ao Supabase se configurado
  const supabaseUrl = store.get('supabaseUrl');
  const supabaseKey = store.get('supabaseKey');
  const companyId = store.get('companyId');

  if (supabaseUrl && supabaseKey && companyId) {
    supabaseClient = new SupabaseClient(supabaseUrl, supabaseKey, companyId, printerManager, store);
    await supabaseClient.connect();
  }

  console.log(`[Agent] Servidor iniciado na porta ${port}`);
}

// IPC Handlers para comunicação com o renderer
ipcMain.handle('get-config', () => store.store);

ipcMain.handle('save-config', (_, config) => {
  Object.entries(config).forEach(([key, value]) => {
    store.set(key, value);
  });
  return true;
});

ipcMain.handle('get-system-printers', async () => {
  return printerManager.getSystemPrinters();
});

ipcMain.handle('test-printer', async (_, printerConfig) => {
  return printerManager.testPrint(printerConfig);
});

ipcMain.handle('reconnect-supabase', async () => {
  const supabaseUrl = store.get('supabaseUrl');
  const supabaseKey = store.get('supabaseKey');
  const companyId = store.get('companyId');

  if (supabaseClient) {
    await supabaseClient.disconnect();
  }

  if (supabaseUrl && supabaseKey && companyId) {
    supabaseClient = new SupabaseClient(supabaseUrl, supabaseKey, companyId, printerManager, store);
    return supabaseClient.connect();
  }
  return false;
});

ipcMain.handle('get-connection-status', () => {
  return {
    server: !!server,
    supabase: supabaseClient?.isConnected || false,
    port: store.get('serverPort')
  };
});

app.whenReady().then(async () => {
  createWindow();
  createTray();
  await initializeServices();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Não fecha o app, apenas esconde
  }
});

app.on('before-quit', () => {
  if (server) {
    server.close();
  }
  if (supabaseClient) {
    supabaseClient.disconnect();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
