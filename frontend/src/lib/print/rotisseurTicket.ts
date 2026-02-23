/**
 * Rotisseur Ticket Printer
 * 
 * Generates "Sugestão do Maître Rôtisseur" tickets
 * for waiters with meat preparation suggestions.
 */

import { createPrintJobV3 } from '@/lib/print/v3/createPrintJobV3';

export interface RotisseurTicketData {
  companyId: string;
  customerName?: string;
  customerPhone?: string;
  occasion?: string;
  meats: Array<{
    name: string;
    price: number;
    quantity?: number;
    description?: string;
  }>;
  accompaniments: Array<{
    name: string;
    price: number;
  }>;
  extras?: Array<{
    name: string;
    price: number;
  }>;
  total: number;
  cookingMethod?: string;
  numberOfPeople?: number;
  maitreRecommendation?: string;
  tableName?: string;
  ticketHeaderText?: string;
}

/**
 * Format currency in BRL (ASCII-safe)
 */
const formatCurrencyAscii = (value: number): string => {
  const cents = Math.round((Number(value) || 0) * 100);
  const abs = Math.abs(cents);
  const intPart = Math.floor(abs / 100);
  const fracPart = String(abs % 100).padStart(2, '0');
  const sign = cents < 0 ? '-' : '';
  const intStr = String(intPart).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${sign}R$ ${intStr},${fracPart}`;
};

const padCenter = (text: string, width: number): string => {
  const clean = String(text ?? '');
  const pad = Math.max(0, Math.floor((width - clean.length) / 2));
  return ' '.repeat(pad) + clean;
};

/**
 * Remove non-ASCII chars (accents, emojis, box drawing, NBSP, etc)
 */
const sanitizeAscii = (input: string): string => {
  const str = String(input ?? '')
    .replace(/\u00A0/g, ' ')
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, '')
    .replace(/[─━]/g, '-')
    .replace(/[═]/g, '=');
  const noDia = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return noDia.replace(/[^\x0A\x0D\x20-\x7E]/g, '');
};

/**
 * Generate rotisseur ticket content for printing
 */
export function generateRotisseurTicketContent(data: RotisseurTicketData): string {
  const lines: string[] = [];
  const width = 48; // 80mm thermal printer width

  const separator = '-'.repeat(width);
  const doubleSeparator = '='.repeat(width);

  // Header
  lines.push(doubleSeparator);
  lines.push(padCenter('MAITRE ROTISSEUR', width));
  lines.push(padCenter(data.ticketHeaderText || 'SUGESTAO DO MAITRE', width));
  lines.push(doubleSeparator);
  lines.push('');

  // Customer info
  if (data.customerName || data.customerPhone || data.tableName || data.numberOfPeople || data.occasion) {
    if (data.customerName) {
      lines.push(`CLIENTE: ${data.customerName}`);
    }
    if (data.customerPhone) {
      lines.push(`TELEFONE: ${data.customerPhone}`);
    }
    if (data.occasion) {
      lines.push(`OCASIAO: ${data.occasion.toUpperCase()}`);
    }
    if (data.tableName) {
      lines.push(`MESA: ${data.tableName}`);
    }
    if (data.numberOfPeople) {
      lines.push(`PESSOAS: ${data.numberOfPeople}`);
    }
    lines.push(separator);
  }

  // Cooking method
  if (data.cookingMethod) {
    lines.push('');
    lines.push(`METODO DE PREPARO: ${data.cookingMethod.toUpperCase()}`);
    lines.push('');
  }

  // Maître recommendation
  if (data.maitreRecommendation) {
    lines.push('');
    lines.push(padCenter('RECOMENDACAO DO MAITRE', width));
    lines.push(separator);
    const words = data.maitreRecommendation.split(' ');
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

  // Selected Meats
  if (data.meats.length > 0) {
    lines.push(separator);
    lines.push(padCenter('CARNES SELECIONADAS', width));
    lines.push(separator);
    
    for (const meat of data.meats) {
      const qty = meat.quantity && meat.quantity > 1 ? ` x${meat.quantity}` : '';
      lines.push(`${meat.name}${qty}`);
      lines.push(`${' '.repeat(width - 12)}${formatCurrencyAscii(meat.price).padStart(12)}`);
    }
    lines.push('');
  }

  // Accompaniments
  if (data.accompaniments.length > 0) {
    lines.push(separator);
    lines.push(padCenter('ACOMPANHAMENTOS', width));
    lines.push(separator);
    
    for (const acc of data.accompaniments) {
      lines.push(`* ${acc.name}`);
      lines.push(`${' '.repeat(width - 12)}${formatCurrencyAscii(acc.price).padStart(12)}`);
    }
    lines.push('');
  }

  // Extras
  if (data.extras && data.extras.length > 0) {
    lines.push(separator);
    lines.push(padCenter('EXTRAS', width));
    lines.push(separator);
    
    for (const extra of data.extras) {
      lines.push(`+ ${extra.name}`);
      lines.push(`${' '.repeat(width - 12)}${formatCurrencyAscii(extra.price).padStart(12)}`);
    }
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
  
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  const hh = String(now.getHours()).padStart(2, '0');
  const mi = String(now.getMinutes()).padStart(2, '0');
  lines.push(padCenter(`${dd}/${mm}/${yyyy} ${hh}:${mi}`, width));
  lines.push('');

  const raw = lines.join('\n');
  return sanitizeAscii(raw);
}

/**
 * Create a print job for rotisseur ticket
 */
export async function createRotisseurPrintJob(data: RotisseurTicketData): Promise<{ success: boolean; error?: string }> {
  try {
    const ticketContent = generateRotisseurTicketContent({
      ...data,
      customerName: data.customerName ? sanitizeAscii(data.customerName) : undefined,
      customerPhone: data.customerPhone ? sanitizeAscii(data.customerPhone) : undefined,
      tableName: data.tableName ? sanitizeAscii(data.tableName) : undefined,
      ticketHeaderText: data.ticketHeaderText ? sanitizeAscii(data.ticketHeaderText) : undefined,
      cookingMethod: data.cookingMethod ? sanitizeAscii(data.cookingMethod) : undefined,
      maitreRecommendation: data.maitreRecommendation ? sanitizeAscii(data.maitreRecommendation) : undefined,
      meats: (data.meats || []).map((m) => ({
        ...m,
        name: sanitizeAscii(m.name),
      })),
      accompaniments: (data.accompaniments || []).map((a) => ({
        ...a,
        name: sanitizeAscii(a.name),
      })),
      extras: (data.extras || []).map((e) => ({
        ...e,
        name: sanitizeAscii(e.name),
      })),
    });

    let rawEscPosBase64: string | undefined;
    try {
      rawEscPosBase64 = btoa(ticketContent);
    } catch {
      rawEscPosBase64 = undefined;
    }

    const created = await createPrintJobV3({
      companyId: data.companyId,
      jobType: 'rotisseur_ticket',
      rawEscPos: rawEscPosBase64,
      priority: 3,
      metadata: JSON.parse(JSON.stringify({
        source: 'rotisseur',
        ticketContent,
        rawEscPos: ticketContent,
        rawEscPosBase64,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        meatNames: data.meats.map(m => m.name),
        total: data.total,
        tableName: data.tableName,
        numberOfPeople: data.numberOfPeople,
        cookingMethod: data.cookingMethod,
        createdAt: new Date().toISOString(),
      })),
    });

    if (!created.success) {
      console.error('[RotisseurTicket] Failed to create print job:', created.error);
      return { success: false, error: created.error };
    }

    console.log('[RotisseurTicket] Print job created successfully');
    return { success: true };
  } catch (error) {
    console.error('[RotisseurTicket] Error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Browser-based fallback printing for rotisseur tickets
 */
export function printRotisseurTicketBrowser(data: RotisseurTicketData): void {
  const content = generateRotisseurTicketContent(data);
  
  const printWindow = window.open('', '_blank', 'width=400,height=600');
  if (!printWindow) {
    console.error('[RotisseurTicket] Could not open print window');
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Sugestão do Maître Rôtisseur</title>
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