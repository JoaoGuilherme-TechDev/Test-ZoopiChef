/**
 * Zoopi Print Agent v3.0 - Electron Main
 * 
 * Agente de Impressão com Renderização Bitmap
 * - Renderiza HTML templates em BrowserWindow oculta
 * - Captura como imagem e converte para ESC/POS GS v 0
 * - Envia bitmap direto para impressora (bypassa driver ESC/POS)
 */

const { app, BrowserWindow, Tray, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const Store = require('electron-store');
const { JobProcessor } = require('./job-processor');

// Persistent configuration
const store = new Store({
  defaults: {
    supabaseUrl: '',
    supabaseKey: '',
    companyId: '',
    printerName: '',
    serverPort: 9898,
    paperWidth: 80,
    autoStart: true,
    minimizeToTray: true
  }
});

let mainWindow = null;
let tray = null;
let jobProcessor = null;

// Prevent multiple instances
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
  try {
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
            label: `Impressora: ${store.get('printerName') || 'Não configurada'}`,
            enabled: false
          },
          {
            label: jobProcessor ? '🟢 Ativo' : '🔴 Inativo',
            enabled: false
          }
        ]
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

    tray.setToolTip('Zoopi Print Agent v3');
    tray.setContextMenu(contextMenu);

    tray.on('double-click', () => {
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
      }
    });
  } catch (e) {
    console.error('[Tray] Error creating tray:', e.message);
  }
}

async function initializeJobProcessor() {
  const supabaseUrl = store.get('supabaseUrl');
  const supabaseKey = store.get('supabaseKey');
  const companyId = store.get('companyId');
  const printerName = store.get('printerName');

  if (!supabaseUrl || !supabaseKey || !companyId) {
    console.log('[Agent] Configuração incompleta. Aguardando...');
    return;
  }

  console.log('========================================');
  console.log('  ZOOPI PRINT AGENT v3.0.0 (BITMAP)');
  console.log('========================================');
  console.log(`Company: ${companyId}`);
  console.log(`Impressora: ${printerName || 'Não configurada'}`);
  console.log('----------------------------------------\n');

  try {
    jobProcessor = new JobProcessor({
      supabaseUrl,
      supabaseKey,
      companyId,
      printerName
    });

    await jobProcessor.init();
    jobProcessor.start();

    console.log('🚀 Agente iniciado! Monitorando fila...\n');
  } catch (e) {
    console.error('[Agent] Init error:', e.message);
  }
}

// IPC Handlers
ipcMain.handle('get-config', () => store.store);

ipcMain.handle('save-config', async (_, config) => {
  Object.entries(config).forEach(([key, value]) => {
    store.set(key, value);
  });

  // Restart job processor with new config
  if (jobProcessor) {
    jobProcessor.stop();
    jobProcessor = null;
  }
  await initializeJobProcessor();

  return true;
});

ipcMain.handle('get-system-printers', async () => {
  const { USBPrinter } = require('./printer-usb');
  const usbPrinter = new USBPrinter();
  const printers = await usbPrinter.listPrinters();
  return printers.map(p => p.name);
});

ipcMain.handle('test-printer', async (_, printerName) => {
  const { BitmapRenderer } = require('./bitmap-renderer');
  const { USBPrinter } = require('./printer-usb');

  try {
    const renderer = new BitmapRenderer();
    await renderer.init();

    const testData = {
      companyName: 'ZOOPI - TESTE DE IMPRESSAO',
      orderNumber: '000',
      origin: '*** TESTE BITMAP ***',
      datetime: new Date().toLocaleString('pt-BR'),
      items: [
        { quantity: 1, name: 'Item de Teste', notes: 'Observacao de teste' },
        { quantity: 2, name: 'Outro Item' }
      ],
      showPrices: true,
      total: 99.99,
      footer: 'Impressao bitmap OK!'
    };

    const paperWidth = store.get('paperWidth') || 80;
    const html = renderer.generateTicketHtml(testData, paperWidth);
    const buffer = await renderer.renderToBitmap(html, paperWidth);
    
    renderer.destroy();

    const usbPrinter = new USBPrinter();
    await usbPrinter.printRaw(printerName, buffer);

    return { success: true, message: 'Teste de impressão bitmap enviado!' };
  } catch (e) {
    return { success: false, message: e.message };
  }
});

ipcMain.handle('get-connection-status', () => {
  return {
    active: !!jobProcessor,
    printerName: store.get('printerName'),
    companyId: store.get('companyId')
  };
});

// App lifecycle
app.whenReady().then(async () => {
  createWindow();
  createTray();
  await initializeJobProcessor();
});

app.on('window-all-closed', () => {
  // Don't quit on window close (stay in tray)
});

app.on('before-quit', () => {
  if (jobProcessor) {
    jobProcessor.stop();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
