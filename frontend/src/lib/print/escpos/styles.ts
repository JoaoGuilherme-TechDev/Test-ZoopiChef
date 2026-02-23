/**
 * ESC/POS Style Functions - H2/H3/H4 text styles for thermal printers
 * 
 * Provides semantic heading styles that map to ESC/POS commands.
 * All styles are self-resetting to prevent "style leak" to subsequent lines.
 * 
 * Profile: 80mm thermal printer, Font A, 48 columns
 */

import { ESCPOS, LINE, PRINTER_PROFILE } from './commands';

/**
 * Style options for headings
 */
export interface StyleOptions {
  center?: boolean;
  invert?: boolean;
  doubleHeight?: boolean;
}

/**
 * Build a complete ticket reset sequence
 * Ensures no style leaks from previous prints
 */
export function reset(): string {
  return (
    ESCPOS.INIT +
    ESCPOS.BOLD_OFF +
    ESCPOS.INVERT_OFF +
    ESCPOS.SIZE_NORMAL +
    ESCPOS.ALIGN_LEFT
  );
}

/**
 * H2 - Primary heading (bold, optionally centered, optionally double height)
 * 
 * Use for: MESA X, PEDIDO N°, TOTAL, PAGAMENTO
 * 
 * IMPORTANT: Double height only for SHORT lines (< 24 chars)
 */
export function h2(text: string, opts: StyleOptions = {}): string {
  const { center = true, invert = false, doubleHeight = false } = opts;

  const safe = sanitizeText(text);
  let output = '';

  // Apply styles
  if (center) output += ESCPOS.ALIGN_CENTER;
  if (invert) output += ESCPOS.INVERT_ON;
  output += ESCPOS.BOLD_ON;

  // Only use double height for short text that won't overflow
  const useDoubleHeight = doubleHeight && safe.length <= 24;
  if (useDoubleHeight) {
    output += ESCPOS.SIZE_DOUBLE_HEIGHT;
  }

  output += safe + ESCPOS.LF;

  // IMMEDIATELY reset all styles
  if (useDoubleHeight) output += ESCPOS.SIZE_NORMAL;
  output += ESCPOS.BOLD_OFF;
  if (invert) output += ESCPOS.INVERT_OFF;
  if (center) output += ESCPOS.ALIGN_LEFT;

  return output;
}

/**
 * H3 - Secondary heading (bold, normal size)
 * 
 * Use for: CLIENTE, SUBTOTAL, section labels
 */
export function h3(text: string, opts: StyleOptions = {}): string {
  const { center = false, invert = false } = opts;

  let output = '';

  if (center) output += ESCPOS.ALIGN_CENTER;
  if (invert) output += ESCPOS.INVERT_ON;
  output += ESCPOS.BOLD_ON;

  const lines = wrapText(text, LINE.WIDTH);
  for (const line of lines) {
    output += line + ESCPOS.LF;
  }

  output += ESCPOS.BOLD_OFF;
  if (invert) output += ESCPOS.INVERT_OFF;
  if (center) output += ESCPOS.ALIGN_LEFT;

  return output;
}

/**
 * H4 - Tertiary text (normal weight, normal size)
 * 
 * Use for: Footer, observations, additional info
 */
export function h4(text: string, opts: StyleOptions = {}): string {
  const { center = false } = opts;

  let output = '';

  if (center) output += ESCPOS.ALIGN_CENTER;

  const lines = wrapText(text, LINE.WIDTH);
  for (const line of lines) {
    output += line + ESCPOS.LF;
  }

  if (center) output += ESCPOS.ALIGN_LEFT;

  return output;
}

/**
 * Print a full-width separator line (48 '=' chars)
 */
export function separator(): string {
  return LINE.SEPARATOR + ESCPOS.LF;
}

/**
 * Print a dashed separator line (48 '-' chars)
 */
export function separatorDashed(): string {
  return LINE.SEPARATOR_DASHED + ESCPOS.LF;
}

/**
 * Wrap text to fit within column width
 * Breaks on word boundaries when possible
 */
export function wrapText(text: string, columns: number = LINE.WIDTH): string[] {
  const normalized = sanitizeText(text)
    .replace(/\s+/g, ' ')
    .trim();
  if (!normalized) return [];

  const lines: string[] = [];
  let remaining = normalized;

  while (remaining.length > 0) {
    if (remaining.length <= columns) {
      lines.push(remaining);
      break;
    }

    // Find break point (prefer word boundary)
    let breakPoint = columns;
    const chunk = remaining.slice(0, columns);
    const lastSpace = chunk.lastIndexOf(' ');

    if (lastSpace > columns * 0.3) {
      // Break at word boundary if it's not too early in the line
      breakPoint = lastSpace;
    }

    lines.push(remaining.slice(0, breakPoint).trimEnd());
    remaining = remaining.slice(breakPoint).trimStart();
  }

  return lines;
}

/**
 * Sanitize text to avoid "caracteres inválidos" on printers.
 * - Removes diacritics (ç/ã/é -> c/a/e)
 * - Replaces common non-ASCII symbols (º/°)
 * - Removes control chars
 * - Strips remaining non-printable ASCII
 */
export function sanitizeText(input: unknown): string {
  const s = String(input ?? '');

  // Normalize & remove diacritics
  const noDiacritics = s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  // Replace a few common receipt symbols with ASCII
  const replaced = noDiacritics
    .replace(/[º°]/g, 'o')
    .replace(/[ª]/g, 'a');

  // Remove control chars except LF (we don't expect LF inside text anyway)
  const noControls = replaced.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Keep printable ASCII + spaces
  return noControls.replace(/[^\x20-\x7E]/g, '');
}

/**
 * Format a key-value line with right-aligned value
 * Wraps the key if needed, value always on the last line
 * 
 * Example: "TOTAL:                    R$ 50,00"
 */
export function lineKeyValue(
  key: string,
  value: string,
  columns: number = LINE.WIDTH
): string {
  const valueLen = value.length;
  const keyMaxWidth = columns - valueLen - 1; // 1 space minimum
  
  if (keyMaxWidth <= 0) {
    // Value too long, print on separate lines
    return wrapText(key, columns).join(ESCPOS.LF) + ESCPOS.LF +
           value.padStart(columns) + ESCPOS.LF;
  }
  
  const keyLines = wrapText(key, keyMaxWidth);
  
  if (keyLines.length === 0) {
    return value.padStart(columns) + ESCPOS.LF;
  }
  
  let output = '';
  
  // Print all key lines except the last
  for (let i = 0; i < keyLines.length - 1; i++) {
    output += keyLines[i] + ESCPOS.LF;
  }
  
  // Last line: key + padding + value
  const lastKeyLine = keyLines[keyLines.length - 1];
  const padding = columns - lastKeyLine.length - valueLen;
  output += lastKeyLine + ' '.repeat(Math.max(1, padding)) + value + ESCPOS.LF;
  
  return output;
}

/**
 * Format currency value in BRL
 */
export function formatCurrency(cents: number): string {
  return `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;
}

/**
 * Get columns available in current printer profile
 */
export function getColumns(): number {
  return PRINTER_PROFILE.COLUMNS;
}
