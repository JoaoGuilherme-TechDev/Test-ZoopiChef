/**
 * Zoopi Print Agent
 * 
 * Agente local com interface web para configuração.
 * Monitora a fila de impressão no Supabase e imprime em impressoras térmicas.
 * 
 * Uso: node agent.js
 * Acesse http://localhost:3847 para configurar
 */

const { createClient } = require('@supabase/supabase-js');
const net = require('net');
const iconv = require('iconv-lite');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const os = require('os');
const http = require('http');

// Caminho do arquivo de configuração
const CONFIG_PATH = path.join(__dirname, 'agent-config.json');
const PORT = 3847;

// Configuração padrão
const defaultConfig = {
  supabaseUrl: '',
  supabaseKey: '',
  companyId: '',
  printerType: 'network',
  printerHost: '192.168.1.100',
  printerPort: 9100,
  printerName: '',
  pollInterval: 3000,
  encoding: 'cp860',
  beepOnPrint: true,
  cutAfterPrint: true,
  copies: 1,
};

// Estado global
let config = { ...defaultConfig };
let supabase = null;
let isProcessing = false;
let processedJobs = new Set();
let pollIntervalId = null;
let realtimeChannel = null;
let stats = {
  started: null,
  printed: 0,
  failed: 0,
  lastPrint: null,
  isRunning: false,
  lastError: null,
};

// ESC/POS Commands
const ESC = '\x1B';
const GS = '\x1D';
const COMMANDS = {
  INIT: ESC + '@',
  CUT: GS + 'V' + '\x00',
  BEEP: ESC + 'B' + '\x05' + '\x02',
  BOLD_ON: ESC + 'E' + '\x01',
  BOLD_OFF: ESC + 'E' + '\x00',
  DOUBLE_HEIGHT_ON: GS + '!' + '\x10',
  DOUBLE_HEIGHT_OFF: GS + '!' + '\x00',
  DOUBLE_WIDTH_ON: GS + '!' + '\x20',
  DOUBLE_ON: GS + '!' + '\x30',
  NORMAL: GS + '!' + '\x00',
  INVERT_ON: GS + 'B' + '\x01',
  INVERT_OFF: GS + 'B' + '\x00',
  ALIGN_CENTER: ESC + 'a' + '\x01',
  ALIGN_LEFT: ESC + 'a' + '\x00',
  ALIGN_RIGHT: ESC + 'a' + '\x02',
  LINE_FEED: '\n',
};

// ==================== CONFIGURAÇÃO ====================

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const data = fs.readFileSync(CONFIG_PATH, 'utf8');
      config = { ...defaultConfig, ...JSON.parse(data) };
      console.log('✓ Configuração carregada');
      return true;
    }
  } catch (e) {
    console.error('Erro ao carregar configuração:', e.message);
  }
  return false;
}

function saveConfig() {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
    console.log('✓ Configuração salva');
    return true;
  } catch (e) {
    console.error('Erro ao salvar configuração:', e.message);
    return false;
  }
}

// ==================== IMPRESSORAS ====================

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
        .split('\n')
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
  return { success: false, error: `Impressora "${printerName}" não encontrada` };
}

async function printToNetwork(content, options = {}) {
  const { copies = 1, cut = true, beep = true } = options;

  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    socket.setTimeout(10000);

    socket.connect(config.printerPort, config.printerHost, () => {
      try {
        socket.write(COMMANDS.INIT);

        if (beep && config.beepOnPrint) {
          socket.write(COMMANDS.BEEP);
        }

        for (let i = 0; i < copies; i++) {
          const encoded = iconv.encode(content, config.encoding);
          socket.write(encoded);

          if (cut && config.cutAfterPrint) {
            socket.write('\n\n\n\n');
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
  const { copies = 1, cut = true, beep = true } = options;

  return new Promise((resolve, reject) => {
    const tempDir = os.tmpdir();
    const tempFile = path.join(tempDir, `zoopi-print-${Date.now()}.txt`);

    try {
      let printData = COMMANDS.INIT;

      if (beep && config.beepOnPrint) {
        printData += COMMANDS.BEEP;
      }

      for (let i = 0; i < copies; i++) {
        printData += content;

        if (cut && config.cutAfterPrint) {
          printData += '\n\n\n\n';
          printData += COMMANDS.CUT;
        }
      }

      const encoded = iconv.encode(printData, config.encoding);
      fs.writeFileSync(tempFile, encoded);

      const printerPath = `\\\\%COMPUTERNAME%\\${config.printerName}`;
      
      exec(`copy /b "${tempFile}" "${printerPath}"`, { shell: 'cmd.exe' }, (copyError) => {
        if (copyError) {
          // Fallback: PowerShell
          const psCmd = `Out-Printer -Name "${config.printerName}" -InputObject (Get-Content "${tempFile.replace(/\\/g, '\\\\')}" -Raw)`;
          
          exec(`powershell -Command "${psCmd}"`, (psError) => {
            try { fs.unlinkSync(tempFile); } catch (e) {}
            
            if (psError) {
              reject(new Error('Falha ao imprimir via USB'));
            } else {
              resolve({ success: true });
            }
          });
        } else {
          try { fs.unlinkSync(tempFile); } catch (e) {}
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
  if (config.printerType === 'usb') {
    return printToUsb(content, options);
  }
  return printToNetwork(content, options);
}

// ==================== FORMATAÇÃO ====================

// Regras de layout (80mm ~ 42 colunas)
const LINE_WIDTH = 42;
const INDENT = '  ';

function padCenter(text, width = LINE_WIDTH) {
  const clean = String(text ?? '');
  if (clean.length >= width) return clean.slice(0, width);
  const left = Math.floor((width - clean.length) / 2);
  const right = width - clean.length - left;
  return ' '.repeat(left) + clean + ' '.repeat(right);
}

function wrapText(text, width = LINE_WIDTH) {
  const s = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (!s) return [];
  const out = [];
  let i = 0;
  while (i < s.length) {
    let take = Math.min(width, s.length - i);
    const chunk = s.slice(i, i + take);
    if (i + take < s.length) {
      const lastSpace = chunk.lastIndexOf(' ');
      if (lastSpace > 0) take = lastSpace;
    }
    out.push(s.slice(i, i + take).trimEnd());
    i += take;
    while (s[i] === ' ') i++;
  }
  return out;
}

function getOrderDisplayNumber(order) {
  if (order && order.order_number !== null && order.order_number !== undefined) {
    const n = Number(order.order_number);
    if (!Number.isNaN(n)) return String(n).padStart(3, '0');
  }
  return (order?.id || '').slice(0, 3).toUpperCase() || '---';
}

/**
 * Retorna a ORIGEM do pedido (de onde veio)
 * QRCODE / MESA / PEDIDO ONLINE / LIGAÇÃO
 */
function getOrderOriginLabel(order) {
  const orderType = String(order?.order_type || '').toLowerCase();
  const source = String(order?.source || '').toLowerCase();
  
  // QRCode - pedidos do cardápio digital
  if (source === 'qrcode' || source === 'menu') return 'QRCODE';
  
  // Mesa
  if (orderType === 'table' || orderType === 'dine_in') {
    const tableNumber = order?.table_number || order?.table_name || '';
    if (tableNumber) return `MESA ${tableNumber}`;
    return 'MESA';
  }
  
  // Ligação
  if (source === 'phone' || orderType === 'phone') return 'LIGAÇÃO';
  
  // Delivery online
  if (orderType === 'delivery') return 'PEDIDO ONLINE';
  
  // Balcão
  if (orderType === 'counter' || orderType === 'local') return 'BALCÃO';
  
  // Fallback
  return 'PEDIDO';
}

/**
 * Retorna o TIPO DE RECEBIMENTO (como vai ser entregue)
 * DELIVERY / BALCÃO / MESA / RETIRADA
 */
function getFulfillmentTypeLabel(order) {
  const orderType = String(order?.order_type || '').toLowerCase();
  const eatHere = order?.eat_here ?? order?.eat_in ?? null;
  
  if (orderType === 'delivery') return 'DELIVERY';
  if (orderType === 'table' || orderType === 'dine_in') return 'MESA';
  if (orderType === 'local') return 'RETIRADA';
  if (orderType === 'counter' && eatHere === true) return 'COMER AQUI';
  if (orderType === 'counter') return 'BALCÃO';
  
  return 'BALCÃO';
}

function formatOrder(order, items, sectorName) {
  const orderNumber = getOrderDisplayNumber(order);
  const originLabel = getOrderOriginLabel(order);
  const fulfillmentLabel = getFulfillmentTypeLabel(order);
  const orderType = String(order?.order_type || '').toLowerCase();

  let ticket = '';

  ticket += '\n';

  // ========== CABEÇALHO: ZOOPI CHEF ==========
  ticket += COMMANDS.ALIGN_CENTER;
  ticket += COMMANDS.BOLD_ON;
  ticket += COMMANDS.DOUBLE_ON;
  ticket += `${padCenter('ZOOPI CHEF')}\n`;
  ticket += COMMANDS.NORMAL;
  ticket += COMMANDS.BOLD_OFF;

  ticket += COMMANDS.ALIGN_LEFT;
  ticket += '='.repeat(LINE_WIDTH) + '\n';

  // ========== NÚMERO DO PEDIDO (DESTAQUE) ==========
  ticket += COMMANDS.ALIGN_CENTER;
  ticket += COMMANDS.BOLD_ON;
  ticket += COMMANDS.DOUBLE_ON;
  ticket += `PEDIDO #${orderNumber}\n`;
  ticket += COMMANDS.NORMAL;
  ticket += COMMANDS.BOLD_OFF;
  ticket += COMMANDS.ALIGN_LEFT;

  ticket += '-'.repeat(LINE_WIDTH) + '\n';

  // ========== ORIGEM DO PEDIDO (QRCODE/MESA/LIGAÇÃO/ONLINE) ==========
  ticket += COMMANDS.BOLD_ON;
  ticket += COMMANDS.DOUBLE_HEIGHT_ON;
  ticket += `ORIGEM: ${originLabel}\n`;
  ticket += COMMANDS.NORMAL;
  ticket += COMMANDS.BOLD_OFF;

  // ========== TIPO DE RECEBIMENTO ==========
  ticket += COMMANDS.BOLD_ON;
  ticket += `TIPO: ${fulfillmentLabel}\n`;
  ticket += COMMANDS.BOLD_OFF;

  // ========== HORA DO PEDIDO ==========
  const createdAt = order?.created_at ? new Date(order.created_at) : new Date();
  ticket += `HORA: ${createdAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}\n`;

  ticket += '-'.repeat(LINE_WIDTH) + '\n';

  // ========== CLIENTE (SE HOUVER) ==========
  if (order?.customer_name) {
    ticket += COMMANDS.BOLD_ON;
    ticket += COMMANDS.DOUBLE_HEIGHT_ON;
    const customer = String(order.customer_name).toUpperCase();
    wrapText(`CLIENTE: ${customer}`, LINE_WIDTH).forEach((l) => {
      ticket += `${l}\n`;
    });
    ticket += COMMANDS.NORMAL;
    ticket += COMMANDS.BOLD_OFF;
  }

  // ========== TELEFONE (SE HOUVER) ==========
  if (order?.customer_phone || order?.phone) {
    ticket += `TEL: ${order.customer_phone || order.phone}\n`;
  }

  // ========== ENDEREÇO (SE DELIVERY) ==========
  if (orderType === 'delivery') {
    const endereco = order?.delivery_address || order?.address || '';
    const bairro = order?.neighborhood || '';
    if (endereco) {
      wrapText(`END: ${endereco}`, LINE_WIDTH).forEach((l) => {
        ticket += `${l}\n`;
      });
    }
    if (bairro) {
      ticket += `${bairro}\n`;
    }
  }

  // ========== OBSERVAÇÕES DO PEDIDO ==========
  if (order?.notes) {
    ticket += '-'.repeat(LINE_WIDTH) + '\n';
    ticket += COMMANDS.BOLD_ON;
    wrapText(`OBS: ${order.notes}`, LINE_WIDTH).forEach((l) => {
      ticket += `${l}\n`;
    });
    ticket += COMMANDS.BOLD_OFF;
  }

  ticket += '='.repeat(LINE_WIDTH) + '\n';

  ticket += COMMANDS.BOLD_ON;
  ticket += 'ITENS:\n';
  ticket += COMMANDS.BOLD_OFF;

  for (const item of items || []) {
    const qty = `${item.quantity}x`;
    const nameLines = wrapText(String(item.product_name || '').toUpperCase(), LINE_WIDTH - (qty.length + 1));

    ticket += COMMANDS.BOLD_ON;
    ticket += COMMANDS.DOUBLE_HEIGHT_ON;
    if (nameLines.length > 0) {
      ticket += `${qty} ${nameLines[0]}\n`;
      for (let i = 1; i < nameLines.length; i++) {
        ticket += `${' '.repeat(qty.length + 1)}${nameLines[i]}\n`;
      }
    } else {
      ticket += `${qty}\n`;
    }
    ticket += COMMANDS.NORMAL;
    ticket += COMMANDS.BOLD_OFF;

    if (item.selected_options_json) {
      try {
        const options = typeof item.selected_options_json === 'string'
          ? JSON.parse(item.selected_options_json)
          : item.selected_options_json;

        if (Array.isArray(options)) {
          for (const opt of options) {
            if (opt.selectedOptions) {
              for (const sel of opt.selectedOptions) {
                wrapText(`> ${sel.name}`, LINE_WIDTH - INDENT.length).forEach((l) => {
                  ticket += `${INDENT}${l}\n`;
                });
              }
            }
          }
        }
      } catch (e) {}
    }

    // Observação do item - ONLY print if it's a genuine customer note (not auto-generated)
    if (item.notes) {
      const cleanNotes = String(item.notes).trim();
      // Skip auto-generated notes that contain question patterns or [Rodízio] prefix
      const looksAutoGenerated = 
        cleanNotes.includes(' | ') ||
        cleanNotes.startsWith('[') ||
        /\[rodízio\]|\[rodizio\]/i.test(cleanNotes) ||
        /sabor|borda|bebida|escolh/i.test(cleanNotes);
      
      if (!looksAutoGenerated && cleanNotes.length > 0) {
        ticket += COMMANDS.BOLD_ON;
        wrapText(`OBS: ${cleanNotes}`, LINE_WIDTH - INDENT.length).forEach((l) => {
          ticket += `${INDENT}${l}\n`;
        });
        ticket += COMMANDS.BOLD_OFF;
      }
    }

    ticket += '-'.repeat(LINE_WIDTH) + '\n';
  }

  ticket += COMMANDS.ALIGN_CENTER;
  ticket += `Impresso: ${new Date().toLocaleString('pt-BR')}\n`;
  ticket += COMMANDS.ALIGN_LEFT;
  ticket += '\n\n\n';

  return ticket;
}

/**
 * Formata um TICKET COMPLETO (com valores)
 * Formato completo igual ao ticket do caixa com todas as informações
 */
function formatFullOrder(order, items, companyName) {
  const orderNumber = getOrderDisplayNumber(order);
  const originLabel = getOrderOriginLabel(order);
  const fulfillmentLabel = getFulfillmentTypeLabel(order);
  const orderType = String(order?.order_type || '').toLowerCase();
  
  const money = (v) => {
    const n = Number(v);
    if (Number.isNaN(n)) return '';
    const value = Number.isInteger(n) && n > 1000 ? n / 100 : n;
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  let ticket = '';
  ticket += COMMANDS.INIT;
  ticket += '\n';

  // Nome da empresa
  if (companyName) {
    ticket += COMMANDS.ALIGN_CENTER;
    ticket += COMMANDS.BOLD_ON;
    wrapText(String(companyName).toUpperCase(), LINE_WIDTH).forEach((l) => {
      ticket += `${padCenter(l)}\n`;
    });
    ticket += COMMANDS.BOLD_OFF;
    ticket += '\n';
  }

  // Número do pedido destacado
  ticket += COMMANDS.INVERT_ON;
  ticket += COMMANDS.DOUBLE_HEIGHT_ON;
  ticket += `  PEDIDO #${orderNumber}  \n`;
  ticket += COMMANDS.DOUBLE_HEIGHT_OFF;
  ticket += COMMANDS.INVERT_OFF;
  ticket += '\n';

  // ========== ORIGEM DO PEDIDO ==========
  ticket += COMMANDS.BOLD_ON;
  ticket += COMMANDS.DOUBLE_HEIGHT_ON;
  ticket += COMMANDS.ALIGN_CENTER;
  ticket += `ORIGEM: ${originLabel}\n`;
  ticket += COMMANDS.NORMAL;
  ticket += COMMANDS.BOLD_OFF;
  ticket += '\n';

  // ========== TIPO DE RECEBIMENTO ==========
  ticket += COMMANDS.ALIGN_CENTER;
  ticket += `TIPO RECEBIMENTO:\n`;
  ticket += COMMANDS.BOLD_ON;
  ticket += `${fulfillmentLabel}\n`;
  ticket += COMMANDS.BOLD_OFF;

  // Hora do pedido
  const createdAt = order?.created_at ? new Date(order.created_at) : new Date();
  ticket += `HORA PEDIDO: ${createdAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}\n`;

  // Previsão
  const previsao = order?.estimated_time || order?.delivery_time || 'A DEFINIR';
  ticket += `PREVISÃO: ${previsao}\n`;

  ticket += COMMANDS.ALIGN_LEFT;
  ticket += '-'.repeat(LINE_WIDTH) + '\n';

  // Dados do cliente
  if (order?.customer_name) {
    ticket += `CLIENTE: ${String(order.customer_name).toUpperCase()}\n`;
  }

  if (order?.customer_phone || order?.phone) {
    ticket += `TEL: ${order.customer_phone || order.phone}\n`;
  }

  // Endereço para delivery
  if (orderType === 'delivery') {
    const endereco = order?.delivery_address || order?.address || '';
    const bairro = order?.neighborhood || '';
    if (endereco) {
      wrapText(`END: ${endereco}`, LINE_WIDTH).forEach((l) => {
        ticket += `${l}\n`;
      });
    }
    if (bairro) {
      ticket += `${bairro}\n`;
    }
  }

  // Mesa
  if (order?.table_number) {
    ticket += `MESA: ${order.table_number}\n`;
  }

  ticket += '-'.repeat(LINE_WIDTH) + '\n';

  // Itens
  ticket += 'ITENS:\n';
  const safeItems = items || [];
  let computedTotal = 0;

  for (const item of safeItems) {
    const qty = Number(item.quantity || 0);
    const unit = Number(item.unit_price ?? item.unitPrice ?? 0);
    const lineTotal = qty * unit;

    if (!Number.isNaN(lineTotal)) computedTotal += lineTotal;

    const qtyStr = `${qty}x`;
    const name = String(item.product_name || '');
    const left = `${qtyStr} ${name}`;
    const right = money(lineTotal);

    if (left.length + right.length + 1 > LINE_WIDTH) {
      const maxNameLen = LINE_WIDTH - right.length - qtyStr.length - 4;
      const truncName = name.length > maxNameLen ? name.slice(0, maxNameLen) + '...' : name;
      const leftTrunc = `${qtyStr} ${truncName}`;
      const spaceCount = Math.max(1, LINE_WIDTH - leftTrunc.length - right.length);
      ticket += `${leftTrunc}${' '.repeat(spaceCount)}${right}\n`;
    } else {
      const spaceCount = Math.max(1, LINE_WIDTH - left.length - right.length);
      ticket += `${left}${' '.repeat(spaceCount)}${right}\n`;
    }

    // Observação do item - skip auto-generated notes
    if (item.notes) {
      const cleanNotes = String(item.notes).trim();
      const looksAutoGenerated = 
        cleanNotes.includes(' | ') ||
        cleanNotes.startsWith('[') ||
        /\[rodízio\]|\[rodizio\]/i.test(cleanNotes) ||
        /sabor|borda|bebida|escolh/i.test(cleanNotes);
      
      if (!looksAutoGenerated && cleanNotes.length > 0) {
        wrapText(`  OBS: ${cleanNotes}`, LINE_WIDTH).forEach((l) => (ticket += `${l}\n`));
      }
    }
  }

  ticket += '\n';

  // Subtotal
  const orderTotal = order?.total ?? null;
  const totalToPrint = orderTotal !== null && orderTotal !== undefined ? orderTotal : computedTotal;
  
  const subtotalLabel = 'Subtotal:';
  const subtotalValue = money(totalToPrint);
  const subtotalSpace = Math.max(1, LINE_WIDTH - subtotalLabel.length - subtotalValue.length);
  ticket += `${subtotalLabel}${' '.repeat(subtotalSpace)}${subtotalValue}\n`;

  ticket += '\n';

  // Total destacado (invertido)
  ticket += COMMANDS.INVERT_ON;
  ticket += COMMANDS.BOLD_ON;
  const totalLabel = 'TOTAL:';
  const totalValue = money(totalToPrint);
  const totalSpace = Math.max(1, LINE_WIDTH - totalLabel.length - totalValue.length);
  ticket += `${totalLabel}${' '.repeat(totalSpace)}${totalValue}\n`;
  ticket += COMMANDS.BOLD_OFF;
  ticket += COMMANDS.INVERT_OFF;

  ticket += '-'.repeat(LINE_WIDTH) + '\n';

  // Forma de pagamento
  const paymentMethod = order?.payment_method || order?.paymentMethod || '';
  if (paymentMethod) {
    ticket += COMMANDS.ALIGN_CENTER;
    ticket += COMMANDS.BOLD_ON;
    ticket += `Pagamento: ${String(paymentMethod).toUpperCase()}\n`;
    ticket += COMMANDS.BOLD_OFF;
    ticket += COMMANDS.ALIGN_LEFT;
  }

  // Observações gerais
  if (order?.notes) {
    ticket += '-'.repeat(LINE_WIDTH) + '\n';
    wrapText(`OBS: ${order.notes}`, LINE_WIDTH).forEach((l) => {
      ticket += `${l}\n`;
    });
  }

  // Rodapé
  ticket += '\n';
  ticket += COMMANDS.ALIGN_CENTER;
  ticket += `Obrigado pela preferência!\n`;
  ticket += `Impresso: ${new Date().toLocaleString('pt-BR')}\n`;
  ticket += COMMANDS.ALIGN_LEFT;
  ticket += '\n\n\n';

  return ticket;
}

// ==================== PROCESSAMENTO ====================

/**
 * Formata ticket de pré-conta (table_bill)
 */
function formatTableBill(metadata) {
  // 80mm / Font A / 48 colunas
  const LINE_WIDTH = 48;

  // ASCII puro (evita NBSP/acentos que viram bytes inválidos e “explodem” fonte)
  const sanitize = (input) => {
    const str = input == null ? '' : String(input);
    // Remove diacriticos (acentos) via NFD
    const withoutDiacritics = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    // Substitui caracteres especiais comuns que sobrevivem ao NFD
    const replaced = withoutDiacritics
      .replace(/[\u00A0\u2000-\u200B\u202F]/g, ' ')
      .replace(/[–—]/g, '-')
      .replace(/[°º]/g, 'o')
      .replace(/[ª]/g, 'a')
      .replace(/[""]/g, '"')
      .replace(/['']/g, "'");
    // Mantem apenas ASCII printavel (0x20-0x7E) e newlines
    return replaced.replace(/[^\x0A\x0D\x20-\x7E]/g, '');
  };

  // Formata centavos como moeda em ASCII puro (com separador de milhar)
  const money = (cents) => {
    const safe = Number.isFinite(Number(cents)) ? Number(cents) : 0;
    const value = safe / 100;
    const abs = Math.abs(value);
    const fixed = abs.toFixed(2);
    const [intPart, decPart] = fixed.split('.');
    
    // Adicionar separador de milhar (ponto)
    let formatted = '';
    const digits = intPart.split('').reverse();
    for (let i = 0; i < digits.length; i++) {
      if (i > 0 && i % 3 === 0) {
        formatted = '.' + formatted;
      }
      formatted = digits[i] + formatted;
    }
    formatted += ',' + decPart;
    
    if (value < 0) formatted = '-' + formatted;
    
    return 'R$ ' + formatted;
  };

  const formatDateTime = (d) => {
    const dt = d instanceof Date ? d : new Date(d);
    if (Number.isNaN(dt.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(dt.getDate())}/${pad(dt.getMonth() + 1)}/${dt.getFullYear()} ${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
  };

  const lineKeyValue = (left, right, width = LINE_WIDTH) => {
    const l = sanitize(left);
    const r = sanitize(right);
    const available = Math.max(1, width - r.length);
    const leftTrimmed = l.length > available ? l.slice(0, available) : l;
    const padding = Math.max(1, width - leftTrimmed.length - r.length);
    return leftTrimmed + ' '.repeat(padding) + r + '\n';
  };

  const wrapText = (text, width) => {
    const s = sanitize(text).replace(/\s+/g, ' ').trim();
    if (!s) return [];
    const out = [];
    let i = 0;
    while (i < s.length) {
      let take = Math.min(width, s.length - i);
      const chunk = s.slice(i, i + take);
      if (i + take < s.length) {
        const lastSpace = chunk.lastIndexOf(' ');
        if (lastSpace > 0) take = lastSpace;
      }
      out.push(s.slice(i, i + take).trimEnd());
      i += take;
      while (s[i] === ' ') i++;
    }
    return out;
  };

  // Unifica itens iguais por produto + observação (evita repetição e estouro)
  const unifyItems = (items) => {
    const map = new Map();
    for (const it of items || []) {
      const key = `${it.product_name || ''}|||${it.notes || ''}`;
      const existing = map.get(key);
      if (existing) {
        existing.quantity += Number(it.quantity || 0);
        existing.total_price_cents += Number(it.total_price_cents || 0);
      } else {
        map.set(key, {
          ...it,
          quantity: Number(it.quantity || 0),
          total_price_cents: Number(it.total_price_cents || 0),
        });
      }
    }
    return Array.from(map.values());
  };

  let ticket = '';
  ticket += COMMANDS.INIT;
  ticket += COMMANDS.NORMAL;

  // Empresa
  ticket += COMMANDS.ALIGN_CENTER;
  ticket += COMMANDS.BOLD_ON;
  const company = sanitize(metadata.companyName || 'SISTEMA');
  const useBigCompany = company.length <= 24;
  if (useBigCompany) ticket += COMMANDS.DOUBLE_HEIGHT_ON;
  ticket += `${padCenter(company.slice(0, LINE_WIDTH), LINE_WIDTH)}\n`;
  ticket += COMMANDS.NORMAL;
  ticket += COMMANDS.BOLD_OFF;
  ticket += '\n';

  // Mesa
  ticket += COMMANDS.INVERT_ON;
  ticket += COMMANDS.BOLD_ON;
  const mesaLine = `MESA ${sanitize(metadata.tableNumber)}` + (metadata.tableName ? ` - ${sanitize(metadata.tableName)}` : '');
  const useBigMesa = mesaLine.length <= 24;
  if (useBigMesa) ticket += COMMANDS.DOUBLE_HEIGHT_ON;
  ticket += `${padCenter(mesaLine.slice(0, LINE_WIDTH), LINE_WIDTH)}\n`;
  ticket += COMMANDS.NORMAL;
  ticket += COMMANDS.BOLD_OFF;
  ticket += COMMANDS.INVERT_OFF;
  ticket += '\n';

  ticket += COMMANDS.BOLD_ON;
  ticket += '*** PRE-CONTA ***\n';
  ticket += '*** NAO E DOCUMENTO FISCAL ***\n';
  ticket += COMMANDS.BOLD_OFF;
  ticket += '\n';

  ticket += COMMANDS.ALIGN_LEFT;
  ticket += '='.repeat(LINE_WIDTH) + '\n';

  if (metadata.openedAt) {
    const opened = formatDateTime(metadata.openedAt);
    if (opened) ticket += `Abertura: ${opened}\n`;
  }
  ticket += `Impresso: ${formatDateTime(new Date())}\n`;
  ticket += '='.repeat(LINE_WIDTH) + '\n\n';

  // Comandas e itens
  const commands = metadata.commands || [];
  for (const cmd of commands) {
    const cmdTitle = cmd.name ? sanitize(cmd.name) : `Comanda #${sanitize(cmd.number || '')}`.trim();
    ticket += COMMANDS.BOLD_ON;
    wrapText(`>>> ${cmdTitle}`.toUpperCase(), LINE_WIDTH).forEach((l) => (ticket += `${l}\n`));
    ticket += COMMANDS.BOLD_OFF;

    const grouped = unifyItems(cmd.items || []);
    for (const item of grouped) {
      const qtyStr = `${Number(item.quantity || 0)}x`;
      const priceStr = money(item.total_price_cents);
      const nameWidth = Math.max(10, LINE_WIDTH - qtyStr.length - priceStr.length - 2);
      const nameLines = wrapText(String(item.product_name || '').toUpperCase(), nameWidth);

      if (nameLines.length === 0) {
        ticket += `${qtyStr} ${''.padEnd(nameWidth)} ${priceStr}\n`;
      } else {
        ticket += `${qtyStr} ${nameLines[0].padEnd(nameWidth)} ${priceStr}\n`;
        for (let i = 1; i < nameLines.length; i++) {
          ticket += `${' '.repeat(qtyStr.length + 1)}${nameLines[i]}\n`;
        }
      }

      // OBS/observações propositalmente NÃO são impressas no cupom principal (pré-conta)
    }

    ticket += lineKeyValue('SUBTOTAL:', money(cmd.total_cents), LINE_WIDTH);
    ticket += '-'.repeat(LINE_WIDTH) + '\n';
  }

  ticket += '\n';

  // Totais (SEM double-height — evita “fonte gigante” e estouro)
  ticket += COMMANDS.ALIGN_LEFT;
  ticket += COMMANDS.NORMAL;
  ticket += COMMANDS.BOLD_ON;

  ticket += lineKeyValue('SUBTOTAL:', money(metadata.subtotalCents), LINE_WIDTH);
  if (metadata.surchargeCents) ticket += lineKeyValue('ACRESCIMO:', `+${money(metadata.surchargeCents)}`, LINE_WIDTH);
  if (metadata.discountCents) ticket += lineKeyValue('DESCONTO:', `-${money(metadata.discountCents)}`, LINE_WIDTH);
  ticket += lineKeyValue('TOTAL:', money(metadata.totalCents), LINE_WIDTH);

  ticket += COMMANDS.BOLD_OFF;
  ticket += COMMANDS.NORMAL;

  ticket += '\n';
  ticket += COMMANDS.ALIGN_CENTER;
  ticket += 'Confira os valores antes do pagamento\n';
  ticket += 'Obrigado pela preferencia!\n';
  ticket += 'www.zoopi.app.br\n';
  ticket += COMMANDS.ALIGN_LEFT;
  ticket += '\n\n\n';

  // Reset final (evita herdar estilos)
  ticket += COMMANDS.BOLD_OFF;
  ticket += COMMANDS.INVERT_OFF;
  ticket += COMMANDS.NORMAL;

  return ticket;
}

async function processJob(job) {
  if (processedJobs.has(job.id) || isProcessing) {
    return;
  }

  isProcessing = true;
  processedJobs.add(job.id);

  try {
    console.log(`📄 Processando job ${job.id.slice(0, 8)} (tipo: ${job.job_type})...`);

    // ==== PROCESSAR TABLE_BILL (PRÉ-CONTA) ====
    if (job.job_type === 'table_bill') {
      const metadata = job.metadata;
      if (!metadata) {
        throw new Error('Metadata não encontrada para table_bill');
      }
      
      const content = formatTableBill(metadata);
      
      // Usa impressora do metadata se disponível, senão a global
      const printerHost = metadata.printerHost || config.printerHost;
      const printerPort = metadata.printerPort || config.printerPort;
      
      await printContent(content, { 
        copies: config.copies,
        printerHost,
        printerPort,
      });
      
      await markJobComplete(job.id);
      stats.printed++;
      stats.lastPrint = new Date().toISOString();
      stats.lastError = null;
      console.log(`   ✓ Pré-conta mesa ${metadata.tableNumber} impressa!`);
      return;
    }

    // ==== PROCESSAR SOMMELIER_TICKET (DICA DO ENÓLOGO) ====
    if (job.job_type === 'sommelier_ticket') {
      const metadata = job.metadata || {};
      const raw = String(metadata.ticketContent || '').trim();
      if (!raw) {
        throw new Error('ticketContent não encontrado para sommelier_ticket');
      }

      const sanitizeSommelier = (input) => {
        const str = String(input || '')
          // remove emojis comuns do ticket
          .replace(/[\u{1F300}-\u{1FAFF}]/gu, '')
          // substitui caracteres “box drawing” por ASCII
          .replace(/[─━]/g, '-')
          .replace(/[═]/g, '=');

        // remove acentos e deixa ASCII imprimível + quebras de linha
        const noDia = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return noDia.replace(/[^\x0A\x0D\x20-\x7E]/g, '');
      };

      const content = sanitizeSommelier(raw) + '\n\n\n';
      await printContent(content, { copies: config.copies });

      await markJobComplete(job.id);
      stats.printed++;
      stats.lastPrint = new Date().toISOString();
      stats.lastError = null;
      console.log('   ✓ Ticket do enólogo impresso!');
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
        throw new Error(`Pedido não encontrado: ${job.order_id}`);
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
        throw new Error(`Erro ao buscar itens: ${itemsError.message}`);
      }

      const content = formatFullOrder(order, items || [], companyName);
      await printContent(content, { copies: config.copies });

      await markJobComplete(job.id);
      stats.printed++;
      stats.lastPrint = new Date().toISOString();
      stats.lastError = null;
      console.log(`   ✓ Ticket completo impresso!`);
      return;
    }

    // ==== PROCESSAR ORDER (PEDIDO) ====
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', job.order_id)
      .single();

    if (orderError || !order) {
      throw new Error(`Pedido não encontrado: ${job.order_id}`);
    }

    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', job.order_id);

    if (itemsError) {
      throw new Error(`Erro ao buscar itens: ${itemsError.message}`);
    }

    // Buscar configuração da impressora do setor (se houver)
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
        sectorPrintMode = sector.print_mode;
        sectorPrinterName = sector.printer_name;
        sectorPrinterHost = sector.printer_host;
        sectorPrinterPort = sector.printer_port || 9100;
        
        console.log(`   Setor: ${sector.name}, Impressora: ${sectorPrinterName || sectorPrinterHost || 'global'}`);
      }
    }

    // ===== FILTRAGEM DE ITENS USANDO product_ids DO METADATA =====
    // O createPrintJobsForOrder já calculou quais produtos vão para cada setor
    // e salvou em metadata.product_ids. Devemos usar isso diretamente.
    let filteredItems = items || [];
    const metadataProductIds = job.metadata?.product_ids;
    
    if (metadataProductIds && Array.isArray(metadataProductIds) && metadataProductIds.length > 0) {
      // Usa os product_ids pré-calculados (correto!)
      filteredItems = (items || []).filter(item => metadataProductIds.includes(item.product_id));
      console.log(`   Filtrando por metadata.product_ids: ${metadataProductIds.length} produtos -> ${filteredItems.length} itens`);
    } else if (job.print_sector_id) {
      // Fallback: buscar mapeamento diretamente (menos ideal, mas compatível)
      const { data: productMappings } = await supabase
        .from('product_print_sectors')
        .select('product_id')
        .eq('sector_id', job.print_sector_id);
      
      if (productMappings && productMappings.length > 0) {
        const sectorProductIds = productMappings.map(m => m.product_id);
        filteredItems = (items || []).filter(item => sectorProductIds.includes(item.product_id));
        console.log(`   Filtrando por product_print_sectors: ${sectorProductIds.length} produtos -> ${filteredItems.length} itens`);
      }
    }

    if (filteredItems.length === 0) {
      console.log('   Nenhum item para este setor - pulando impressão');
      await markJobComplete(job.id);
      return;
    }

    const content = formatOrder(order, filteredItems, null);
    
    // Usa impressora do setor se configurada
    if (sectorPrinterHost || sectorPrinterName) {
      await printContent(content, { 
        copies: config.copies,
        printerHost: sectorPrinterHost,
        printerPort: sectorPrinterPort,
      });
    } else {
      await printContent(content, { copies: config.copies });
    }

    await markJobComplete(job.id);

    stats.printed++;
    stats.lastPrint = new Date().toISOString();
    stats.lastError = null;
    console.log(`   ✓ Impresso!`);

  } catch (error) {
    console.error(`   ❌ Erro: ${error.message}`);
    await markJobFailed(job.id, error.message);
    stats.failed++;
    stats.lastError = error.message;
  } finally {
    isProcessing = false;
  }
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

async function fetchPendingJobs() {
  const query = supabase
    .from('print_job_queue')
    .select('*')
    .eq('status', 'pending')
    .in('job_type', ['order', 'full_order', 'table_bill', 'sommelier_ticket'])
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
  
  const jobs = await fetchPendingJobs();
  for (const job of jobs) {
    await processJob(job);
  }
}

// ==================== CONTROLE DO AGENTE ====================

function startAgent() {
  if (stats.isRunning) return { success: true, message: 'Já está rodando' };
  
  if (!config.supabaseUrl || !config.supabaseKey) {
    return { success: false, error: 'Configure URL e Key do Supabase' };
  }
  
  if (!config.companyId) {
    return { success: false, error: 'Configure o ID da Empresa' };
  }
  
  try {
    supabase = createClient(config.supabaseUrl, config.supabaseKey);
    
    // Configura realtime
    realtimeChannel = supabase
      .channel('print-agent')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'print_job_queue',
          filter: `company_id=eq.${config.companyId}`,
        },
        (payload) => {
          console.log('🔔 Novo job via realtime');
          processJob(payload.new);
        }
      )
      .subscribe();
    
    // Inicia polling
    pollIntervalId = setInterval(pollLoop, config.pollInterval);
    
    stats.isRunning = true;
    stats.started = new Date().toISOString();
    stats.lastError = null;
    
    // Primeiro poll imediato
    pollLoop();
    
    console.log('✓ Agente iniciado');
    return { success: true };
    
  } catch (e) {
    stats.lastError = e.message;
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

// ==================== INTERFACE WEB ====================

const HTML_PAGE = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Zoopi Print Agent</title>
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
    h1 { 
      text-align: center; 
      margin-bottom: 30px;
      font-size: 24px;
    }
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
    <button class="btn-danger" onclick="stopAgent()">⏹️ Parar Agente</button>
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
    
    async function stopAgent() {
      try {
        await fetch('/api/stop', { method: 'POST' });
        showToast('⏹️ Agente parado', 'success');
        setTimeout(loadStatus, 500);
      } catch (e) {
        console.error(e);
      }
    }
    
    // Init
    loadConfig();
    loadStatus();
    setInterval(loadStatus, 3000);
  </script>
</body>
</html>`;

// Servidor HTTP
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // Página principal
  if (url.pathname === '/' || url.pathname === '/config') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(HTML_PAGE);
    return;
  }
  
  // API: Config
  if (url.pathname === '/api/config' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(config));
    return;
  }
  
  // API: Status
  if (url.pathname === '/api/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(stats));
    return;
  }
  
  // API: Printers
  if (url.pathname === '/api/printers') {
    const printers = await listWindowsPrinters();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ printers }));
    return;
  }
  
  // API: Test printer
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
  
  // API: Save and start
  if (url.pathname === '/api/save-and-start' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const newConfig = JSON.parse(body);
        config = { ...config, ...newConfig };
        saveConfig();
        
        stopAgent();
        const result = startAgent();
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: e.message }));
      }
    });
    return;
  }
  
  // API: Stop
  if (url.pathname === '/api/stop' && req.method === 'POST') {
    stopAgent();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
    return;
  }
  
  // 404
  res.writeHead(404);
  res.end('Not Found');
});

// ==================== INICIALIZAÇÃO ====================

loadConfig();

server.listen(PORT, () => {
  console.log('');
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║         🖨️  ZOOPI PRINT AGENT                  ║');
  console.log('╠════════════════════════════════════════════════╣');
  console.log(`║  Acesse: http://localhost:${PORT}                 ║`);
  console.log('║  Para configurar a impressora                  ║');
  console.log('╚════════════════════════════════════════════════╝');
  console.log('');
  
  // Abrir navegador
  const cmd = os.platform() === 'win32' ? 'start' : 
              os.platform() === 'darwin' ? 'open' : 'xdg-open';
  exec(`${cmd} http://localhost:${PORT}`);
  
  // Auto-iniciar se já configurado
  if (config.supabaseUrl && config.supabaseKey && config.companyId) {
    console.log('Configuração encontrada, iniciando automaticamente...');
    startAgent();
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Encerrando...');
  stopAgent();
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  console.error('Erro:', error.message);
});
