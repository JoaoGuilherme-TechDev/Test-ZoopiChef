/**
 * Table Pre-Bill Print
 * Generates a pre-bill for table payment review before closing.
 *
 * Preferência:
 * - Se existir "Impressora padrão" (company.default_printer), imprime via serviço local (Rede TCP/IP) sem abrir diálogo.
 * - Caso contrário, cai no window.print (abre diálogo do navegador).
 */
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/lib/supabase-shim';
import { isNetworkPrintServiceAvailable, printToNetwork } from './NetworkPrintService';
import { isPrintAgentRunning } from './PrintAgentHealth';
import { generateTrackingSection, uint8ArrayToBase64 } from './bitmapEscPos';
import { toPng } from 'html-to-image';
import { createReceiptBitmap } from './receiptBitmapPrint';

export interface TableBillItem {
  product_name: string;
  quantity: number;
  unit_price_cents: number;
  total_price_cents: number;
  notes?: string | null;
  command_name?: string | null;
  command_number?: number | null;
}

export interface TableBillCommand {
  id: string;
  name: string | null;
  number: number | null;
  items: TableBillItem[];
  total_cents: number;
}

export interface TableBillData {
  tableNumber: number;
  tableName?: string | null;
  companyName: string;
  openedAt: string;
  commands: TableBillCommand[];
  subtotalCents: number;
  surchargeCents?: number;
  discountCents?: number;
  totalCents: number;
  // Para rastreio/expedição
  trackingUrl?: string | null;
  tableSessionId?: string | null;
}

export function generateTableBillHTML(data: TableBillData): string {
  // Avoid locale-dependent spacing (NBSP) that can render as invalid chars on some printers.
  const formatCurrency = (cents: number) => {
    const safe = Number.isFinite(cents) ? cents : 0;
    const value = (safe / 100).toFixed(2).replace('.', ',');
    return `R$ ${value}`;
  };

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR });
  };

  const calculateElapsedTime = (openedAt: string) => {
    const opened = new Date(openedAt).getTime();
    const now = Date.now();
    const totalSeconds = Math.floor((now - opened) / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}min`;
    }
    return `${minutes}min`;
  };

  const printTime = format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR });

  // Collect all items from all commands into a single list with command info
  const allItems: Array<{
    quantity: number;
    product_name: string;
    total_price_cents: number;
    notes?: string | null;
    command_label: string;
  }> = [];

  data.commands.forEach(cmd => {
    const cmdLabel = cmd.name || `Comanda #${cmd.number || '?'}`;
    cmd.items.forEach(item => {
      allItems.push({
        quantity: item.quantity,
        product_name: item.product_name,
        total_price_cents: item.total_price_cents,
        notes: item.notes,
        command_label: cmdLabel,
      });
    });
  });

  // Generate items HTML - tabela tabulada com colunas alinhadas
  const itemsHtml = allItems.length > 0 
    ? `<table class="items-table">
        <thead>
          <tr>
            <th class="col-qty">Qtd</th>
            <th class="col-name">Item</th>
            <th class="col-price">Valor</th>
          </tr>
        </thead>
        <tbody>
          ${allItems.map(item => `
            <tr>
              <td class="col-qty">${item.quantity}x</td>
              <td class="col-name">${item.product_name}${item.notes ? `<br><small class="obs">${item.notes}</small>` : ''}</td>
              <td class="col-price">${formatCurrency(item.total_price_cents)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>`
    : '<p style="text-align:center;">Nenhum item</p>';

  // Comanda info (show first command if exists)
  const primaryCommand = data.commands[0];
  const comandaText = primaryCommand 
    ? (primaryCommand.name 
        ? `${primaryCommand.name} - COMANDA #${primaryCommand.number || '?'}`
        : `COMANDA #${primaryCommand.number || '?'}`)
    : '';

  // Calculate taxa/desconto
  const taxaDesconto = (data.surchargeCents || 0) - (data.discountCents || 0);

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pre-Conta - Mesa ${data.tableNumber}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    html, body {
      width: 100%;
      height: 100%;
      background: #fff;
    }
    body {
      font-family: 'Courier New', 'Courier', monospace;
      font-size: 16px;
      line-height: 1.3;
      color: #000;
      padding: 0;
      margin: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .ticket-container {
      width: 80mm;
      margin: 0 auto;
      padding: 5mm;
      background: #fff;
      font-size: 16px;
    }
    .empresa-nome {
      font-size: 32px;
      font-weight: bold;
      text-align: center;
      margin: 10px 0;
      letter-spacing: 1px;
    }
    .separador {
      border-top: 2px solid #000;
      margin: 8px 0;
    }
    .separador-pontilhado {
      border-top: 1px dashed #000;
      margin: 8px 0;
    }
    .bloco-preconta {
      background-color: #000;
      color: #fff !important;
      padding: 10px 5px;
      text-align: center;
      font-weight: bold;
      font-size: 18px;
      margin: 8px 0;
    }
    .bloco-preconta * {
      color: #fff !important;
    }
    .mesa-comanda-container {
      text-align: center;
      margin: 15px 0;
    }
    .mesa-titulo {
      font-size: 24px;
      font-weight: bold;
      margin-bottom: 5px;
    }
    .mesa-numero {
      font-size: 28px;
      font-weight: bold;
      margin-bottom: 10px;
    }
    .comanda-info {
      font-size: 18px;
      font-weight: bold;
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px dashed #000;
    }
    .info-tempo {
      margin: 10px 0;
      font-size: 14px;
    }
    .linha-tempo {
      display: flex;
      justify-content: space-between;
      padding: 5px 0;
      border-bottom: 1px dotted #000;
    }
    .linha-tempo.sem-borda {
      border-bottom: none;
    }
    .label-tempo {
      font-weight: bold;
      flex: 1;
    }
    .valor-tempo {
      flex: 1;
      text-align: right;
      font-weight: bold;
      font-size: 16px;
    }
    .secao-itens {
      margin: 15px 0;
    }
    .itens-titulo {
      font-weight: bold;
      font-size: 14px;
      text-align: center;
      margin-bottom: 8px;
      border-bottom: 1px solid #000;
      padding-bottom: 4px;
    }
    /* Tabela tabulada com colunas alinhadas */
    .items-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
    }
    .items-table th, .items-table td {
      padding: 4px 2px;
      vertical-align: top;
      border-bottom: 1px dotted #ccc;
    }
    .items-table thead th {
      border-bottom: 1px solid #000;
      font-weight: bold;
      text-align: left;
    }
    .items-table .col-qty {
      width: 30px;
      text-align: center;
    }
    .items-table .col-name {
      text-align: left;
    }
    .items-table .col-price {
      width: 70px;
      text-align: right;
    }
    .items-table .obs {
      font-size: 11px;
      color: #555;
      font-style: italic;
    }
    .secao-totais {
      margin: 15px 0;
    }
    .linha-total {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      font-size: 14px;
      border-bottom: 1px dotted #000;
    }
    .linha-total.sem-borda {
      border-bottom: none;
    }
    .label-total {
      font-weight: bold;
      flex: 1;
    }
    .valor-total {
      flex: 1;
      text-align: right;
      font-weight: bold;
      font-size: 16px;
    }
    .total-grande {
      background-color: #000;
      color: #fff !important;
      padding: 12px 5px;
      display: flex;
      justify-content: space-between;
      font-weight: bold;
      font-size: 22px;
      margin: 10px 0;
    }
    .total-grande * {
      color: #fff !important;
    }
    .footer {
      text-align: center;
      font-size: 12px;
      margin-top: 15px;
      padding-top: 10px;
      border-top: 1px dashed #000;
    }
    .footer-msg {
      margin: 5px 0;
      font-weight: bold;
      font-size: 14px;
    }
    .footer-info {
      font-size: 12px;
      margin: 3px 0;
    }
    .footer-aviso {
      font-size: 11px;
      margin: 8px 0;
      font-style: italic;
    }
    @media print {
      body { margin: 0; padding: 0; background: #fff; }
      .ticket-container { margin: 0; padding: 0; box-shadow: none; }
      @page { size: 80mm auto; margin: 0; }
    }
  </style>
</head>
<body>
  <div class="ticket-container">
    
    <!-- NOME DA EMPRESA (GRANDE E NEGRITO) -->
    <div class="empresa-nome">${data.companyName}</div>

    <div class="separador"></div>

    <!-- BLOCO PRE-CONTA -->
    <div class="bloco-preconta">*** PRE-CONTA - NAO E DOCUMENTO FISCAL ***</div>

    <div class="separador-pontilhado"></div>

    <!-- MESA E COMANDA -->
    <div class="mesa-comanda-container">
      <div class="mesa-titulo">*** MESA ***</div>
      <div class="mesa-numero">${data.tableNumber}</div>
      ${comandaText ? `<div class="comanda-info">${comandaText}</div>` : ''}
    </div>

    <div class="separador-pontilhado"></div>

    <!-- INFORMACOES DE TEMPO -->
    <div class="info-tempo">
      <div class="linha-tempo">
        <span class="label-tempo">Abertura:</span>
        <span class="valor-tempo">${formatDate(data.openedAt)}</span>
      </div>
      <div class="linha-tempo">
        <span class="label-tempo">Tempo:</span>
        <span class="valor-tempo">${calculateElapsedTime(data.openedAt)}</span>
      </div>
      <div class="linha-tempo">
        <span class="label-tempo">Comandas:</span>
        <span class="valor-tempo">${data.commands.length}</span>
      </div>
      <div class="linha-tempo sem-borda">
        <span class="label-tempo">Impresso em:</span>
        <span class="valor-tempo">${printTime}</span>
      </div>
    </div>

    <div class="separador"></div>

    <!-- ITENS DA COMANDA (TABELA TABULADA) -->
    <div class="secao-itens">
      ${itemsHtml}
    </div>

    <div class="separador"></div>

    <!-- TOTAIS -->
    <div class="secao-totais">
      <div class="linha-total">
        <span class="label-total">Subtotal:</span>
        <span class="valor-total">${formatCurrency(data.subtotalCents)}</span>
      </div>
      ${taxaDesconto !== 0 ? `
      <div class="linha-total sem-borda">
        <span class="label-total">${taxaDesconto > 0 ? 'Taxa:' : 'Desconto:'}</span>
        <span class="valor-total">${taxaDesconto > 0 ? '+' : '-'} ${formatCurrency(Math.abs(taxaDesconto))}</span>
      </div>
      ` : ''}
      
      <div class="total-grande">
        <span>TOTAL:</span>
        <span>${formatCurrency(data.totalCents)}</span>
      </div>
    </div>

    <div class="separador"></div>

    <!-- FOOTER -->
    <div class="footer">
      <div class="footer-msg">Confira os valores antes de efetuar o pagamento</div>
      <div class="footer-aviso">Obrigado pela preferencia!</div>
      <div class="footer-info">www.zoopi.app.br</div>
    </div>

  </div>
</body>
</html>
  `;
}

/**
 * Raster (bitmap) print: render the HTML and convert to GS v 0 commands.
 * This guarantees 1:1 layout fidelity ("tabulado") across printers.
 */
async function buildTableBillRasterEscPosBase64(data: TableBillData): Promise<string> {
  const html = generateTableBillHTML(data);

  // Render HTML in an isolated iframe to capture computed layout
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.opacity = '0';
  iframe.setAttribute('aria-hidden', 'true');

  const cleanup = () => {
    try {
      iframe.remove();
    } catch {
      // ignore
    }
  };

  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  if (!doc) {
    cleanup();
    throw new Error('Não foi possível criar documento de renderização para pré-conta.');
  }

  doc.open();
  doc.write(html);
  doc.close();

  // Wait layout + fonts to settle
  await new Promise((r) => setTimeout(r, 350));

  const body = iframe.contentDocument?.body as unknown as HTMLElement | null;
  if (!body) {
    cleanup();
    throw new Error('Não foi possível acessar o body da pré-conta para rasterizar.');
  }

  // Important: inline images can break canvas capture if they 404; our HTML hides logo on error.
  const pngDataUrl = await toPng(body, {
    cacheBust: true,
    pixelRatio: 2,
    backgroundColor: '#ffffff',
  });

  cleanup();

  const bitmap = await createReceiptBitmap(pngDataUrl, 80);
  if (!bitmap.success || !bitmap.rawEscPosBase64) {
    throw new Error(bitmap.error || 'Falha ao gerar bitmap ESC/POS da pré-conta.');
  }

  return bitmap.rawEscPosBase64;
}

export function isTcpPrinterAddress(printer?: string | null): boolean {
  const parsed = printer ? parsePrinterAddress(printer) : null;
  return Boolean(parsed && parsed.kind === 'tcp');
}

type ParsedPrinterAddress =
  | { kind: 'tcp'; host: string; port: number }
  | { kind: 'usb'; name: string };

function parsePrinterAddress(printer: string): ParsedPrinterAddress | null {
  const trimmed = printer.trim();
  if (!trimmed) return null;

  // Se tiver ":" assume tentativa de TCP (host:porta)
  const hasColon = trimmed.includes(':');
  const [hostRaw, portRaw] = hasColon ? trimmed.split(':') : [trimmed, undefined];

  const host = String(hostRaw || '').trim();
  const port = portRaw ? Number(portRaw) : 9100;

  if (!host) return null;

  // Valida porta apenas quando é TCP
  if (hasColon && (Number.isNaN(port) || port <= 0)) return null;

  // Host TCP válido: IPv4, localhost ou hostname com ponto (ex: printer.local)
  const isValidTcpHost =
    /^(\d{1,3}\.){3}\d{1,3}$/.test(host) ||
    host === 'localhost' ||
    host.includes('.');

  if (isValidTcpHost) {
    return { kind: 'tcp', host, port };
  }

  // Caso contrário, tratamos como impressora USB/Windows pelo nome
  // Ex: "Caixa", "EPSON TM-T20", etc.
  return { kind: 'usb', name: trimmed };
}

/**
 * Sanitize text for ESC/POS (no diacritics, ASCII only)
 */
function sanitizeEscPosText(input: unknown): string {
  const str = input == null ? '' : String(input);
  
  // Remove diacritics
  const withoutDiacritics = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  // Replace common symbols
  const withReplacements = withoutDiacritics
    .replace(/[–—]/g, '-')
    .replace(/['']/g, "'")
    .replace(/[""]/g, '"')
    .replace(/[°º]/g, 'o')
    .replace(/[ª]/g, 'a')
    .replace(/[€]/g, 'EUR')
    .replace(/[£]/g, 'GBP')
    .replace(/[¥]/g, 'JPY');
    
  // Keep only printable ASCII (0x20-0x7E) plus LF/CR
  return withReplacements.replace(/[^\x0A\x0D\x20-\x7E]/g, '');
}

/**
 * Format currency as pure ASCII (no NBSP, no locale issues)
 */
function formatCurrencyEscPos(cents: number): string {
  const safe = Number.isFinite(cents) ? cents : 0;
  const value = (safe / 100).toFixed(2).replace('.', ',');
  return `R$ ${value}`;
}

/**
 * Format key-value line with right-aligned value (fits 48 columns)
 */
function lineKeyValueEscPos(left: string, right: string, width = 48): string {
  const l = sanitizeEscPosText(left);
  const r = sanitizeEscPosText(right);
  const available = Math.max(1, width - r.length);
  const leftTrimmed = l.length > available ? l.slice(0, available) : l;
  const padding = Math.max(1, width - leftTrimmed.length - r.length);
  return leftTrimmed + ' '.repeat(padding) + r + '\n';
}

function buildTableBillEscPos(data: TableBillData): string {
  // ============================================================
  // LAYOUT ESTILO PEDIDO COZINHA - Conforme imagem de referência
  // Perfil: 80mm / Fonte A / 48 colunas
  // ============================================================
  const ESC = '\x1B';
  const GS = '\x1D';
  const CMD = {
    INIT: ESC + '@',
    BOLD_ON: ESC + 'E' + '\x01',
    BOLD_OFF: ESC + 'E' + '\x00',
    NORMAL: GS + '!' + '\x00',
    DOUBLE_HEIGHT: GS + '!' + '\x01',
    DOUBLE_WIDTH: GS + '!' + '\x10',
    DOUBLE_BOTH: GS + '!' + '\x11',
    INVERT_ON: GS + 'B' + '\x01',
    INVERT_OFF: GS + 'B' + '\x00',
    ALIGN_CENTER: ESC + 'a' + '\x01',
    ALIGN_LEFT: ESC + 'a' + '\x00',
  };

  const LINE_WIDTH = 48;
  const currency = (cents: number) => formatCurrencyEscPos(cents);
  const SEP_SOLID = '-'.repeat(LINE_WIDTH);
  const SEP_DOTS = '.'.repeat(LINE_WIDTH);

  // Helper: center text
  const center = (text: string, width = LINE_WIDTH) => {
    const s = sanitizeEscPosText(text);
    if (s.length >= width) return s.slice(0, width);
    const left = Math.floor((width - s.length) / 2);
    return ' '.repeat(left) + s;
  };

  // Helper: truncate
  const truncate = (text: string, width: number) => {
    const s = sanitizeEscPosText(text).replace(/\s+/g, ' ').trim();
    if (s.length <= width) return s;
    if (width <= 3) return s.slice(0, width);
    return s.slice(0, width - 2).trimEnd() + '..';
  };

  // Helper: unify items
  const unifyItems = (items: TableBillData['commands'][0]['items']) => {
    const map = new Map<string, typeof items[0]>();
    for (const item of items) {
      const key = `${item.product_name}|||${item.notes || ''}`;
      const existing = map.get(key);
      if (existing) {
        existing.quantity += item.quantity;
        existing.total_price_cents += item.total_price_cents;
      } else {
        map.set(key, { ...item });
      }
    }
    return Array.from(map.values());
  };

  let ticket = '';

  // ===== INIT =====
  ticket += CMD.INIT;
  ticket += CMD.NORMAL;
  ticket += '\n';

  // ===== NOME DA EMPRESA (simples, centralizado) =====
  ticket += CMD.ALIGN_CENTER;
  ticket += CMD.BOLD_ON;
  const companyClean = sanitizeEscPosText(data.companyName || 'ZOOPI').toUpperCase();
  ticket += companyClean + '\n';
  ticket += CMD.BOLD_OFF;
  ticket += '\n';

  // ===== BLOCO PRE-CONTA (invertido) =====
  ticket += CMD.INVERT_ON;
  ticket += CMD.BOLD_ON;
  ticket += center('  PRE-CONTA  ') + '\n';
  ticket += CMD.BOLD_OFF;
  ticket += CMD.INVERT_OFF;
  ticket += '\n';

  // ===== MESA COM ESTRELAS (invertido, double height) =====
  ticket += CMD.DOUBLE_HEIGHT;
  ticket += CMD.INVERT_ON;
  ticket += CMD.BOLD_ON;
  const mesaText = `*** MESA ${data.tableNumber} ***`;
  ticket += center(`  ${mesaText}  `) + '\n';
  ticket += CMD.BOLD_OFF;
  ticket += CMD.INVERT_OFF;
  ticket += CMD.NORMAL;
  ticket += '\n';

  // ===== INFO LINHAS =====
  ticket += CMD.ALIGN_LEFT;
  ticket += 'TIPO RECEBIMENTO: MESA\n';

  const openedTime = format(new Date(data.openedAt), 'HH:mm', { locale: ptBR });
  ticket += `HORA PEDIDO: ${openedTime}\n`;
  ticket += 'PREVISAO: A DEFINIR\n';
  
  ticket += SEP_DOTS + '\n';

  // ===== CLIENTE / COMANDA =====
  const primaryCmd = data.commands[0];
  const comandaNum = primaryCmd?.number ?? 1;
  ticket += CMD.BOLD_ON;
  ticket += `CLIENTE: MESA ${data.tableNumber} - COMANDA #${comandaNum}\n`;
  ticket += CMD.BOLD_OFF;
  ticket += '\n';

  // ===== OBSERVAÇÕES HEADER (invertido) =====
  ticket += CMD.ALIGN_CENTER;
  ticket += CMD.INVERT_ON;
  ticket += CMD.BOLD_ON;
  ticket += center('  OBSERVACOES  ') + '\n';
  ticket += CMD.BOLD_OFF;
  ticket += CMD.INVERT_OFF;
  ticket += '\n';

  // ===== COMANDAS =====
  for (let i = 0; i < (data.commands || []).length; i++) {
    const cmd = data.commands[i];
    const cmdTitle = cmd.name
      ? sanitizeEscPosText(cmd.name).toUpperCase()
      : `COMANDA #${cmd.number ?? (i + 1)}`;

    ticket += CMD.ALIGN_LEFT;
    ticket += CMD.BOLD_ON;
    ticket += cmdTitle + '\n';
    ticket += CMD.BOLD_OFF;
    ticket += SEP_DOTS + '\n';

    // ITENS header
    ticket += 'ITENS:\n';

    const groupedItems = unifyItems(cmd.items || []);

    for (const item of groupedItems) {
      const qtyStr = `${item.quantity}x`;
      const priceStr = currency(item.total_price_cents);
      const nameWidth = Math.max(10, LINE_WIDTH - qtyStr.length - priceStr.length - 2);
      const nameSingle = truncate(String(item.product_name || ''), nameWidth);

      ticket += qtyStr + ' ' + nameSingle.padEnd(nameWidth) + ' ' + priceStr + '\n';

      // Observações do item (indentadas)
      if (item.notes) {
        const notes = sanitizeEscPosText(item.notes);
        const noteLines = notes.split('\n');
        for (const noteLine of noteLines) {
          ticket += '  ' + truncate(noteLine, LINE_WIDTH - 2) + '\n';
        }
      }
    }

    ticket += '\n';
  }

  // ===== LINHA SÓLIDA =====
  ticket += SEP_SOLID + '\n';

  // ===== SUBTOTAL =====
  ticket += lineKeyValueEscPos('Subtotal:', currency(data.subtotalCents), LINE_WIDTH);

  // ===== TOTAL (bloco invertido) =====
  ticket += '\n';
  ticket += CMD.ALIGN_CENTER;
  ticket += CMD.INVERT_ON;
  ticket += CMD.BOLD_ON;
  const totalLine = `TOTAL:${' '.repeat(20)}${currency(data.totalCents)}`;
  ticket += center(totalLine) + '\n';
  ticket += CMD.BOLD_OFF;
  ticket += CMD.INVERT_OFF;
  ticket += CMD.ALIGN_LEFT;
  ticket += '\n';

  ticket += SEP_DOTS + '\n';

  // ===== PAGAMENTO (placeholder) =====
  ticket += CMD.ALIGN_CENTER;
  ticket += CMD.BOLD_ON;
  ticket += 'Pagamento: A DEFINIR\n';
  ticket += CMD.BOLD_OFF;
  ticket += '\n';

  ticket += SEP_DOTS + '\n';

  // ===== ACOMPANHE SEU PEDIDO =====
  ticket += '\n';
  ticket += center('ACOMPANHE SEU PEDIDO') + '\n';
  ticket += '\n\n';

  // Reset final
  ticket += CMD.BOLD_OFF;
  ticket += CMD.INVERT_OFF;
  ticket += CMD.NORMAL;
  ticket += CMD.ALIGN_LEFT;

  // NÃO adiciona CUT aqui - será adicionado após o bitmap na versão async
  return ticket;
}

/**
 * Build complete table bill ESC/POS WITHOUT QR Code and Barcode.
 * Per user preference: Pré-conta (Table Pre-bill) should NOT have tracking codes.
 * Returns base64-encoded binary data ready for transmission.
 */
async function buildTableBillEscPosWithBitmap(data: TableBillData): Promise<string> {
  // Get the text portion
  const textPart = buildTableBillEscPos(data);
  
  // Convert text to bytes (Latin1 encoding for ESC/POS)
  const textBytes = new Uint8Array(textPart.length);
  for (let i = 0; i < textPart.length; i++) {
    textBytes[i] = textPart.charCodeAt(i) & 0xFF;
  }

  // PRÉ-CONTA NÃO TEM QR CODE NEM CÓDIGO DE BARRAS
  // Apenas feed para espaçamento antes do corte
  const feedBeforeCut = new Uint8Array([0x0A, 0x0A, 0x0A]); // 3 linhas de feed
  
  // Cut command
  const cutCommand = new Uint8Array([0x1D, 0x56, 0x00]); // GS V 0 (full cut)

  // Combine all parts: text + feed + cut (SEM tracking)
  const totalLength = textBytes.length + feedBeforeCut.length + cutCommand.length;
  const result = new Uint8Array(totalLength);
  result.set(textBytes, 0);
  result.set(feedBeforeCut, textBytes.length);
  result.set(cutCommand, textBytes.length + feedBeforeCut.length);

  // Convert to base64 for JSON transport
  return uint8ArrayToBase64(result);
}

function buildTableBillPlainText(data: TableBillData): string {
  const currency = (cents: number) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const line = '--------------------------------';

  const header = [
    data.companyName || 'SISTEMA',
    `MESA ${data.tableNumber}${data.tableName ? ` - ${data.tableName}` : ''}`,
    '*** PRÉ-CONTA - NÃO É DOCUMENTO FISCAL ***',
    line,
    `Abertura: ${format(new Date(data.openedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`,
    `Impresso: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`,
    line,
  ].join('\n');

  const body = data.commands
    .map((cmd) => {
      const cmdTitle = cmd.name ? cmd.name : `Comanda #${cmd.number ?? ''}`.trim();
      const itemsLines = cmd.items
        .map((it) => {
          const base = `${String(it.quantity).padStart(2, ' ')}x ${it.product_name}`;
          const price = currency(it.total_price_cents);
          const notes = it.notes ? `   - ${it.notes}` : null;
          return [base, notes, `      ${price}`].filter(Boolean).join('\n');
        })
        .join('\n');

      return [
        cmdTitle,
        `Subtotal: ${currency(cmd.total_cents)}`,
        itemsLines,
        line,
      ].join('\n');
    })
    .join('\n');

  const totals = [
    `SUBTOTAL: ${currency(data.subtotalCents)}`,
    data.surchargeCents ? `ACRÉSCIMO: +${currency(data.surchargeCents)}` : null,
    data.discountCents ? `DESCONTO: -${currency(data.discountCents)}` : null,
    `TOTAL: ${currency(data.totalCents)}`,
    '\n',
  ]
    .filter(Boolean)
    .join('\n');

  return [header, body, totals].join('\n');
}

export function printTableBillToWindow(data: TableBillData, printWindow: Window): boolean {
  try {
    const html = generateTableBillHTML(data);
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    // Trigger print immediately and also on load
    setTimeout(() => {
      try {
        printWindow.print();
      } catch {
        // ignore
      }
    }, 300);
    printWindow.onload = () => {
      try {
        printWindow.print();
      } catch {
        // ignore
      }
    };
    return true;
  } catch {
    return false;
  }
}

/**
 * Print via hidden iframe - more reliable than window.open
 */
function printViaIframe(html: string): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    try {
      console.log('[tableBill] Printing via iframe...');
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.opacity = '0';
      iframe.setAttribute('aria-hidden', 'true');

      const cleanup = () => {
        try {
          iframe.remove();
        } catch {
          // ignore
        }
      };

      iframe.onload = () => {
        const w = iframe.contentWindow;
        if (!w) {
          cleanup();
          resolve({
            success: false,
            error: 'Não foi possível acessar o contexto de impressão.',
          });
          return;
        }

        // Small delay helps fonts/layout settle before printing.
        setTimeout(() => {
          try {
            w.focus();
            w.print();
            console.log('[tableBill] Print dialog triggered successfully');
            cleanup();
            resolve({ success: true });
          } catch (e) {
            cleanup();
            resolve({
              success: false,
              error: e instanceof Error ? e.message : 'Falha ao acionar impressão',
            });
          }
        }, 200);
      };

      document.body.appendChild(iframe);

      const doc = iframe.contentDocument;
      if (!doc) {
        cleanup();
        resolve({
          success: false,
          error: 'Não foi possível criar o documento de impressão.',
        });
        return;
      }

      doc.open();
      doc.write(html);
      doc.close();

      // Safety timeout in case onload doesn't fire.
      setTimeout(() => {
        const w = iframe.contentWindow;
        if (!w) return;
        try {
          w.focus();
          w.print();
          cleanup();
          resolve({ success: true });
        } catch (e) {
          cleanup();
          resolve({
            success: false,
            error: e instanceof Error ? e.message : 'Timeout ao tentar imprimir',
          });
        }
      }, 2500);
    } catch (e) {
      resolve({
        success: false,
        error: e instanceof Error ? e.message : 'Erro ao preparar impressão',
      });
    }
  });
}

/**
 * Imprime a pré-conta sem abrir a tela de impressão, usando a "Impressora padrão".
 * 
 * Prioridade:
 * 1. Tenta impressão via serviço HTTP local (porta 3848-3852)
 * 2. Se não disponível, envia para fila de impressão (print_job_queue) para o agente desktop
 * 3. Só abre diálogo do navegador se não houver impressora padrão configurada
 * 
 * IMPORTANTE: Agora enfileira jobs mesmo se o health check do agente falhar,
 * pois o health check pode falhar por motivos de CORS/mixed content enquanto
 * o agente está funcionando normalmente.
 */
export async function printTableBillDirect(
  data: TableBillData,
  defaultPrinter?: string | null,
  companyId?: string | null,
  printerConfig?: { printMode?: string; printerName?: string; printerHost?: string; printerPort?: number } | null
): Promise<{ success: boolean; error?: string; warning?: string }> {
  console.log('[tableBill] printTableBillDirect called', {
    hasDefaultPrinter: !!defaultPrinter,
    hasCompanyId: !!companyId,
    hasPrinterConfig: !!printerConfig,
    tableNumber: data.tableNumber,
  });

  // P0: impressão deve ser RAW via agente/fila (proibido window.print/iframe)
  if (!companyId) {
    return {
      success: false,
      error: 'Impressão bloqueada: backend não identificado para enfileirar a impressão.',
    };
  }

  // Gera ESC/POS em bitmap (raster) a partir do HTML tabulado.
  // Fallback: ESC/POS texto + bitmap só do tracking.
  let rawEscPosBase64: string;
  try {
    rawEscPosBase64 = await buildTableBillRasterEscPosBase64(data);
    console.log('[tableBill] Raster ESC/POS generated, base64 length:', rawEscPosBase64.length);
  } catch (e) {
    console.error('[tableBill] Failed to generate raster ESC/POS, falling back to text ESC/POS:', e);
    try {
      rawEscPosBase64 = await buildTableBillEscPosWithBitmap(data);
      console.log('[tableBill] Text+tracking ESC/POS generated, base64 length:', rawEscPosBase64.length);
    } catch (e2) {
      console.error('[tableBill] Failed to generate ESC/POS with bitmap:', e2);
      const textOnly = buildTableBillEscPos(data) + '\x1D\x56\x00'; // adiciona cut
      rawEscPosBase64 = btoa(textOnly);
    }
  }

  // Se printerConfig fornecido (e é TCP) E serviço local disponível, imprime direto
  const isNetworkPrinter = printerConfig?.printMode === 'network' && printerConfig?.printerHost;
  
  // Se tiver impressora TCP configurada E serviço local disponível, imprime direto (mais confiável que o template do agente)
  const parsed = defaultPrinter ? parsePrinterAddress(defaultPrinter) : null;
  if ((isNetworkPrinter || (parsed?.kind === 'tcp')) && printerConfig?.printMode !== 'windows') {
    try {
      const available = await isNetworkPrintServiceAvailable();
      if (available) {
        // Usa printerConfig se disponível, senão fallback para parsed
        const networkHost = printerConfig?.printerHost || (parsed?.kind === 'tcp' ? parsed.host : '');
        const networkPort = printerConfig?.printerPort || (parsed?.kind === 'tcp' ? parsed.port : 9100);
        
        // Decode base64 back to string for network print
        const rawEscPos = atob(rawEscPosBase64);
        
        const result = await printToNetwork(rawEscPos, {
          host: networkHost,
          port: networkPort,
          copies: 1,
          cut: false, // cut já está no payload
          beep: false,
        });

        if (result.success) {
          console.log('[tableBill] Printed directly via local network service', {
            host: networkHost,
            port: networkPort,
            bytes: rawEscPos.length,
          });
          return { success: true };
        }

        console.warn('[tableBill] Direct network print failed, falling back to queue:', result.error);
      }
    } catch (e) {
      console.warn('[tableBill] Direct network print exception, falling back to queue:', e);
    }
  }

  const metadata: Record<string, unknown> = {
    tableNumber: data.tableNumber,
    tableName: data.tableName,
    companyName: data.companyName,
    openedAt: data.openedAt,
    subtotalCents: data.subtotalCents,
    surchargeCents: data.surchargeCents,
    discountCents: data.discountCents,
    totalCents: data.totalCents,
    commands: data.commands,
    // Para rastreio/expedição
    trackingUrl: data.trackingUrl || null,
    tableSessionId: data.tableSessionId || null,

    // ESC/POS já está em base64
    rawEscPosBase64,
    printerProfile: { width: '80mm', columns: 48, font: 'A' },
  };

  // Se tem printerConfig, usa os dados completos (preferível)
  if (printerConfig) {
    if (printerConfig.printMode) {
      metadata.printMode = printerConfig.printMode;
    }
    if (printerConfig.printerHost) {
      metadata.printerHost = printerConfig.printerHost;
    }
    if (printerConfig.printerPort) {
      metadata.printerPort = printerConfig.printerPort;
    }
    if (printerConfig.printerName) {
      metadata.printerName = printerConfig.printerName;
    }
  } else if (defaultPrinter) {
    // Fallback: parse o defaultPrinter string
    const printer = parsePrinterAddress(defaultPrinter);
    if (printer) {
      if (printer.kind === 'tcp') {
        metadata.printerHost = printer.host;
        metadata.printerPort = printer.port;
        metadata.printMode = 'network';
      } else {
        metadata.printerName = printer.name;
        metadata.printMode = 'windows';
      }
    } else {
      metadata.printerName = defaultPrinter;
      metadata.printMode = 'windows';
    }
  }

  // Correção: quando o job é Windows/USB, o agente precisa do NOME REAL do Windows.
  // Em alguns fluxos o UI envia um "apelido" (ex.: nome do setor "Caixa") em printerConfig.printerName.
  // Se houver defaultPrinter (configurado na empresa), ele deve prevalecer.
  if (metadata.printMode === 'windows' && defaultPrinter) {
    const parsedDefault = parsePrinterAddress(defaultPrinter);
    if (parsedDefault?.kind === 'usb' && parsedDefault.name) {
      metadata.printerName = parsedDefault.name;
    } else if (!parsedDefault) {
      // Se não conseguiu parsear, ainda assim usa o defaultPrinter como nome
      metadata.printerName = defaultPrinter;
    }
  }

  // IMPORTANT: agente atual consome a fila v3
  const { error: insertError } = await supabase
    .from('print_job_queue_v3')
    .insert([
      {
        company_id: companyId,
        job_type: 'table_bill',
        status: 'pending',
        priority: 3,
        // rawEscPosBase64 já inclui QR Code e Barcode como bitmap
        raw_escpos: rawEscPosBase64,
        metadata: {
          ...metadata,
          source: 'table_bill_direct',
        },
      } as any,
    ]);

  if (insertError) {
    console.error('[tableBill] Failed to enqueue print job:', insertError);
    return {
      success: false,
      error: `Erro ao enviar para fila de impressão: ${insertError.message}`,
    };
  }

  console.log('[tableBill] Print job enqueued successfully (RAW ESC/POS with bitmap)', {
    base64Length: rawEscPosBase64.length,
    printerProfile: metadata.printerProfile,
  });

  return {
    success: true,
    warning:
      parsed?.kind === 'tcp'
        ? 'Imprimiu via fila do agente (fallback). Para imprimir direto e evitar formatação do agente, ligue o serviço local de impressão.'
        : undefined,
  };
}

export function printTableBill(data: TableBillData): boolean {
  const printWindow = window.open('', '_blank');

  if (!printWindow) {
    // Try iframe as fallback
    const html = generateTableBillHTML(data);
    printViaIframe(html);
    return true;
  }

  return printTableBillToWindow(data, printWindow);
}
