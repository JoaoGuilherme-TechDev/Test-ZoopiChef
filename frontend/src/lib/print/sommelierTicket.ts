/**
 * Sommelier Ticket Printer
 * 
 * Generates "Dica do Enólogo" (Sommelier Tip) tickets
 * for waiters with wine pairing suggestions.
 */

import { createPrintJobV3 } from '@/lib/print/v3/createPrintJobV3';

export interface SommelierTicketData {
  companyId: string;
  customerName?: string;
  customerPhone?: string;
  wine: {
    name: string;
    price: number;
  };
  pairings: Array<{
    name: string;
    price: number;
    reason?: string;
  }>;
  total: number;
  sommelierTip?: string;
  waterRecommendation?: string;
  tableName?: string;
  ticketHeaderText?: string;
}

/**
 * Format currency in BRL (ASCII-safe)
 * IMPORTANT: do NOT use Intl.NumberFormat/toLocaleString here.
 * They may emit NBSP and other non-ASCII chars that break ESC/POS.
 */
const formatCurrencyAscii = (value: number): string => {
  const cents = Math.round((Number(value) || 0) * 100);
  const abs = Math.abs(cents);
  const intPart = Math.floor(abs / 100);
  const fracPart = String(abs % 100).padStart(2, '0');
  const sign = cents < 0 ? '-' : '';
  // thousands with dot, decimal with comma (pt-BR), ASCII only
  const intStr = String(intPart).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${sign}R$ ${intStr},${fracPart}`;
};

const padCenter = (text: string, width: number): string => {
  const clean = String(text ?? '');
  const pad = Math.max(0, Math.floor((width - clean.length) / 2));
  return ' '.repeat(pad) + clean;
};

const truncateAscii = (text: string, max: number): string => {
  const s = String(text ?? '');
  return s.length > max ? s.slice(0, Math.max(0, max - 1)) + '…' : s;
};

/**
 * Remove non-ASCII chars (accents, emojis, box drawing, NBSP, etc)
 */
const sanitizeSommelierAscii = (input: string): string => {
  const str = String(input ?? '')
    .replace(/\u00A0/g, ' ') // NBSP -> space
    // remove emojis/pictographs
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, '')
    // common box-drawing -> ASCII
    .replace(/[─━]/g, '-')
    .replace(/[═]/g, '=');
  const noDia = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  // keep only printable ASCII + line breaks
  return noDia.replace(/[^\x0A\x0D\x20-\x7E]/g, '');
};

/**
 * Generate sommelier ticket content for printing
 */
export function generateSommelierTicketContent(data: SommelierTicketData): string {
  const lines: string[] = [];
  const width = 48; // 80mm thermal printer width

  const separator = '-'.repeat(width);
  const doubleSeparator = '='.repeat(width);

  // Header
  lines.push(doubleSeparator);
  lines.push(padCenter('DICA DO ENOLOGO', width));
  lines.push(padCenter(data.ticketHeaderText || 'SUGESTAO DO SOMMELIER', width));
  lines.push(doubleSeparator);
  lines.push('');

  // Customer info
  if (data.customerName || data.tableName) {
    if (data.customerName) {
      lines.push(`CLIENTE: ${data.customerName}`);
    }
    if (data.tableName) {
      lines.push(`MESA: ${data.tableName}`);
    }
    lines.push(separator);
  }

  // Sommelier tip (if provided)
  if (data.sommelierTip) {
    lines.push('');
    lines.push(padCenter('DICA DO SOMMELIER', width));
    lines.push(separator);
    // Word wrap the tip
    const words = data.sommelierTip.split(' ');
    let currentLine = '';
    for (const word of words) {
      if ((currentLine + ' ' + word).trim().length <= width) {
        currentLine = (currentLine + ' ' + word).trim();
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);
    lines.push('');
  }

  // Selected Wine
  lines.push(separator);
  lines.push(padCenter('VINHO SELECIONADO', width));
  lines.push(separator);
  lines.push(`${data.wine.name}`);
  lines.push(`${' '.repeat(width - 12)}${formatCurrencyAscii(data.wine.price).padStart(12)}`);
  lines.push('');

  // Harmonizations/Pairings
  if (data.pairings.length > 0) {
    lines.push(separator);
    lines.push(padCenter('HARMONIZACOES SUGERIDAS', width));
    lines.push(separator);
    
    for (const pairing of data.pairings) {
      lines.push(`• ${pairing.name}`);
      lines.push(`${' '.repeat(width - 12)}${formatCurrencyAscii(pairing.price).padStart(12)}`);
      if (pairing.reason) {
        lines.push(`  → ${pairing.reason}`);
      }
    }
    lines.push('');
  }

  // Water recommendation
  if (data.waterRecommendation) {
    lines.push(separator);
    lines.push('AGUA RECOMENDADA:');
    lines.push(`  ${data.waterRecommendation}`);
    lines.push('');
  }

  // Total
  lines.push(doubleSeparator);
  lines.push(`TOTAL: ${' '.repeat(Math.max(1, width - 7 - 12))}${formatCurrencyAscii(data.total).padStart(12)}`);
  lines.push(doubleSeparator);

  // Footer
  lines.push('');
  lines.push(padCenter('ENTREGUE ESTE TICKET AO GARCOM', width));
  lines.push(padCenter('PARA REALIZAR SEU PEDIDO', width));
  lines.push('');
  // Manual date/time to avoid locale artifacts
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  const hh = String(now.getHours()).padStart(2, '0');
  const mi = String(now.getMinutes()).padStart(2, '0');
  lines.push(padCenter(`${dd}/${mm}/${yyyy} ${hh}:${mi}`, width));
  lines.push('');

  // Final sanitization pass (ensures ASCII only regardless of input)
  const raw = lines.join('\n');
  return sanitizeSommelierAscii(raw);
}

/**
 * Create a print job for sommelier ticket
 */
export async function createSommelierPrintJob(data: SommelierTicketData): Promise<{ success: boolean; error?: string }> {
  try {
    const ticketContent = generateSommelierTicketContent({
      ...data,
      // sanitize user-provided fields preemptively
      customerName: data.customerName ? sanitizeSommelierAscii(data.customerName) : undefined,
      customerPhone: data.customerPhone ? sanitizeSommelierAscii(data.customerPhone) : undefined,
      tableName: data.tableName ? sanitizeSommelierAscii(data.tableName) : undefined,
      ticketHeaderText: data.ticketHeaderText ? sanitizeSommelierAscii(data.ticketHeaderText) : undefined,
      sommelierTip: data.sommelierTip ? sanitizeSommelierAscii(data.sommelierTip) : undefined,
      waterRecommendation: data.waterRecommendation ? sanitizeSommelierAscii(data.waterRecommendation) : undefined,
      wine: {
        ...data.wine,
        name: sanitizeSommelierAscii(data.wine.name),
      },
      pairings: (data.pairings || []).map((p) => ({
        ...p,
        name: sanitizeSommelierAscii(p.name),
        reason: p.reason ? sanitizeSommelierAscii(p.reason) : undefined,
      })),
    });

    // Optional: allow agents to prefer a base64 payload (ASCII-safe here)
    let rawEscPosBase64: string | undefined;
    try {
      rawEscPosBase64 = btoa(ticketContent);
    } catch {
      rawEscPosBase64 = undefined;
    }

    // Create print job in v3 queue (agente atual)
    const created = await createPrintJobV3({
      companyId: data.companyId,
      jobType: 'sommelier_ticket',
      rawEscPos: rawEscPosBase64,
      priority: 3,
      metadata: JSON.parse(JSON.stringify({
        source: 'sommelier',
        ticketContent,
        rawEscPos: ticketContent,
        rawEscPosBase64,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        wineName: data.wine.name,
        total: data.total,
        tableName: data.tableName,
        createdAt: new Date().toISOString(),
      })),
    });

    if (!created.success) {
      console.error('[SommelierTicket] Failed to create print job:', created.error);
      return { success: false, error: created.error };
    }

    console.log('[SommelierTicket] Print job created successfully');
    return { success: true };
  } catch (error) {
    console.error('[SommelierTicket] Error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Browser-based fallback printing for sommelier tickets
 */
export function printSommelierTicketBrowser(data: SommelierTicketData): void {
  const content = generateSommelierTicketContent(data);
  
  const printWindow = window.open('', '_blank', 'width=400,height=600');
  if (!printWindow) {
    console.error('[SommelierTicket] Could not open print window');
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Dica do Enólogo</title>
        <style>
          @page { margin: 0; size: 80mm auto; }
          body {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            line-height: 1.4;
            margin: 0;
            padding: 10px;
            white-space: pre-wrap;
            word-wrap: break-word;
          }
          @media print {
            body { width: 80mm; }
          }
        </style>
      </head>
      <body>${content.replace(/\n/g, '<br>')}</body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 250);
}
