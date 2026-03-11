/**
 * Zoopi Print Agent - Portable Executable Package
 * 
 * Gera um pacote completo que inclui:
 * - Instalador automático que baixa Node.js portátil
 * - Agente de impressão
 * - Script que roda tudo com 1 clique
 */

const AGENT_CODE_PORTABLE = `/**
 * Zoopi Print Agent v2.0 (Portable)
 * 
 * Agente local com interface web para configuração.
 * Acesse http://localhost:3848 para configurar.
 */

const { createClient } = require('@supabase/supabase-js');
const net = require('net');
const iconv = require('iconv-lite');
const fs = require('fs');
const path = require('path');
const { exec, spawn } = require('child_process');
const os = require('os');
const http = require('http');

const CONFIG_PATH = path.join(__dirname, 'agent-config.json');
const PORTS = [3848, 3847, 3846, 3849]; // Tenta várias portas

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

let config = { ...defaultConfig };
let supabase = null;
let isProcessing = false;
let processedJobs = new Set();
let pollIntervalId = null;
let realtimeChannel = null;
let usedPort = 3848;
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
const COMMANDS = {
  INIT: ESC + '@',
  CUT: GS + 'V' + '\\x00',
  BEEP: ESC + 'B' + '\\x05' + '\\x02',
  BOLD_ON: ESC + 'E' + '\\x01',
  BOLD_OFF: ESC + 'E' + '\\x00',
  DOUBLE_HEIGHT_ON: GS + '!' + '\\x10',
  DOUBLE_ON: GS + '!' + '\\x30',
  NORMAL: GS + '!' + '\\x00',
  ALIGN_CENTER: ESC + 'a' + '\\x01',
  ALIGN_LEFT: ESC + 'a' + '\\x00',
  INVERT_ON: GS + 'B' + '\\x01',
  INVERT_OFF: GS + 'B' + '\\x00',
};

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
        socket.write(COMMANDS.INIT);
        if (beep && config.beepOnPrint) socket.write(COMMANDS.BEEP);
        for (let i = 0; i < copies; i++) {
          socket.write(iconv.encode(content, config.encoding));
          if (cut && config.cutAfterPrint) { socket.write('\\n\\n\\n\\n'); socket.write(COMMANDS.CUT); }
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

function formatOrder(order, items, sectorName) {
  const LINE_LEN = 42;
  const sanitize = (str) => {
    if (!str) return '';
    return String(str).replace(/[\\u{1F300}-\\u{1F9FF}]/gu, '').replace(/[\\u{2600}-\\u{26FF}]/gu, '').replace(/[\\u{2700}-\\u{27BF}]/gu, '').replace(/[^\\x00-\\x7F\\xC0-\\xFF]/g, '').trim();
  };
  const truncate = (text, maxLen) => {
    const clean = sanitize(text).replace(/[\\r\\n]+/g, ' ').replace(/\\s+/g, ' ').trim();
    if (clean.length <= maxLen) return clean;
    return clean.slice(0, maxLen - 1) + '.';
  };
  
  let t = COMMANDS.ALIGN_CENTER + COMMANDS.DOUBLE_ON + '*** ' + (sanitize(sectorName) || 'PRODUCAO') + ' ***\\n';
  t += COMMANDS.NORMAL + COMMANDS.ALIGN_LEFT + '='.repeat(LINE_LEN) + '\\n';
  const orderNum = order.order_number ? String(order.order_number).padStart(3, '0') : order.id.slice(0,8).toUpperCase();
  t += COMMANDS.BOLD_ON + 'PEDIDO: #' + orderNum + '\\n' + COMMANDS.BOLD_OFF;
  if (order.customer_name) t += 'Cliente: ' + truncate(order.customer_name, LINE_LEN - 9) + '\\n';
  if (order.table_number) t += COMMANDS.DOUBLE_HEIGHT_ON + 'MESA: ' + order.table_number + '\\n' + COMMANDS.NORMAL;
  if (order.command_number || order.command_name) {
    t += COMMANDS.BOLD_ON + 'COMANDA: ' + (order.command_number ? '#' + order.command_number : '') + (order.command_name ? ' - ' + truncate(order.command_name, 20) : '') + '\\n' + COMMANDS.BOLD_OFF;
  }
  t += 'Data: ' + new Date(order.created_at).toLocaleString('pt-BR') + '\\n' + '-'.repeat(LINE_LEN) + '\\n';
  t += COMMANDS.BOLD_ON + 'ITENS:\\n' + COMMANDS.BOLD_OFF;
  for (const item of items) {
    t += COMMANDS.DOUBLE_HEIGHT_ON + item.quantity + 'x ' + truncate(item.product_name, LINE_LEN - 6) + '\\n' + COMMANDS.NORMAL;
    if (item.selected_options_json) {
      try {
        const opts = typeof item.selected_options_json === 'string' ? JSON.parse(item.selected_options_json) : item.selected_options_json;
        const groups = opts.selected_options || (Array.isArray(opts) ? opts : []);
        for (const g of groups) {
          if (g.items && Array.isArray(g.items)) {
            for (const opt of g.items) {
              const label = sanitize(opt.label || opt.name || '');
              if (label) t += '   + ' + (opt.quantity || 1) + 'x ' + truncate(label, LINE_LEN - 8) + '\\n';
            }
          } else if (g.selectedOptions) {
            for (const s of g.selectedOptions) t += '   > ' + truncate(sanitize(s.name), LINE_LEN - 5) + '\\n';
          }
        }
      } catch(e) {}
    }
    if (item.notes) t += '   OBS: ' + truncate(item.notes, LINE_LEN - 8) + '\\n';
  }
  if (order.notes) t += '-'.repeat(LINE_LEN) + '\\n' + COMMANDS.BOLD_ON + 'OBS: ' + truncate(order.notes, LINE_LEN - 5) + '\\n' + COMMANDS.BOLD_OFF;
  t += '='.repeat(LINE_LEN) + '\\n' + COMMANDS.ALIGN_CENTER + 'Impresso: ' + new Date().toLocaleString('pt-BR') + '\\n' + COMMANDS.ALIGN_LEFT + '\\n\\n\\n';
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

      // 1) Prioridade: imprimir ESC/POS RAW vindo do sistema (evita layout desconfigurado e caracteres "?")
      let t = '';
      if (md.rawEscPosBase64) {
        try {
          t = Buffer.from(String(md.rawEscPosBase64), 'base64').toString('latin1');
        } catch (e) {
          t = '';
        }
      }

      // 2) Fallback (caso RAW não exista): gerar um ticket seguro (ASCII puro / 48 colunas / sem OBS)
      if (!t) {
        const LINE_LEN = 48;
        const sanitize = (input) => {
          const str = input == null ? '' : String(input);
          const withoutDiacritics = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          const replaced = withoutDiacritics
            .replace(/[\u00A0\u2000-\u200B\u202F]/g, ' ')
            .replace(/[–—]/g, '-')
            .replace(/[°º]/g, 'o')
            .replace(/[ª]/g, 'a')
            .replace(/[\u201C\u201D]/g, '"')
            .replace(/[\u2018\u2019]/g, "'");
          return replaced.replace(/[^\x0A\x0D\x20-\x7E]/g, '');
        };

        const money = (cents) => {
          const safe = Number.isFinite(Number(cents)) ? Number(cents) : 0;
          const value = safe / 100;
          const abs = Math.abs(value);
          const fixed = abs.toFixed(2);
          const parts = fixed.split('.');
          const intPart = parts[0] || '0';
          const decPart = parts[1] || '00';
          let formatted = '';
          const digits = intPart.split('').reverse();
          for (let i = 0; i < digits.length; i++) {
            if (i > 0 && i % 3 === 0) formatted = '.' + formatted;
            formatted = digits[i] + formatted;
          }
          formatted += ',' + decPart;
          if (value < 0) formatted = '-' + formatted;
          return 'R$ ' + formatted;
        };

        const padCenter = (text) => {
          const s = sanitize(text);
          if (s.length >= LINE_LEN) return s.slice(0, LINE_LEN);
          const left = Math.floor((LINE_LEN - s.length) / 2);
          return ' '.repeat(left) + s;
        };

        const lineKV = (left, right) => {
          const l = sanitize(left);
          const r = sanitize(right);
          const available = Math.max(1, LINE_LEN - r.length);
          const lt = l.length > available ? l.slice(0, available) : l;
          const pad = Math.max(1, LINE_LEN - lt.length - r.length);
          return lt + ' '.repeat(pad) + r + '\n';
        };

        const formatDateTime = (d) => {
          const dt = d instanceof Date ? d : new Date(d);
          if (Number.isNaN(dt.getTime())) return '';
          const pad = (n) => String(n).padStart(2, '0');
          return (
            pad(dt.getDate()) +
            '/' +
            pad(dt.getMonth() + 1) +
            '/' +
            dt.getFullYear() +
            ' ' +
            pad(dt.getHours()) +
            ':' +
            pad(dt.getMinutes())
          );
        };

        t += COMMANDS.INIT;
        t += COMMANDS.NORMAL;
        t += COMMANDS.ALIGN_CENTER;
        t += COMMANDS.BOLD_ON;
        t += padCenter(md.companyName || 'SISTEMA') + '\n';
        t += COMMANDS.BOLD_OFF;
        t += '\n';

        t += COMMANDS.INVERT_ON;
        t += COMMANDS.BOLD_ON;
        t += padCenter('MESA ' + (md.tableNumber || '') + (md.tableName ? ' - ' + md.tableName : '')) + '\n';
        t += COMMANDS.BOLD_OFF;
        t += COMMANDS.INVERT_OFF;
        t += '\n';

        t += COMMANDS.BOLD_ON;
        t += '*** PRE-CONTA ***\n';
        t += '*** NAO E DOCUMENTO FISCAL ***\n';
        t += COMMANDS.BOLD_OFF;
        t += '='.repeat(LINE_LEN) + '\n';
        if (md.openedAt) t += 'Abertura: ' + formatDateTime(md.openedAt) + '\n';
        t += 'Impresso: ' + formatDateTime(new Date()) + '\n';
        t += '='.repeat(LINE_LEN) + '\n\n';

        t += COMMANDS.ALIGN_LEFT;
        const cmds = Array.isArray(md.commands) ? md.commands : [];
        for (const cmd of cmds) {
          const title = cmd.name
            ? sanitize(cmd.name)
            : ('Comanda #' + sanitize(cmd.number || '')).trim();
          t += COMMANDS.BOLD_ON + (title || 'COMANDA') + COMMANDS.BOLD_OFF + '\n';
          const items = Array.isArray(cmd.items) ? cmd.items : [];
          for (const it of items) {
            const qtyStr = String(it.quantity || 0) + 'x ';
            const priceStr = it.total_price_cents != null ? money(it.total_price_cents) : '';
            const nameMax = Math.max(8, LINE_LEN - qtyStr.length - priceStr.length);
            const name = truncate(sanitize(it.product_name || '').toUpperCase(), nameMax);
            const pad = Math.max(1, LINE_LEN - (qtyStr + name).length - priceStr.length);
            t += qtyStr + name + ' '.repeat(pad) + priceStr + '\n';
            // OBS/observações propositalmente NÃO são impressas no cupom principal
          }
          if (cmd.total_cents != null) t += lineKV('SUBTOTAL:', money(cmd.total_cents));
          t += '-'.repeat(LINE_LEN) + '\n';
        }

        t += '\n';
        t += COMMANDS.BOLD_ON;
        t += lineKV('TOTAL:', money(md.totalCents));
        t += COMMANDS.BOLD_OFF;
        t += '\n';
        t += COMMANDS.ALIGN_CENTER;
        t += 'Confira os valores antes do pagamento\n';
        t += 'Obrigado pela preferencia!\n';
        t += COMMANDS.ALIGN_LEFT + '\n\n\n';
      }

      await printContent(t, { copies: 1, cut: true, beep: false });
      await markJobComplete(job.id);
      stats.printed++; stats.lastPrint = new Date().toISOString(); stats.lastError = null;
      console.log('   ✓ Pré-conta impressa!');
      return;
    }

    // ==== SOMMELIER_TICKET (DICA DO ENÓLOGO) ====
    if (job.job_type === 'sommelier_ticket') {
      const md = job.metadata || {};
      const raw = String(md.ticketContent || '').trim();
      if (!raw) throw new Error('ticketContent não encontrado');

      const sanitizeSommelier = (input) => {
        const str = String(input || '')
          .replace(/[\u{1F300}-\u{1FAFF}]/gu, '')
          .replace(/[─━]/g, '-')
          .replace(/[═]/g, '=');
        const noDia = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return noDia.replace(/[^\x0A\x0D\x20-\x7E]/g, '');
      };

      const t = COMMANDS.INIT + COMMANDS.NORMAL + sanitizeSommelier(raw) + '\n\n\n';
      await printContent(t, { copies: 1, cut: true, beep: false });
      await markJobComplete(job.id);
      stats.printed++; stats.lastPrint = new Date().toISOString(); stats.lastError = null;
      console.log('   ✓ Ticket do enólogo impresso!');
      return;
    }

    // ==== ROTISSEUR_TICKET (SUGESTÃO DO MAÎTRE RÔTISSEUR) ====
    if (job.job_type === 'rotisseur_ticket') {
      const md = job.metadata || {};
      const raw = String(md.ticketContent || '').trim();
      if (!raw) throw new Error('ticketContent não encontrado');

      const sanitizeRotisseur = (input) => {
        const str = String(input || '')
          .replace(/[\u{1F300}-\u{1FAFF}]/gu, '')
          .replace(/[─━]/g, '-')
          .replace(/[═]/g, '=');
        const noDia = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return noDia.replace(/[^\x0A\x0D\x20-\x7E]/g, '');
      };

      const t = COMMANDS.INIT + COMMANDS.NORMAL + sanitizeRotisseur(raw) + '\n\n\n';
      await printContent(t, { copies: 1, cut: true, beep: false });
      await markJobComplete(job.id);
      stats.printed++; stats.lastPrint = new Date().toISOString(); stats.lastError = null;
      console.log('   ✓ Ticket do maître rôtisseur impresso!');
      return;
    }

    // ==== FULL_ORDER (VIA ENTREGADOR / EXPEDIÇÃO - 80mm / 48 colunas) ====
    if (job.job_type === 'full_order') {
      const { data: order } = await supabase.from('orders').select('*').eq('id', job.order_id).single();
      if (!order) throw new Error('Pedido não encontrado');
      const { data: items } = await supabase.from('order_items').select('*').eq('order_id', job.order_id);
      const { data: company } = await supabase.from('companies').select('name').eq('id', order.company_id).single();

      const LINE_LEN = 48;
      const money = (cents) => (Number(cents || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      const orderNum = order.order_number ? String(order.order_number).padStart(3, '0') : order.id.slice(0,8).toUpperCase();

      const centerLine = (text) => {
        const clean = truncate(String(text || ''), LINE_LEN);
        const pad = Math.max(0, Math.floor((LINE_LEN - clean.length) / 2));
        return ' '.repeat(pad) + clean;
      };

      const lineRow = (left, right) => {
        const l = String(left || '');
        const r = String(right || '');
        const space = Math.max(1, LINE_LEN - l.length - r.length);
        return l + ' '.repeat(space) + r;
      };

      let t = '';
      // Reset obrigatório no início
      t += COMMANDS.INIT;
      t += COMMANDS.NORMAL;
      t += COMMANDS.BOLD_OFF;
      t += COMMANDS.INVERT_OFF;

      // Cabeçalho (fonte normal)
      t += COMMANDS.ALIGN_CENTER;
      t += COMMANDS.INVERT_ON + COMMANDS.BOLD_ON + centerLine('VIA ENTREGADOR / EXPEDICAO') + '\n' + COMMANDS.BOLD_OFF + COMMANDS.INVERT_OFF;
      if (company?.name) t += centerLine(company.name) + '\n';
      t += '='.repeat(LINE_LEN) + '\n';

      // Pedido (1 linha com double height e reset imediato)
      t += COMMANDS.ALIGN_CENTER;
      t += COMMANDS.DOUBLE_HEIGHT_ON + COMMANDS.BOLD_ON;
      t += centerLine('PEDIDO #' + orderNum) + '\n';
      t += COMMANDS.NORMAL + COMMANDS.BOLD_OFF;

      if (order.customer_name) t += centerLine(truncate(order.customer_name, LINE_LEN)) + '\n';
      t += 'Data: ' + new Date(order.created_at).toLocaleString('pt-BR') + '\n';
      t += '-'.repeat(LINE_LEN) + '\n';
      t += COMMANDS.ALIGN_LEFT;

      for (const it of (items || [])) {
        const qty = it.quantity || it.qty || 1;
        const unitCents = it.unit_price_cents != null ? it.unit_price_cents : (it.unit_price != null ? Math.round(Number(it.unit_price) * 100) : 0);
        const totalCents = it.total_price_cents != null ? it.total_price_cents : (qty * unitCents);
        const priceStr = money(totalCents);
        const qtyStr = String(qty) + 'x ';
        const nameMax = Math.max(8, LINE_LEN - qtyStr.length - priceStr.length);
        const name = truncate((it.product_name || '').toUpperCase(), nameMax);
        t += lineRow(qtyStr + name, priceStr) + '\n';

        if (it.selected_options_json) {
          try {
            const opts = typeof it.selected_options_json === 'string' ? JSON.parse(it.selected_options_json) : it.selected_options_json;
            const groups = opts.selected_options || (Array.isArray(opts) ? opts : []);
            for (const g of groups) {
              if (g.items && Array.isArray(g.items)) {
                for (const opt of g.items) {
                  const label = sanitize(opt.label || opt.name || '');
                  if (label) t += '   + ' + (opt.quantity || 1) + 'x ' + truncate(label, LINE_LEN - 8) + '\n';
                }
              } else if (g.selectedOptions) {
                for (const s of g.selectedOptions) t += '   > ' + truncate(sanitize(s.name), LINE_LEN - 5) + '\n';
              }
            }
          } catch (e) {}
        }
        if (it.notes) t += '   OBS: ' + truncate(it.notes, LINE_LEN - 8) + '\n';
      }

      const totalCents = order.total_amount_cents != null ? order.total_amount_cents : (order.total_amount != null ? Math.round(Number(order.total_amount) * 100) : null);
      if (totalCents != null) {
        t += '='.repeat(LINE_LEN) + '\n';
        t += COMMANDS.BOLD_ON + lineRow('TOTAL:', money(totalCents)) + '\n' + COMMANDS.BOLD_OFF;
      }

      // Reset obrigatório no final
      t += COMMANDS.ALIGN_CENTER + 'Impresso: ' + new Date().toLocaleString('pt-BR') + '\n';
      t += COMMANDS.INIT;
      t += COMMANDS.ALIGN_LEFT + '\n\n\n';

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
  let q = supabase.from('print_job_queue').select('*').eq('status', 'pending').in('job_type', ['order', 'full_order', 'table_bill', 'sommelier_ticket', 'rotisseur_ticket']).order('created_at').limit(10);
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

const HTML_PAGE = \`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Zoopi Print Agent</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; background: #0f172a; color: #e2e8f0; min-height: 100vh; }
    .container { max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { text-align: center; margin-bottom: 30px; color: #22c55e; }
    .card { background: #1e293b; border-radius: 12px; padding: 24px; margin-bottom: 20px; }
    .card h2 { color: #94a3b8; font-size: 14px; text-transform: uppercase; margin-bottom: 16px; }
    .status { display: flex; align-items: center; gap: 12px; padding: 16px; background: #0f172a; border-radius: 8px; margin-bottom: 16px; }
    .status-dot { width: 12px; height: 12px; border-radius: 50%; }
    .status-dot.running { background: #22c55e; box-shadow: 0 0 10px #22c55e; }
    .status-dot.stopped { background: #ef4444; }
    .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    .stat { background: #0f172a; padding: 12px; border-radius: 8px; text-align: center; }
    .stat-value { font-size: 24px; font-weight: bold; color: #22c55e; }
    .stat-label { font-size: 12px; color: #64748b; }
    .form-group { margin-bottom: 16px; }
    label { display: block; font-size: 14px; color: #94a3b8; margin-bottom: 6px; }
    input, select { width: 100%; padding: 12px; background: #0f172a; border: 1px solid #334155; border-radius: 8px; color: #e2e8f0; }
    input:focus, select:focus { outline: none; border-color: #22c55e; }
    .row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .btn { padding: 14px 24px; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; width: 100%; }
    .btn-primary { background: #22c55e; color: #0f172a; }
    .btn-danger { background: #ef4444; color: white; }
    .btn-secondary { background: #334155; color: #e2e8f0; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .actions { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 20px; }
    .error { background: #7f1d1d; color: #fca5a5; padding: 12px; border-radius: 8px; margin-bottom: 16px; }
    .port-info { background: #064e3b; color: #6ee7b7; padding: 12px; border-radius: 8px; margin-bottom: 16px; text-align: center; font-weight: 600; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🖨️ Zoopi Print Agent v2</h1>
    <div class="port-info" id="portInfo">Porta: carregando...</div>
    <div class="card">
      <h2>Status</h2>
      <div class="status">
        <div class="status-dot" id="statusDot"></div>
        <div><div id="statusText" style="font-weight: 600;"></div><div id="statusSince" style="font-size: 12px; color: #64748b;"></div></div>
      </div>
      <div class="stats">
        <div class="stat"><div class="stat-value" id="printed">0</div><div class="stat-label">Impressos</div></div>
        <div class="stat"><div class="stat-value" id="failed" style="color: #ef4444;">0</div><div class="stat-label">Falhas</div></div>
        <div class="stat"><div class="stat-value" id="lastPrint">-</div><div class="stat-label">Última</div></div>
      </div>
      <div id="errorBox" class="error" style="display: none; margin-top: 16px;"></div>
    </div>
    <div class="card">
      <h2>Impressora</h2>
      <div class="form-group"><label>Tipo</label><select id="printerType"><option value="network">Rede (TCP/IP)</option><option value="usb">USB (Windows)</option></select></div>
      <div id="networkConfig"><div class="row"><div class="form-group"><label>IP da Impressora</label><input type="text" id="printerHost" placeholder="192.168.1.100"></div><div class="form-group"><label>Porta</label><input type="number" id="printerPort" placeholder="9100"></div></div></div>
      <div id="usbConfig" style="display: none;"><div class="form-group"><label>Nome da Impressora</label><select id="printerName"><option value="">Carregando...</option></select></div></div>
      <button class="btn btn-secondary" onclick="testPrinter()">🔌 Testar Conexão</button>
    </div>
    <div class="card">
      <h2>Configurações</h2>
      <div class="row"><div class="form-group"><label>Cópias</label><input type="number" id="copies" min="1" max="5" value="1"></div><div class="form-group"><label>Codificação</label><select id="encoding"><option value="cp860">CP860</option><option value="cp850">CP850</option><option value="utf8">UTF-8</option></select></div></div>
      <div class="row"><div class="form-group"><label><input type="checkbox" id="beepOnPrint" checked> Beep ao imprimir</label></div><div class="form-group"><label><input type="checkbox" id="cutAfterPrint" checked> Cortar papel</label></div></div>
    </div>
    <div class="actions"><button class="btn btn-primary" id="btnStart" onclick="startAgent()">▶️ INICIAR</button><button class="btn btn-danger" id="btnStop" onclick="stopAgent()" disabled>⏹ PARAR</button></div>
  </div>
  <script>
    async function api(e,m="GET",b){const r=await fetch("/api/"+e,{method:m,headers:{"Content-Type":"application/json"},body:b?JSON.stringify(b):undefined});return r.json();}
    async function loadStatus(){const s=await api("status");document.getElementById("portInfo").textContent="Porta: "+s.port;document.getElementById("statusDot").className="status-dot "+(s.isRunning?"running":"stopped");document.getElementById("statusText").textContent=s.isRunning?"Rodando":"Parado";document.getElementById("statusSince").textContent=s.started?"Desde "+new Date(s.started).toLocaleString("pt-BR"):"";document.getElementById("printed").textContent=s.printed;document.getElementById("failed").textContent=s.failed;document.getElementById("lastPrint").textContent=s.lastPrint?new Date(s.lastPrint).toLocaleTimeString("pt-BR"):"-";document.getElementById("btnStart").disabled=s.isRunning;document.getElementById("btnStop").disabled=!s.isRunning;if(s.lastError){document.getElementById("errorBox").textContent=s.lastError;document.getElementById("errorBox").style.display="block";}else{document.getElementById("errorBox").style.display="none";}}
    async function loadConfig(){const c=await api("config");document.getElementById("printerType").value=c.printerType||"network";document.getElementById("printerHost").value=c.printerHost||"";document.getElementById("printerPort").value=c.printerPort||9100;document.getElementById("copies").value=c.copies||1;document.getElementById("encoding").value=c.encoding||"cp860";document.getElementById("beepOnPrint").checked=c.beepOnPrint!==false;document.getElementById("cutAfterPrint").checked=c.cutAfterPrint!==false;togglePrinterType();}
    async function loadPrinters(){const p=await api("printers");document.getElementById("printerName").innerHTML=p.map(x=>"<option value=\\""+x+"\\">"+x+"</option>").join("");}
    function togglePrinterType(){const t=document.getElementById("printerType").value;document.getElementById("networkConfig").style.display=t==="network"?"block":"none";document.getElementById("usbConfig").style.display=t==="usb"?"block":"none";}
    async function saveConfig(){return api("config","POST",{printerType:document.getElementById("printerType").value,printerHost:document.getElementById("printerHost").value,printerPort:parseInt(document.getElementById("printerPort").value)||9100,printerName:document.getElementById("printerName").value,copies:parseInt(document.getElementById("copies").value)||1,encoding:document.getElementById("encoding").value,beepOnPrint:document.getElementById("beepOnPrint").checked,cutAfterPrint:document.getElementById("cutAfterPrint").checked});}
    async function testPrinter(){await saveConfig();const r=await api("test-printer","POST");alert(r.success?"✓ Impressora conectada!":"✗ Falha: "+r.error);}
    async function startAgent(){await saveConfig();const r=await api("start","POST");if(!r.success)alert("Erro: "+r.message);loadStatus();}
    async function stopAgent(){await api("stop","POST");loadStatus();}
    document.getElementById("printerType").addEventListener("change",togglePrinterType);loadConfig();loadStatus();loadPrinters();setInterval(loadStatus,5000);
  </script>
</body>
</html>\`;

// Tenta iniciar em várias portas
function tryListen(server, ports, index = 0) {
  if (index >= ports.length) {
    console.error('ERRO: Não foi possível iniciar em nenhuma porta.');
    process.exit(1);
  }
  const port = ports[index];
  server.listen(port, '0.0.0.0', () => {
    usedPort = port;
    console.log('');
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║           ZOOPI PRINT AGENT v2.0                          ║');
    console.log('╠═══════════════════════════════════════════════════════════╣');
    console.log('║  Acesse: http://localhost:' + port + '                         ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log('');
    if (config.supabaseUrl && config.supabaseKey && config.companyId) { 
      console.log('Configuração encontrada, iniciando automaticamente...'); 
      startAgent(); 
    } else { 
      console.log('Configure pelo navegador e clique em INICIAR.'); 
    }
  });
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log('Porta ' + port + ' em uso, tentando ' + ports[index + 1] + '...');
      server.removeAllListeners('error');
      tryListen(server, ports, index + 1);
    } else {
      console.error('ERRO:', err.message);
      process.exit(1);
    }
  });
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const url = new URL(req.url || '/', 'http://localhost');

  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, running: stats.isRunning, port: usedPort }));
    return;
  }

  if (url.pathname === '/test-connection' && req.method === 'POST') {
    let b = '';
    req.on('data', c => b += c);
    req.on('end', async () => {
      try {
        const body = b ? JSON.parse(b) : {};
        const r = await testNetworkPrinter(String(body.host || ''), Number(body.port || 9100));
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
        const prevHost = config.printerHost;
        const prevPort = config.printerPort;
        config.printerHost = String(body.host || '');
        config.printerPort = Number(body.port || 9100);
        await printToNetwork(String(body.content || ''), { copies: Number(body.copies || 1), cut: body.cut !== false, beep: body.beep === true });
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
        const ticket = body.ticket || {};
        let content = '';
        content += '*** ' + String(ticket.sectorName || 'COZINHA') + ' ***\\n';
        content += 'PEDIDO: ' + String(ticket.orderNumber || '') + '\\n';
        if (ticket.orderType) content += 'TIPO: ' + String(ticket.orderType) + '\\n';
        if (ticket.customerName) content += 'CLIENTE: ' + String(ticket.customerName) + '\\n';
        if (ticket.tableName) content += 'MESA: ' + String(ticket.tableName) + '\\n';
        content += '-'.repeat(42) + '\\n';
        const items = Array.isArray(ticket.items) ? ticket.items : [];
        for (const it of items) {
          content += Number(it.quantity || 1) + 'x ' + String(it.name || '') + '\\n';
          const opts = Array.isArray(it.options) ? it.options : [];
          for (const o of opts) content += '  > ' + String(o) + '\\n';
          if (it.notes) content += '  OBS: ' + String(it.notes) + '\\n';
        }
        if (ticket.notes) content += '-'.repeat(42) + '\\nOBS: ' + String(ticket.notes) + '\\n';
        content += '\\n\\n\\n';
        const prevHost = config.printerHost;
        const prevPort = config.printerPort;
        config.printerHost = String(body.host || '');
        config.printerPort = Number(body.port || 9100);
        await printToNetwork(content, { copies: Number(body.copies || 1), cut: true, beep: body.beep === true });
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

  if (url.pathname === '/' || url.pathname === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(HTML_PAGE);
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    res.setHeader('Content-Type', 'application/json');
    const ep = url.pathname.replace('/api/', '');
    if (ep === 'status') { res.end(JSON.stringify({ ...stats, port: usedPort })); }
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
tryListen(server, PORTS);

process.on('SIGINT', () => { stopAgent(); process.exit(0); });
`;

export function downloadPrintAgentPortable(companyId: string, supabaseUrl: string, supabaseKey: string) {
  const configJson = JSON.stringify({
    supabaseUrl,
    supabaseKey,
    companyId,
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
  "version": "2.0.0",
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

  // Script único que faz TUDO: baixa Node portátil se necessário e roda o agente
  const iniciarBat = `@echo off
chcp 65001 >nul
title Zoopi Print Agent v2
cd /d "%~dp0"
color 0A

echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║           ZOOPI PRINT AGENT v2.0                          ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.

:: Verifica se já tem Node.js portátil baixado
if exist "node\\node.exe" goto :run_agent

:: Tenta usar Node.js do sistema primeiro
where node >nul 2>nul
if %errorlevel% equ 0 (
    echo Usando Node.js do sistema...
    goto :run_with_system_node
)

:: Se não tem Node, baixa versão portátil
echo Node.js não encontrado. Baixando versão portátil...
echo Isso pode levar alguns minutos na primeira vez.
echo.

:: Cria pasta temporária
if not exist "temp" mkdir temp

:: Baixa Node.js portátil (versão LTS)
echo Baixando Node.js 20.x (LTS)...
powershell -Command "& { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.18.1/node-v20.18.1-win-x64.zip' -OutFile 'temp\\node.zip' }" 2>nul

if not exist "temp\\node.zip" (
    echo.
    echo ERRO: Não foi possível baixar o Node.js.
    echo Verifique sua conexão com a internet.
    echo.
    echo Alternativa: Baixe manualmente em https://nodejs.org/
    pause
    exit /b 1
)

echo Extraindo...
powershell -Command "Expand-Archive -Path 'temp\\node.zip' -DestinationPath 'temp' -Force" 2>nul

:: Move para pasta node
if exist "temp\\node-v20.18.1-win-x64" (
    move "temp\\node-v20.18.1-win-x64" "node" >nul 2>nul
)

:: Limpa temp
rd /s /q temp 2>nul

if not exist "node\\node.exe" (
    echo ERRO: Falha ao extrair Node.js
    pause
    exit /b 1
)

echo Node.js instalado com sucesso!
echo.

:run_agent
:: Usa Node.js portátil
set "PATH=%~dp0node;%PATH%"
set "NODE_PATH=%~dp0node\\node_modules"

:: Instala dependências se necessário
if not exist "node_modules" (
    echo Instalando dependências...
    call "%~dp0node\\npm.cmd" install --silent
    if %errorlevel% neq 0 (
        echo ERRO: Falha ao instalar dependências.
        pause
        exit /b 1
    )
    echo.
)

echo Iniciando agente de impressão...
echo.

:: Abre navegador e inicia agente
start "" http://localhost:3848
"%~dp0node\\node.exe" agent.js
goto :end

:run_with_system_node
:: Instala dependências se necessário
if not exist "node_modules" (
    echo Instalando dependências...
    call npm install --silent
    if %errorlevel% neq 0 (
        echo ERRO: Falha ao instalar dependências.
        pause
        exit /b 1
    )
    echo.
)

echo Iniciando agente de impressão...
echo.

:: Abre navegador e inicia agente
start "" http://localhost:3848
node agent.js

:end
echo.
echo Agente encerrado.
pause
`;

  const readme = `# Zoopi Print Agent v2.0

Agente de impressão automática para impressoras térmicas.
VERSÃO PORTÁTIL - Funciona sem instalação de Node.js!

## Como Usar (Super Fácil!)

1. Execute o arquivo "INICIAR.bat" (duplo clique)
2. Na primeira vez, ele vai baixar o Node.js automaticamente (~25MB)
3. O navegador vai abrir com o painel de configuração
4. Configure o IP da impressora e clique INICIAR

## Arquivos

- INICIAR.bat - Clique aqui para iniciar!
- agent.js - Código do agente
- agent-config.json - Configurações (já preenchido)
- package.json - Dependências

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

### Navegador não abre
- Acesse manualmente: http://localhost:3848
- Ou tente: http://localhost:3847

### Caracteres estranhos
- Altere a codificação para CP850 ou UTF-8

### Download do Node.js falha
- Verifique sua conexão com a internet
- Tente baixar manualmente em https://nodejs.org/`;

  // Baixa cada arquivo separadamente
  const files = [
    { name: 'agent.js', content: AGENT_CODE_PORTABLE },
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
