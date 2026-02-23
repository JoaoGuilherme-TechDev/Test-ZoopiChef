/**
 * Zoopi Print Agent - Download Utility
 * 
 * Gera arquivos para download do agente de impressão
 */

// Código do agente
const AGENT_CODE = `/**
 * Zoopi Print Agent v1.0
 * 
 * Agente local com interface web para configuração.
 * Acesse http://localhost:3848 para configurar.
 */

const { createClient } = require('@supabase/supabase-js');
const net = require('net');
const iconv = require('iconv-lite');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const os = require('os');
const http = require('http');

const CONFIG_PATH = path.join(__dirname, 'agent-config.json');
const PORT = 3848;

const defaultConfig = {
  supabaseUrl: '',
  supabaseKey: '',
  companyId: '',
  // Protocolo / linguagem: ESC/POS (básico) vs ESC/P2 (Epson avançado)
  protocol: 'escp2',
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

const ESC = '\\x1B';
const GS = '\\x1D';
const LF = '\\n';

// =========================
// ESC/P2 COMMANDS - Suporte avançado Epson
// Inclui codepage para acentos, fontes e formatação
// =========================
const ESCP2 = {
  // Initialization
  INIT: ESC + '@',
  
  // Codepage selection (ESC t n) - ESSENCIAL para acentos
  CODEPAGE_PC860: ESC + 't' + '\\x03',  // Português (ç, ã, é, etc.)
  CODEPAGE_PC858: ESC + 't' + '\\x13',  // Multilingual Latin I + Euro
  CODEPAGE_PC850: ESC + 't' + '\\x02',  // Multilingual Latin I
  
  // Character set (ESC R n)
  CHARSET_BRAZIL: ESC + 'R' + '\\x08',  // Brazil character set
  
  // Text formatting
  BOLD_ON:  ESC + 'E' + '\\x01',
  BOLD_OFF: ESC + 'E' + '\\x00',
  UNDERLINE_ON:  ESC + '-' + '\\x01',
  UNDERLINE_OFF: ESC + '-' + '\\x00',
  DOUBLESTRIKE_ON:  ESC + 'G' + '\\x01',
  DOUBLESTRIKE_OFF: ESC + 'G' + '\\x00',
  
  // Reverse/Invert (GS B n)
  INVERT_ON:  GS + 'B' + '\\x01',
  INVERT_OFF: GS + 'B' + '\\x00',
  
  // Character size (GS ! n)
  SIZE_NORMAL:        GS + '!' + '\\x00',
  SIZE_DOUBLE_HEIGHT: GS + '!' + '\\x01',
  SIZE_DOUBLE_WIDTH:  GS + '!' + '\\x10',
  SIZE_DOUBLE_BOTH:   GS + '!' + '\\x11',
  
  // Font selection (ESC M n)
  FONT_A: ESC + 'M' + '\\x00',  // 12x24 (48 cols on 80mm)
  FONT_B: ESC + 'M' + '\\x01',  // 9x17 (64 cols on 80mm)
  
  // Alignment (ESC a n)
  ALIGN_LEFT:   ESC + 'a' + '\\x00',
  ALIGN_CENTER: ESC + 'a' + '\\x01',
  ALIGN_RIGHT:  ESC + 'a' + '\\x02',
  
  // Paper control
  CUT:         GS + 'V' + '\\x00',
  PARTIAL_CUT: GS + 'V' + '\\x01',
  
  // Audio
  BEEP: ESC + 'B' + '\\x05' + '\\x02',
  
  // Barcode
  BARCODE_HEIGHT:    (n) => GS + 'h' + String.fromCharCode(n),
  BARCODE_WIDTH:     (n) => GS + 'w' + String.fromCharCode(n),
  BARCODE_HRI_BELOW: GS + 'H' + '\\x02',
  BARCODE_CODE128:   GS + 'k' + '\\x49',
};

// Aliases for backward compatibility
const COMMANDS = {
  INIT: ESCP2.INIT,
  CUT: ESCP2.CUT,
  BEEP: ESCP2.BEEP,
  BOLD_ON: ESCP2.BOLD_ON,
  BOLD_OFF: ESCP2.BOLD_OFF,
  DOUBLE_HEIGHT_ON: ESCP2.SIZE_DOUBLE_HEIGHT,
  DOUBLE_ON: ESCP2.SIZE_DOUBLE_BOTH,
  NORMAL: ESCP2.SIZE_NORMAL,
  ALIGN_CENTER: ESCP2.ALIGN_CENTER,
  ALIGN_LEFT: ESCP2.ALIGN_LEFT,
  INVERT_ON: ESCP2.INVERT_ON,
  INVERT_OFF: ESCP2.INVERT_OFF,
};

// =========================
// CP860 CHARACTER MAP (Portuguese)
// Mapeia caracteres Unicode para bytes CP860
// =========================
const CP860_MAP = {
  'Ç': 0x80, 'ü': 0x81, 'é': 0x82, 'â': 0x83, 'ã': 0x84, 'à': 0x85,
  'Á': 0x86, 'ç': 0x87, 'ê': 0x88, 'Ê': 0x89, 'è': 0x8A, 'Í': 0x8B,
  'Ô': 0x8C, 'ì': 0x8D, 'Ã': 0x8E, 'Â': 0x8F, 'É': 0x90, 'À': 0x91,
  'È': 0x92, 'ô': 0x93, 'õ': 0x94, 'ò': 0x95, 'Ú': 0x96, 'ù': 0x97,
  'Ì': 0x98, 'Õ': 0x99, 'Ü': 0x9A, '¢': 0x9B, '£': 0x9C, 'Ù': 0x9D,
  'Ó': 0x9F, 'á': 0xA0, 'í': 0xA1, 'ó': 0xA2, 'ú': 0xA3,
  'ñ': 0xA4, 'Ñ': 0xA5, 'ª': 0xA6, 'º': 0xA7, '¿': 0xA8, 'Ò': 0xA9,
  '¬': 0xAA, '½': 0xAB, '¼': 0xAC, '¡': 0xAD, '«': 0xAE, '»': 0xAF,
};

/**
 * Convert Unicode string to CP860 bytes (Portuguese codepage)
 * Preserves accented characters: ç, ã, é, á, í, ó, ú, ô, ê, etc.
 */
function toCP860(s) {
  const bytes = [];
  for (const char of String(s)) {
    const code = char.charCodeAt(0);
    if (code < 0x80) {
      bytes.push(code);
    } else if (CP860_MAP[char] !== undefined) {
      bytes.push(CP860_MAP[char]);
    } else {
      // Fallback: normalize to ASCII
      const norm = char.normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');
      const fb = norm.charCodeAt(0);
      bytes.push(fb < 0x80 ? fb : 0x3F); // '?'
    }
  }
  return Buffer.from(bytes);
}

/**
 * Kill NBSP and zero-width characters
 */
function killNbsp(s) {
  return String(s ?? '')
    .replace(/\\u00A0/g, ' ')
    .replace(/[\\u200B-\\u200F\\uFEFF]/g, '');
}

/**
 * Format money in BRL - manual, no toLocaleString
 */
function moneyBR(cents) {
  const n = Math.round(Number(cents || 0));
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  const intPart = Math.floor(abs / 100);
  const decPart = String(abs % 100).padStart(2, '0');
  const intStr = String(intPart).replace(/\\B(?=(\\d{3})+(?!\\d))/g, '.');
  return sign + 'R$ ' + intStr + ',' + decPart;
}

// Alias for compatibility
function moneyBRFromCents(cents) { return moneyBR(cents); }

/**
 * Format line with left and right parts, right-aligned
 */
function formatLine(left, right, width = 48) {
  const l0 = killNbsp(String(left ?? '')).replace(/[\\r\\n]+/g, ' ');
  const r = killNbsp(String(right ?? '')).replace(/[\\r\\n]+/g, ' ');
  const lMax = Math.max(0, width - r.length - 1);
  const l = l0.length > lMax ? l0.slice(0, lMax) : l0;
  const space = Math.max(1, width - l.length - r.length);
  return l + ' '.repeat(space) + r;
}

/**
 * Truncate text to max length
 */
function truncateAscii(text, maxLen) {
  const s = killNbsp(String(text ?? '')).replace(/[\\r\\n]+/g, ' ');
  return s.length > maxLen ? s.slice(0, maxLen - 1) + '.' : s;
}

/**
 * Check if text is a "question" label that should be filtered from tickets
 * (e.g. "Escolha o sabor", "Selecione a borda")
 */
function isPizzaQuestionLabel(text) {
  const lower = killNbsp(String(text ?? '')).toLowerCase();
  return (
    lower.includes('escolha') ||
    lower.includes('selecione') ||
    lower.includes('qual') ||
    lower.includes('?')
  );
}

/**
 * ESC/P2 full initialization with Portuguese codepage
 * This is the KEY to supporting accents!
 */
function escp2Init() {
  return (
    ESCP2.INIT +                  // Reset printer
    ESCP2.CODEPAGE_PC860 +        // Portuguese codepage (acentos)
    ESCP2.CHARSET_BRAZIL +        // Brazil character set
    ESCP2.FONT_A +                // Font A (48 cols)
    ESCP2.SIZE_NORMAL +           // Normal size
    ESCP2.BOLD_OFF +              // No bold
    ESCP2.UNDERLINE_OFF +         // No underline
    ESCP2.INVERT_OFF +            // No invert
    ESCP2.ALIGN_LEFT              // Left align
  );
}

/**
 * Reset styles only (no full init)
 */
function escp2ResetStyle() {
  return (
    ESCP2.SIZE_NORMAL +
    ESCP2.BOLD_OFF +
    ESCP2.UNDERLINE_OFF +
    ESCP2.INVERT_OFF +
    ESCP2.ALIGN_LEFT
  );
}

/**
 * ESC/POS reset básico (1-byte codepage) conforme requisito:
 * ESC @, ESC ! 0, GS ! 0, ESC E 0, ESC a 0
 */
function escposInitBasic() {
  return (
    ESC + '@' +
    ESC + '!' + '\\x00' +
    GS + '!' + '\\x00' +
    ESC + 'E' + '\\x00' +
    ESC + 'a' + '\\x00'
  );
}

function getTicketInit() {
  return String(config.protocol || 'escp2').toLowerCase() === 'escpos'
    ? escposInitBasic()
    : escp2Init();
}

function getTicketResetStyle() {
  return String(config.protocol || 'escp2').toLowerCase() === 'escpos'
    ? escposInitBasic()
    : escp2ResetStyle();
}

// Legacy alias
function escposReset() { return escp2Init(); }

/**
 * Format date/time in BR format
 */
function formatDateTimeBR(d) {
  const dt = new Date(d);
  const dd = String(dt.getDate()).padStart(2, '0');
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const yyyy = String(dt.getFullYear());
  const hh = String(dt.getHours()).padStart(2, '0');
  const mi = String(dt.getMinutes()).padStart(2, '0');
  return dd + '/' + mm + '/' + yyyy + ' ' + hh + ':' + mi;
}

/**
 * Convert string to bytes using configured encoding
 * CP860 for accents, falls back to iconv
 */
function toBytes(s, encoding) {
  const enc = encoding || config.encoding || 'cp860';
  const clean = killNbsp(String(s ?? ''));
  
  // For CP860, use manual map to guarantee accents
  if (enc.toLowerCase() === 'cp860') {
    return toCP860(clean);
  }
  
  // Otherwise use iconv
  try {
    return iconv.encode(clean, enc);
  } catch (e) {
    console.warn('[escpos] iconv failed, using CP860:', e.message);
    return toCP860(clean);
  }
}

/**
 * Fix UTF-8 NBSP sequence (C2 A0) that breaks on 1-byte codepages.
 * Replaces any occurrence of C2 A0 with a single ASCII space (0x20).
 */
function fixUtf8NbspBytes(buf) {
  const out = [];
  for (let i = 0; i < buf.length; i++) {
    const b = buf[i];
    if (b === 0xC2 && i + 1 < buf.length && buf[i + 1] === 0xA0) {
      out.push(0x20);
      i++; // skip A0
      continue;
    }
    out.push(b);
  }
  return Buffer.from(out);
}

function assertNoForbiddenBytes(buf, forbidden = [0xC2, 0xA0]) {
  for (const b of buf) {
    if (forbidden.includes(b)) {
      throw new Error('Forbidden byte in payload: 0x' + b.toString(16));
    }
  }
}

async function printRawToNetwork(payloadBuf, options = {}) {
  const { copies = 1, cut = true, beep = true } = options;
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    socket.setTimeout(10000);
    socket.connect(config.printerPort, config.printerHost, () => {
      try {
        const initBuf = toBytes(getTicketInit());
        const cutBuf = toBytes(COMMANDS.CUT);
        const beepBuf = toBytes(COMMANDS.BEEP);

        socket.write(initBuf);
        if (beep && config.beepOnPrint) socket.write(beepBuf);
        for (let i = 0; i < copies; i++) {
          socket.write(initBuf);
          socket.write(payloadBuf);
          if (cut && config.cutAfterPrint) {
            socket.write(Buffer.from([0x0A, 0x0A, 0x0A, 0x0A]));
            socket.write(cutBuf);
          }
        }
        socket.end();
        resolve({ success: true });
      } catch (e) {
        socket.destroy();
        reject(e);
      }
    });
    socket.on('error', reject);
    socket.on('timeout', () => {
      socket.destroy();
      reject(new Error('Timeout'));
    });
  });
}

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      config = { ...defaultConfig, ...JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')) };
      return true;
    }
  } catch (e) {
    console.error('Erro ao carregar config:', e.message);
  }
  return false;
}

function saveConfig() {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('Erro ao salvar config:', e.message);
    return false;
  }
}

async function listPrinters() {
  return new Promise((resolve) => {
    if (os.platform() !== 'win32') return resolve([]);
    exec('wmic printer get name', { encoding: 'utf8' }, (err, stdout) => {
      if (err) return resolve([]);
      resolve(stdout.split('\\n').map(l => l.trim()).filter(l => l && l !== 'Name'));
    });
  });
}

async function testNetworkPrinter(host, port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(3000);
    socket.connect(port || 9100, host, () => { socket.destroy(); resolve({ success: true }); });
    socket.on('error', (e) => { socket.destroy(); resolve({ success: false, error: e.message }); });
    socket.on('timeout', () => { socket.destroy(); resolve({ success: false, error: 'Timeout' }); });
  });
}

async function printToNetwork(content, options = {}) {
  const { copies = 1, cut = true, beep = true } = options;
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    socket.setTimeout(10000);
    socket.connect(config.printerPort, config.printerHost, () => {
      try {
        socket.write(toBytes(getTicketInit()));
        if (beep && config.beepOnPrint) socket.write(toBytes(COMMANDS.BEEP));
        for (let i = 0; i < copies; i++) {
          // Always reset at start of each copy (prevents style inheritance)
          socket.write(toBytes(getTicketInit() + killNbsp(String(content || ''))));
          if (cut && config.cutAfterPrint) {
            socket.write(toBytes(LF + LF + LF + LF));
            socket.write(toBytes(COMMANDS.CUT));
          }
        }
        socket.end();
        resolve({ success: true });
      } catch (e) { socket.destroy(); reject(e); }
    });
    socket.on('error', reject);
    socket.on('timeout', () => { socket.destroy(); reject(new Error('Timeout')); });
  });
}

async function printToUsb(content, options = {}) {
  const { copies = 1, cut = true, beep = true } = options;
  return new Promise((resolve, reject) => {
    const tempFile = path.join(os.tmpdir(), 'zoopi-print-' + Date.now() + '.txt');
    try {
      let data = COMMANDS.INIT;
      if (beep && config.beepOnPrint) data += COMMANDS.BEEP;
      for (let i = 0; i < copies; i++) {
        data += content;
        if (cut && config.cutAfterPrint) { data += '\\n\\n\\n\\n'; data += COMMANDS.CUT; }
      }
      fs.writeFileSync(tempFile, iconv.encode(data, config.encoding));
      exec('copy /b "' + tempFile + '" "\\\\\\\\%COMPUTERNAME%\\\\' + config.printerName + '"', { shell: 'cmd.exe' }, (err) => {
        try { fs.unlinkSync(tempFile); } catch(e) {}
        if (err) reject(new Error('Falha USB')); else resolve({ success: true });
      });
    } catch (e) { reject(e); }
  });
}

async function printContent(content, options = {}) {
  if (config.printerType === 'usb') return printToUsb(content, options);
  return printToNetwork(content, options);
}

async function printRawContent(payloadBuf, options = {}) {
  if (config.printerType === 'usb') {
    // USB printing path writes a temp file; ensure bytes are preserved.
    const { copies = 1, cut = true, beep = true } = options;
    return new Promise((resolve, reject) => {
      const tempFile = path.join(os.tmpdir(), 'zoopi-print-raw-' + Date.now() + '.bin');
      try {
        const initBuf = toBytes(getTicketInit());
        const cutBuf = toBytes(COMMANDS.CUT);
        const beepBuf = toBytes(COMMANDS.BEEP);

        const chunks = [];
        chunks.push(initBuf);
        if (beep && config.beepOnPrint) chunks.push(beepBuf);
        for (let i = 0; i < copies; i++) {
          chunks.push(initBuf);
          chunks.push(payloadBuf);
          if (cut && config.cutAfterPrint) {
            chunks.push(Buffer.from([0x0A, 0x0A, 0x0A, 0x0A]));
            chunks.push(cutBuf);
          }
        }

        fs.writeFileSync(tempFile, Buffer.concat(chunks));
        exec('copy /b "' + tempFile + '" "\\\\%COMPUTERNAME%\\' + config.printerName + '"', { shell: 'cmd.exe' }, (err) => {
          try { fs.unlinkSync(tempFile); } catch(e) {}
          if (err) reject(new Error('Falha USB')); else resolve({ success: true });
        });
      } catch (e) { reject(e); }
    });
  }

  return printRawToNetwork(payloadBuf, options);
}

function formatOrder(order, items, sectorName) {
  const LINE_LEN = 48;
  
  // ESC/P2 init with Portuguese codepage
  let t = escp2Init();
  
  t += COMMANDS.ALIGN_CENTER + COMMANDS.DOUBLE_ON + '*** ' + (killNbsp(sectorName) || 'PRODUCAO') + ' ***\\n';
  t += COMMANDS.NORMAL + COMMANDS.ALIGN_LEFT + '='.repeat(LINE_LEN) + '\\n';
  const orderNum = order.order_number ? String(order.order_number).padStart(3, '0') : order.id.slice(0,8).toUpperCase();
  t += COMMANDS.BOLD_ON + 'PEDIDO: #' + orderNum + '\\n' + COMMANDS.BOLD_OFF;
  if (order.customer_name) t += 'Cliente: ' + truncateAscii(order.customer_name, LINE_LEN - 9) + '\\n';
  if (order.table_number) t += COMMANDS.DOUBLE_HEIGHT_ON + 'MESA: ' + order.table_number + '\\n' + COMMANDS.NORMAL;
  if (order.command_number || order.command_name) {
    t += COMMANDS.BOLD_ON + 'COMANDA: ' + (order.command_number ? '#' + order.command_number : '') + (order.command_name ? ' - ' + truncateAscii(order.command_name, 20) : '') + '\\n' + COMMANDS.BOLD_OFF;
  }
  t += 'Data: ' + formatDateTimeBR(order.created_at) + '\\n' + '-'.repeat(LINE_LEN) + '\\n';
  t += COMMANDS.BOLD_ON + 'ITENS:\\n' + COMMANDS.BOLD_OFF;
  for (const item of items) {
    t += COMMANDS.DOUBLE_HEIGHT_ON + item.quantity + 'x ' + truncateAscii(item.product_name, LINE_LEN - 6) + '\\n' + COMMANDS.NORMAL;
    if (item.selected_options_json) {
      try {
        const opts = typeof item.selected_options_json === 'string' ? JSON.parse(item.selected_options_json) : item.selected_options_json;
        const groups = opts.selected_options || (Array.isArray(opts) ? opts : []);
        for (const g of groups) {
          // Skip "question" labels like "Escolha o sabor"
          if (g.groupName && isPizzaQuestionLabel(g.groupName)) continue;
          if (g.items && Array.isArray(g.items)) {
            for (const opt of g.items) {
              const label = killNbsp(opt.label || opt.name || '');
              if (label && !isPizzaQuestionLabel(label)) {
                t += '   + ' + (opt.quantity || 1) + 'x ' + truncateAscii(label, LINE_LEN - 8) + '\\n';
              }
            }
          } else if (g.selectedOptions) {
            for (const s of g.selectedOptions) {
              const sName = killNbsp(s.name);
              if (sName && !isPizzaQuestionLabel(sName)) {
                t += '   > ' + truncateAscii(sName, LINE_LEN - 5) + '\\n';
              }
            }
          }
        }
      } catch(e) {}
    }
    if (item.notes) t += '   OBS: ' + truncateAscii(item.notes, LINE_LEN - 8) + '\\n';
  }
  if (order.notes) t += '-'.repeat(LINE_LEN) + '\\n' + COMMANDS.BOLD_ON + 'OBS: ' + truncateAscii(order.notes, LINE_LEN - 5) + '\\n' + COMMANDS.BOLD_OFF;
  t += '='.repeat(LINE_LEN) + '\\n' + COMMANDS.ALIGN_CENTER + 'Impresso: ' + formatDateTimeBR(new Date()) + '\\n' + COMMANDS.ALIGN_LEFT + '\\n\\n\\n';
  return t;
}

async function processJob(job) {
  if (processedJobs.has(job.id) || isProcessing) return;
  isProcessing = true;
  processedJobs.add(job.id);
  try {
    console.log('📄 Processando ' + job.id.slice(0,8) + '...');

    // ==== TABLE_BILL (PRÉ-CONTA / COMANDA) ====
    if (job.job_type === 'table_bill') {
      const md = job.metadata;
      if (!md) throw new Error('Metadata não encontrada');

      // If backend provided RAW ESC/POS bytes, ALWAYS prefer them.
      // This avoids reformatting and guarantees 48-col alignment as generated.
      if (md.rawEscPosBase64) {
        const raw = Buffer.from(String(md.rawEscPosBase64), 'base64');
        const fixed = fixUtf8NbspBytes(raw);
        // Evidence: log hex + guarantee no C2/A0 bytes are sent.
        console.log('[escpos-raw] HEX=' + fixed.toString('hex'));
        assertNoForbiddenBytes(fixed, [0xC2, 0xA0]);

        await printRawContent(fixed, { copies: 1, cut: true, beep: true });
        await markJobComplete(job.id);
        stats.printed++; stats.lastPrint = new Date().toISOString(); stats.lastError = null;
        console.log('   ✓ Pré-conta impressa (RAW ESC/POS)!');
        return;
      }

      const LINE_LEN = 48;
      let t = escp2Init();  // ESC/P2 init with codepage
      t += COMMANDS.ALIGN_CENTER + COMMANDS.DOUBLE_ON + '*** PRE-CONTA ***\\n' + COMMANDS.NORMAL;
      t += (md.companyName ? (killNbsp(md.companyName) + '\\n') : '');
      t += COMMANDS.DOUBLE_HEIGHT_ON + 'MESA/COMANDA: ' + (md.tableNumber || '') + '\\n' + COMMANDS.NORMAL;
      if (md.tableName) t += killNbsp(String(md.tableName)) + '\\n';
      t += '='.repeat(LINE_LEN) + '\\n' + COMMANDS.ALIGN_LEFT;

      const cmds = Array.isArray(md.commands) ? md.commands : [];
      for (const cmd of cmds) {
        const title = cmd.name || ('Comanda #' + (cmd.number || ''));
        t += COMMANDS.BOLD_ON + truncateAscii(title, LINE_LEN) + COMMANDS.BOLD_OFF + '\\n';
        const items = Array.isArray(cmd.items) ? cmd.items : [];
        for (const it of items) {
          const price = it.total_price_cents != null ? moneyBR(it.total_price_cents) : '';
          t += formatLine(String(it.quantity || 0) + 'x ' + truncateAscii(it.product_name || '', LINE_LEN - 18), price, LINE_LEN) + '\\n';
          if (it.notes) t += '   OBS: ' + truncateAscii(it.notes, LINE_LEN - 8) + '\\n';
        }
        if (cmd.total_cents != null) t += formatLine('Subtotal:', moneyBR(cmd.total_cents), LINE_LEN) + '\\n';
        t += '-'.repeat(LINE_LEN) + '\\n';
      }
      t += escp2ResetStyle();
      t += COMMANDS.BOLD_ON + formatLine('TOTAL:', moneyBR(md.totalCents), LINE_LEN) + COMMANDS.BOLD_OFF + '\\n';
      t += COMMANDS.ALIGN_CENTER + 'Impresso: ' + formatDateTimeBR(new Date()) + '\\n' + COMMANDS.ALIGN_LEFT + '\\n\\n\\n';

      await printContent(t, { copies: 1 });
      await markJobComplete(job.id);
      stats.printed++; stats.lastPrint = new Date().toISOString(); stats.lastError = null;
      console.log('   ✓ Pré-conta impressa!');
      return;
    }

    // ==== FULL_ORDER (VIA ENTREGADOR / EXPEDIÇÃO - 80mm / 48 colunas) ====
    if (job.job_type === 'full_order') {
      const { data: order } = await supabase.from('orders').select('*').eq('id', job.order_id).single();
      if (!order) throw new Error('Pedido não encontrado');
      const { data: items } = await supabase.from('order_items').select('*').eq('order_id', job.order_id);
      const { data: company } = await supabase.from('companies').select('name').eq('id', order.company_id).single();

      const LINE_LEN = 48;
      const orderNum = order.order_number ? String(order.order_number).padStart(3, '0') : order.id.slice(0,8).toUpperCase();

      const centerLine = (text) => {
        const clean = truncateAscii(String(text || ''), LINE_LEN);
        const pad = Math.max(0, Math.floor((LINE_LEN - clean.length) / 2));
        return ' '.repeat(pad) + clean;
      };

      // ESC/P2 init with Portuguese codepage
      let t = escp2Init();

      // Cabeçalho
      t += COMMANDS.ALIGN_CENTER;
      t += COMMANDS.INVERT_ON + COMMANDS.BOLD_ON + centerLine('VIA ENTREGADOR / EXPEDICAO') + '\\n' + COMMANDS.BOLD_OFF + COMMANDS.INVERT_OFF;
      if (company?.name) t += centerLine(killNbsp(company.name)) + '\\n';
      t += '='.repeat(LINE_LEN) + '\\n';

      // Pedido em destaque
      t += COMMANDS.ALIGN_CENTER;
      t += COMMANDS.DOUBLE_HEIGHT_ON + COMMANDS.BOLD_ON;
      t += centerLine('PEDIDO #' + orderNum) + '\\n';
      t += COMMANDS.NORMAL + COMMANDS.BOLD_OFF;

      // Info básica
      if (order.customer_name) t += centerLine(truncateAscii(order.customer_name, LINE_LEN)) + '\\n';
      t += 'Data: ' + formatDateTimeBR(order.created_at) + '\\n';
      t += '-'.repeat(LINE_LEN) + '\\n';
      t += COMMANDS.ALIGN_LEFT;

      // Itens
      for (const it of (items || [])) {
        const qty = it.quantity || it.qty || 1;
        const unitCents = it.unit_price_cents != null ? it.unit_price_cents : (it.unit_price != null ? Math.round(Number(it.unit_price) * 100) : 0);
        const totalCents = it.total_price_cents != null ? it.total_price_cents : (qty * unitCents);
        const priceStr = moneyBR(totalCents);
        const qtyStr = String(qty) + 'x ';
        const nameMax = Math.max(8, LINE_LEN - qtyStr.length - priceStr.length - 1);
        const name = truncateAscii((it.product_name || '').toUpperCase(), nameMax);
        t += formatLine(qtyStr + name, priceStr, LINE_LEN) + '\\n';

        if (it.selected_options_json) {
          try {
            const opts = typeof it.selected_options_json === 'string' ? JSON.parse(it.selected_options_json) : it.selected_options_json;
            const groups = opts.selected_options || (Array.isArray(opts) ? opts : []);
            for (const g of groups) {
              // Skip "question" labels like "Escolha o sabor"
              if (g.groupName && isPizzaQuestionLabel(g.groupName)) continue;
              if (g.items && Array.isArray(g.items)) {
                for (const opt of g.items) {
                  const label = killNbsp(opt.label || opt.name || '');
                  if (label && !isPizzaQuestionLabel(label)) {
                    t += '   + ' + (opt.quantity || 1) + 'x ' + truncateAscii(label, LINE_LEN - 8) + '\\n';
                  }
                }
              } else if (g.selectedOptions) {
                for (const s of g.selectedOptions) {
                  const sName = killNbsp(s.name);
                  if (sName && !isPizzaQuestionLabel(sName)) {
                    t += '   > ' + truncateAscii(sName, LINE_LEN - 5) + '\\n';
                  }
                }
              }
            }
          } catch (e) {}
        }

        if (it.notes) t += '   OBS: ' + truncateAscii(it.notes, LINE_LEN - 8) + '\\n';
      }

      // TOTAL: 1 linha, valor alinhado à direita
      const totalCents = order.total_amount_cents != null ? order.total_amount_cents : (order.total_amount != null ? Math.round(Number(order.total_amount) * 100) : null);
      if (totalCents != null) {
        t += '='.repeat(LINE_LEN) + '\\n';
        t += escp2ResetStyle();
        t += COMMANDS.BOLD_ON + formatLine('TOTAL:', moneyBR(totalCents), LINE_LEN) + '\\n' + COMMANDS.BOLD_OFF;
      }

      // Reset final
      t += COMMANDS.ALIGN_CENTER + 'Impresso: ' + formatDateTimeBR(new Date()) + '\\n';
      t += escp2ResetStyle();
      t += COMMANDS.ALIGN_LEFT + '\\n\\n\\n';

      await printContent(t, { copies: config.copies });
      await markJobComplete(job.id);
      stats.printed++; stats.lastPrint = new Date().toISOString(); stats.lastError = null;
      console.log('   ✓ Ticket completo impresso!');
      return;
    }

    // ==== ORDER (PRODUÇÃO) ====
    const { data: order } = await supabase.from('orders').select('*').eq('id', job.order_id).single();
    if (!order) throw new Error('Pedido não encontrado');
    const { data: items } = await supabase.from('order_items').select('*').eq('order_id', job.order_id);
    let sectorName = 'PRODUÇÃO';
    if (job.print_sector_id) {
      const { data: sec } = await supabase.from('print_sectors').select('name').eq('id', job.print_sector_id).single();
      if (sec) sectorName = sec.name.toUpperCase();
    }
    let filteredItems = items || [];
    if (job.print_sector_id && items) {
      const { data: cats } = await supabase.from('category_print_sectors').select('category_id').eq('sector_id', job.print_sector_id);
      if (cats && cats.length) {
        const catIds = cats.map(c => c.category_id);
        // Busca subcategorias que pertencem às categorias do setor
        const { data: subs } = await supabase.from('subcategories').select('id').in('category_id', catIds);
        if (subs && subs.length) {
          const subIds = subs.map(s => s.id);
          // Busca produtos que pertencem às subcategorias
          const { data: prods } = await supabase.from('products').select('id').in('subcategory_id', subIds);
          if (prods) filteredItems = items.filter(i => prods.map(p => p.id).includes(i.product_id));
        } else {
          filteredItems = [];
        }
      }
    }
    if (!filteredItems.length) { await markJobComplete(job.id); return; }
    await printContent(formatOrder(order, filteredItems, sectorName), { copies: config.copies });
    await markJobComplete(job.id);
    stats.printed++; stats.lastPrint = new Date().toISOString(); stats.lastError = null;
    console.log('   ✓ Impresso!');
  } catch (e) {
    console.error('   ❌ ' + e.message);
    await markJobFailed(job.id, e.message);
    stats.failed++; stats.lastError = e.message;
  } finally { isProcessing = false; }
}

async function markJobComplete(id) {
  await supabase.from('print_job_queue').update({ status: 'completed', printed_at: new Date().toISOString() }).eq('id', id);
}

async function markJobFailed(id, msg) {
  const { data } = await supabase.from('print_job_queue').select('attempts').eq('id', id).single();
  const attempts = (data?.attempts || 0) + 1;
  await supabase.from('print_job_queue').update({ status: attempts >= 3 ? 'failed' : 'pending', attempts, error_message: msg }).eq('id', id);
}

async function fetchPendingJobs() {
  let q = supabase.from('print_job_queue').select('*').eq('status', 'pending').in('job_type', ['order', 'full_order', 'table_bill']).order('created_at').limit(10);
  if (config.companyId) q = q.eq('company_id', config.companyId);
  const { data } = await q;
  return data || [];
}

async function pollLoop() {
  if (!stats.isRunning) return;
  for (const job of await fetchPendingJobs()) await processJob(job);
}

function startAgent() {
  if (stats.isRunning) return { success: true, message: 'Já rodando' };
  if (!config.supabaseUrl || !config.supabaseKey || !config.companyId) return { success: false, message: 'Configure Supabase e Company ID' };
  try {
    supabase = createClient(config.supabaseUrl, config.supabaseKey);
    stats.isRunning = true; stats.started = new Date().toISOString(); stats.lastError = null;
    pollIntervalId = setInterval(pollLoop, config.pollInterval);
    realtimeChannel = supabase.channel('print-agent').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'print_job_queue', filter: 'company_id=eq.' + config.companyId }, (p) => { processJob(p.new); }).subscribe();
    console.log('✓ Agente iniciado!');
    pollLoop();
    return { success: true };
  } catch (e) { return { success: false, message: e.message }; }
}

function stopAgent() {
  if (pollIntervalId) clearInterval(pollIntervalId);
  if (realtimeChannel) supabase.removeChannel(realtimeChannel);
  stats.isRunning = false; supabase = null;
  console.log('⏹ Agente parado');
  return { success: true };
}

const HTML_PAGE = '<!DOCTYPE html>' +
'<html lang="pt-BR">' +
'<head>' +
'  <meta charset="UTF-8">' +
'  <meta name="viewport" content="width=device-width, initial-scale=1.0">' +
'  <title>Zoopi Print Agent</title>' +
'  <style>' +
'    * { box-sizing: border-box; margin: 0; padding: 0; }' +
'    body { font-family: system-ui, sans-serif; background: #0f172a; color: #e2e8f0; min-height: 100vh; }' +
'    .container { max-width: 800px; margin: 0 auto; padding: 20px; }' +
'    h1 { text-align: center; margin-bottom: 30px; color: #22c55e; }' +
'    .card { background: #1e293b; border-radius: 12px; padding: 24px; margin-bottom: 20px; }' +
'    .card h2 { color: #94a3b8; font-size: 14px; text-transform: uppercase; margin-bottom: 16px; }' +
'    .status { display: flex; align-items: center; gap: 12px; padding: 16px; background: #0f172a; border-radius: 8px; margin-bottom: 16px; }' +
'    .status-dot { width: 12px; height: 12px; border-radius: 50%; }' +
'    .status-dot.running { background: #22c55e; box-shadow: 0 0 10px #22c55e; }' +
'    .status-dot.stopped { background: #ef4444; }' +
'    .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }' +
'    .stat { background: #0f172a; padding: 12px; border-radius: 8px; text-align: center; }' +
'    .stat-value { font-size: 24px; font-weight: bold; color: #22c55e; }' +
'    .stat-label { font-size: 12px; color: #64748b; }' +
'    .form-group { margin-bottom: 16px; }' +
'    label { display: block; font-size: 14px; color: #94a3b8; margin-bottom: 6px; }' +
'    input, select { width: 100%; padding: 12px; background: #0f172a; border: 1px solid #334155; border-radius: 8px; color: #e2e8f0; }' +
'    input:focus, select:focus { outline: none; border-color: #22c55e; }' +
'    .row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }' +
'    .btn { padding: 14px 24px; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; width: 100%; }' +
'    .btn-primary { background: #22c55e; color: #0f172a; }' +
'    .btn-danger { background: #ef4444; color: white; }' +
'    .btn-secondary { background: #334155; color: #e2e8f0; }' +
'    .btn:disabled { opacity: 0.5; cursor: not-allowed; }' +
'    .actions { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 20px; }' +
'    .error { background: #7f1d1d; color: #fca5a5; padding: 12px; border-radius: 8px; margin-bottom: 16px; }' +
'  </style>' +
'</head>' +
'<body>' +
'  <div class="container">' +
'    <h1>🖨️ Zoopi Print Agent</h1>' +
'    <div class="card">' +
'      <h2>Status</h2>' +
'      <div class="status">' +
'        <div class="status-dot" id="statusDot"></div>' +
'        <div><div id="statusText" style="font-weight: 600;"></div><div id="statusSince" style="font-size: 12px; color: #64748b;"></div></div>' +
'      </div>' +
'      <div class="stats">' +
'        <div class="stat"><div class="stat-value" id="printed">0</div><div class="stat-label">Impressos</div></div>' +
'        <div class="stat"><div class="stat-value" id="failed" style="color: #ef4444;">0</div><div class="stat-label">Falhas</div></div>' +
'        <div class="stat"><div class="stat-value" id="lastPrint">-</div><div class="stat-label">Última</div></div>' +
'      </div>' +
'      <div id="errorBox" class="error" style="display: none; margin-top: 16px;"></div>' +
'    </div>' +
'    <div class="card">' +
'      <h2>Impressora</h2>' +
'      <div class="form-group"><label>Tipo</label><select id="printerType"><option value="network">Rede (TCP/IP)</option><option value="usb">USB (Windows)</option></select></div>' +
'      <div id="networkConfig"><div class="row"><div class="form-group"><label>IP da Impressora</label><input type="text" id="printerHost" placeholder="192.168.1.100"></div><div class="form-group"><label>Porta</label><input type="number" id="printerPort" placeholder="9100"></div></div></div>' +
'      <div id="usbConfig" style="display: none;"><div class="form-group"><label>Nome da Impressora</label><select id="printerName"><option value="">Carregando...</option></select></div></div>' +
'      <button class="btn btn-secondary" onclick="testPrinter()">🔌 Testar Conexão</button>' +
'    </div>' +
'    <div class="card">' +
'      <h2>Configurações</h2>' +
'      <div class="row">' +
'        <div class="form-group">' +
'          <label>Protocolo</label>' +
'          <select id="protocol">' +
'            <option value="escp2">ESC/P2 (Epson avançado - recomendado)</option>' +
'            <option value="escpos">ESC/POS (básico/compatibilidade)</option>' +
'          </select>' +
'        </div>' +
'        <div class="form-group">' +
'          <label>Codificação</label>' +
'          <select id="encoding">' +
'            <option value="cp860">CP860 (Português)</option>' +
'            <option value="cp850">CP850</option>' +
'            <option value="ascii">ASCII</option>' +
'            <option value="utf8">UTF-8 (se suportado)</option>' +
'          </select>' +
'        </div>' +
'      </div>' +
'      <div class="row"><div class="form-group"><label>Cópias</label><input type="number" id="copies" min="1" max="5" value="1"></div><div class="form-group"></div></div>' +
'      <div class="row"><div class="form-group"><label><input type="checkbox" id="beepOnPrint" checked> Beep ao imprimir</label></div><div class="form-group"><label><input type="checkbox" id="cutAfterPrint" checked> Cortar papel</label></div></div>' +
'    </div>' +
'    <div class="actions"><button class="btn btn-primary" id="btnStart" onclick="startAgent()">▶️ INICIAR</button><button class="btn btn-danger" id="btnStop" onclick="stopAgent()" disabled>⏹ PARAR</button></div>' +
'  </div>' +
'  <script>' +
'    async function api(e,m="GET",b){const r=await fetch("/api/"+e,{method:m,headers:{"Content-Type":"application/json"},body:b?JSON.stringify(b):undefined});return r.json();}' +
'    async function loadStatus(){const s=await api("status");document.getElementById("statusDot").className="status-dot "+(s.isRunning?"running":"stopped");document.getElementById("statusText").textContent=s.isRunning?"Rodando":"Parado";document.getElementById("statusSince").textContent=s.started?"Desde "+new Date(s.started).toLocaleString("pt-BR"):"";document.getElementById("printed").textContent=s.printed;document.getElementById("failed").textContent=s.failed;document.getElementById("lastPrint").textContent=s.lastPrint?new Date(s.lastPrint).toLocaleTimeString("pt-BR"):"-";document.getElementById("btnStart").disabled=s.isRunning;document.getElementById("btnStop").disabled=!s.isRunning;if(s.lastError){document.getElementById("errorBox").textContent=s.lastError;document.getElementById("errorBox").style.display="block";}else{document.getElementById("errorBox").style.display="none";}}' +
'    async function loadConfig(){const c=await api("config");document.getElementById("printerType").value=c.printerType||"network";document.getElementById("printerHost").value=c.printerHost||"";document.getElementById("printerPort").value=c.printerPort||9100;document.getElementById("copies").value=c.copies||1;document.getElementById("protocol").value=c.protocol||"escp2";document.getElementById("encoding").value=c.encoding||"cp860";document.getElementById("beepOnPrint").checked=c.beepOnPrint!==false;document.getElementById("cutAfterPrint").checked=c.cutAfterPrint!==false;togglePrinterType();}' +
'    async function loadPrinters(){const p=await api("printers");document.getElementById("printerName").innerHTML=p.map(x=>"<option value=\\""+x+"\\">"+x+"</option>").join("");}' +
'    function togglePrinterType(){const t=document.getElementById("printerType").value;document.getElementById("networkConfig").style.display=t==="network"?"block":"none";document.getElementById("usbConfig").style.display=t==="usb"?"block":"none";}' +
'    async function saveConfig(){return api("config","POST",{printerType:document.getElementById("printerType").value,printerHost:document.getElementById("printerHost").value,printerPort:parseInt(document.getElementById("printerPort").value)||9100,printerName:document.getElementById("printerName").value,copies:parseInt(document.getElementById("copies").value)||1,protocol:document.getElementById("protocol").value,encoding:document.getElementById("encoding").value,beepOnPrint:document.getElementById("beepOnPrint").checked,cutAfterPrint:document.getElementById("cutAfterPrint").checked});}' +
'    async function testPrinter(){await saveConfig();const r=await api("test-printer","POST");alert(r.success?"✓ Impressora conectada!":"✗ Falha: "+r.error);}' +
'    async function startAgent(){await saveConfig();const r=await api("start","POST");if(!r.success)alert("Erro: "+r.message);loadStatus();}' +
'    async function stopAgent(){await api("stop","POST");loadStatus();}' +
'    document.getElementById("printerType").addEventListener("change",togglePrinterType);loadConfig();loadStatus();loadPrinters();setInterval(loadStatus,5000);' +
'  </script>' +
'</body>' +
'</html>';

const server = http.createServer(async (req, res) => {
  // CORS (permite que o app web chame o serviço local)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const url = new URL(req.url || '/', 'http://localhost');

  // Healthcheck (usado pelo app)
  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, running: stats.isRunning }));
    return;
  }

  // API pública (usada pelo app)
  if (url.pathname === '/test-connection' && req.method === 'POST') {
    let b = '';
    req.on('data', c => b += c);
    req.on('end', async () => {
      try {
        const body = b ? JSON.parse(b) : {};
        const host = String(body.host || '');
        const port = Number(body.port || 9100);
        const r = await testNetworkPrinter(host, port);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(r));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: e.message }));
      }
    });
    return;
  }

  if (url.pathname === '/print' && req.method === 'POST') {
    let b = '';
    req.on('data', c => b += c);
    req.on('end', async () => {
      try {
        const body = b ? JSON.parse(b) : {};
        const host = String(body.host || '');
        const port = Number(body.port || 9100);
        const content = String(body.content || '');
        const copies = Number(body.copies || 1);
        const cut = body.cut !== false;
        const beep = body.beep === true;

        // imprime direto no host/porta informados
        const prevHost = config.printerHost;
        const prevPort = config.printerPort;
        config.printerHost = host;
        config.printerPort = port;
        await printToNetwork(content, { copies, cut, beep });
        config.printerHost = prevHost;
        config.printerPort = prevPort;

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, printedAt: new Date().toISOString() }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: e.message }));
      }
    });
    return;
  }

  if (url.pathname === '/print-ticket' && req.method === 'POST') {
    let b = '';
    req.on('data', c => b += c);
    req.on('end', async () => {
      try {
        const body = b ? JSON.parse(b) : {};
        const host = String(body.host || '');
        const port = Number(body.port || 9100);
        const ticket = body.ticket || {};
        const copies = Number(body.copies || 1);
        const beep = body.beep === true;

        let content = '';
        content += '*** ' + String(ticket.sectorName || 'COZINHA') + ' ***\\n';
        content += 'PEDIDO: ' + String(ticket.orderNumber || '').toString() + '\\n';
        if (ticket.orderType) content += 'TIPO: ' + String(ticket.orderType) + '\\n';
        if (ticket.customerName) content += 'CLIENTE: ' + String(ticket.customerName) + '\\n';
        if (ticket.tableName) content += 'MESA: ' + String(ticket.tableName) + '\\n';
        content += '-'.repeat(42) + '\\n';
        const items = Array.isArray(ticket.items) ? ticket.items : [];
        for (const it of items) {
          const q = Number(it.quantity || 1);
          content += q + 'x ' + String(it.name || '') + '\\n';
          const opts = Array.isArray(it.options) ? it.options : [];
          for (const o of opts) content += '  > ' + String(o) + '\\n';
          if (it.notes) content += '  OBS: ' + String(it.notes) + '\\n';
        }
        if (ticket.notes) content += '-'.repeat(42) + '\\nOBS: ' + String(ticket.notes) + '\\n';
        content += '\\n\\n\\n';

        const prevHost = config.printerHost;
        const prevPort = config.printerPort;
        config.printerHost = host;
        config.printerPort = port;
        await printToNetwork(content, { copies, cut: true, beep });
        config.printerHost = prevHost;
        config.printerPort = prevPort;

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, printedAt: new Date().toISOString() }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: e.message }));
      }
    });
    return;
  }

  // UI do agente (navegador)
  if (url.pathname === '/' || url.pathname === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(HTML_PAGE);
    return;
  }

  // API interna da UI ("/api/*")
  if (url.pathname.startsWith('/api/')) {
    res.setHeader('Content-Type', 'application/json');
    const ep = url.pathname.replace('/api/', '');
    if (ep === 'status') { res.end(JSON.stringify(stats)); }
    else if (ep === 'config' && req.method === 'GET') { res.end(JSON.stringify(config)); }
    else if (ep === 'config' && req.method === 'POST') {
      let b = '';
      req.on('data', c => b += c);
      req.on('end', () => {
        try { config = { ...config, ...JSON.parse(b) }; saveConfig(); res.end(JSON.stringify({ success: true })); }
        catch (e) { res.end(JSON.stringify({ success: false, error: e.message })); }
      });
      return;
    }
    else if (ep === 'printers') { res.end(JSON.stringify(await listPrinters())); }
    else if (ep === 'test-printer' && req.method === 'POST') {
      const r = config.printerType === 'usb'
        ? { success: (await listPrinters()).some(p => p.toLowerCase() === (config.printerName || '').toLowerCase()) }
        : await testNetworkPrinter(config.printerHost, config.printerPort);
      res.end(JSON.stringify(r));
    }
    else if (ep === 'start' && req.method === 'POST') { res.end(JSON.stringify(startAgent())); }
    else if (ep === 'stop' && req.method === 'POST') { res.end(JSON.stringify(stopAgent())); }
    else { res.writeHead(404); res.end(JSON.stringify({ error: 'Not found' })); }
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

loadConfig();
server.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║           ZOOPI PRINT AGENT v1.0                          ║');
  console.log('╠═══════════════════════════════════════════════════════════╣');
  console.log('║  Acesse: http://localhost:' + PORT + '                         ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('');
  if (config.supabaseUrl && config.supabaseKey && config.companyId) { console.log('Configuração encontrada, iniciando automaticamente...'); startAgent(); }
  else { console.log('Configure pelo navegador e clique em INICIAR.'); }
});

server.on('error', (err) => {
  console.error('ERRO ao iniciar servidor:', err.message);
  if (err.code === 'EADDRINUSE') {
    console.error('A porta ' + PORT + ' já está em uso. Feche outros programas ou reinicie o computador.');
  }
  process.exit(1);
});

process.on('SIGINT', () => { stopAgent(); process.exit(0); });
`;

export function downloadPrintAgentSingleFile(companyId: string, supabaseUrl: string, supabaseKey: string) {
  const configJson = JSON.stringify({
    supabaseUrl,
    supabaseKey,
    companyId,
    protocol: "escp2",
    printerType: "network",
    printerHost: "192.168.1.100",
    printerPort: 9100,
    printerName: "",
    pollInterval: 3000,
    encoding: "cp860",
    beepOnPrint: true,
    cutAfterPrint: true,
    copies: 1
  }, null, 2);

  const packageJson = `{
  "name": "zoopi-print-agent",
  "version": "1.0.0",
  "description": "Agente local para impressão automática Zoopi",
  "main": "agent.js",
  "scripts": {
    "start": "node agent.js"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.45.0",
    "iconv-lite": "^0.6.3"
  }
}`;

  const iniciarBat = `@echo off
chcp 65001 >nul
title Zoopi Print Agent
cd /d "%~dp0"

echo.
echo ========================================
echo    ZOOPI PRINT AGENT
echo ========================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ERRO: Node.js nao encontrado!
    echo Baixe em: https://nodejs.org/ (versao LTS)
    pause
    exit /b 1
)

where npm.cmd >nul 2>nul
if %errorlevel% neq 0 (
    echo ERRO: NPM (npm.cmd) nao encontrado!
    echo Reinstale o Node.js (versao LTS) e marque para instalar o NPM.
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo Instalando dependencias...
    call npm.cmd install
    if %errorlevel% neq 0 (
        echo.
        echo ERRO: falha ao instalar dependencias.
        echo Verifique sua internet e tente novamente.
        pause
        exit /b 1
    )
    echo.
)

echo Iniciando agente...
echo Acesse: http://localhost:3848
echo.

start "" http://localhost:3848
node agent.js

echo.
echo (Se o navegador nao abriu, copie e cole: http://localhost:3848)
pause`;


  const readme = `# Zoopi Print Agent

Agente de impressão automática para impressoras térmicas.

## Instalação Rápida

1. Instale o Node.js: https://nodejs.org/ (versão LTS)
2. Execute o arquivo "INICIAR.bat"
3. Acesse http://localhost:3848 no navegador
4. Configure o IP da impressora e clique INICIAR

## Arquivos

- agent.js - Código do agente
- agent-config.json - Configurações (já preenchido com seus dados)
- package.json - Dependências
- INICIAR.bat - Script para iniciar

## Configuração da Impressora

### Impressora de Rede (TCP/IP)
- Descubra o IP da impressora na configuração dela
- Porta padrão: 9100
- Teste a conexão antes de iniciar

### Impressora USB (Windows)
- Selecione a impressora na lista
- A impressora deve estar compartilhada

## Problemas Comuns

### Impressora não conecta
- Verifique se o IP está correto
- Verifique se a porta 9100 está liberada no firewall
- Tente fazer ping no IP da impressora

### Caracteres estranhos
- Altere a codificação para CP850 ou UTF-8

### Node.js não encontrado
- Instale o Node.js de https://nodejs.org/
- Reinicie o computador após instalar`;

  // Baixa cada arquivo separadamente com intervalo
  const files = [
    { name: 'agent.js', content: AGENT_CODE },
    { name: 'package.json', content: packageJson },
    { name: 'agent-config.json', content: configJson },
    { name: 'INICIAR.bat', content: iniciarBat },
    { name: 'LEIA-ME.txt', content: readme },
  ];

  files.forEach((file, index) => {
    setTimeout(() => {
      const blob = new Blob([file.content], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, index * 500);
  });
}

// Alias para compatibilidade
export function downloadPrintAgent(companyId: string, supabaseUrl: string, supabaseKey: string) {
  downloadPrintAgentSingleFile(companyId, supabaseUrl, supabaseKey);
}
