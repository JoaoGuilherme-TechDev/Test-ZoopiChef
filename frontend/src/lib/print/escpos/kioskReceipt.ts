/**
 * Kiosk Customer Receipt (ESC/POS)
 *
 * Small, robust receipt focused on a strong header highlight.
 * Used specifically for `print_job_queue.source === 'kiosk_receipt'`.
 */

import { ESCPOS, LINE } from './commands';
import { reset, sanitizeText, wrapText } from './styles';

export interface KioskReceiptItem {
  name: string;
  quantity: number;
  notes?: string | null;
}

export interface KioskReceiptData {
  companyName: string;
  orderNumber?: string | number | null;
  orderId: string;
  customerName?: string | null;
  dineMode?: 'eat_here' | 'takeaway' | string | null;
  discountDescription?: string | null;
  items: KioskReceiptItem[];
  createdAt?: string | null;
}

function centerLine(text: string, width = LINE.WIDTH): string {
  const clean = sanitizeText(text);
  if (clean.length >= width) return clean.slice(0, width);
  const leftPad = Math.floor((width - clean.length) / 2);
  return ' '.repeat(leftPad) + clean;
}

export function buildKioskReceiptEscPos(data: KioskReceiptData): string {
  const width = LINE.WIDTH;
  const orderNum = data.orderNumber != null && String(data.orderNumber).trim() !== ''
    ? String(data.orderNumber)
    : data.orderId.slice(0, 8).toUpperCase();

  let out = '';
  out += reset();

  // ===== HEADER (force highlight) =====
  out += ESCPOS.ALIGN_CENTER;
  out += ESCPOS.INVERT_ON;
  out += ESCPOS.BOLD_ON;
  out += centerLine(`  ${sanitizeText(data.companyName || 'ZOOPI').toUpperCase()}  `, width) + ESCPOS.LF;
  out += ESCPOS.BOLD_OFF;
  out += ESCPOS.INVERT_OFF;
  out += ESCPOS.LF;

  out += ESCPOS.INVERT_ON;
  out += ESCPOS.BOLD_ON;
  out += centerLine(`PEDIDO #${orderNum}`, width) + ESCPOS.LF;
  out += ESCPOS.BOLD_OFF;
  out += ESCPOS.INVERT_OFF;
  out += ESCPOS.LF;

  // ===== INFO =====
  out += ESCPOS.ALIGN_LEFT;
  const customer = sanitizeText(data.customerName || 'CONSUMIDOR').toUpperCase();
  out += wrapText(`CLIENTE: ${customer}`, width).join(ESCPOS.LF) + ESCPOS.LF;

  if (data.dineMode) {
    const mode = String(data.dineMode) === 'eat_here'
      ? 'COMER AQUI'
      : String(data.dineMode) === 'takeaway'
        ? 'PARA LEVAR'
        : sanitizeText(data.dineMode).toUpperCase();
    out += `MODO: ${mode}` + ESCPOS.LF;
  }

  if (data.discountDescription) {
    out += wrapText(`DESCONTO: ${sanitizeText(data.discountDescription)}`, width).join(ESCPOS.LF) + ESCPOS.LF;
  }

  out += '-'.repeat(width) + ESCPOS.LF;

  // ===== ITEMS =====
  for (const it of data.items || []) {
    const qty = Math.max(1, Number(it.quantity) || 1);
    const name = sanitizeText(it.name || 'Item');
    out += wrapText(`${qty}x ${name}`, width).join(ESCPOS.LF) + ESCPOS.LF;

    if (it.notes) {
      const notes = sanitizeText(it.notes);
      const lines = wrapText(`OBS: ${notes}`, width - 2);
      for (const line of lines) out += `  ${line}` + ESCPOS.LF;
    }
  }

  out += ESCPOS.LF + ESCPOS.LF + ESCPOS.LF;
  out += ESCPOS.CUT;
  return out;
}
