/**
 * Elegant Ticket Builder
 * 
 * Construtor de tickets ESC/POS com formatação elegante e parametrizável.
 * Garante layout consistente e sem estouros para impressoras térmicas 80mm.
 */

import { 
  PrintConfig, 
  DEFAULT_PRINT_CONFIG,
  getSeparator,
  formatQuantity,
  formatCurrency,
  getIndent,
  truncateWithEllipsis,
} from './printConfig';

// ESC/POS Commands
const ESC = '\\x1B';
const GS = '\\x1D';

const CMD = {
  // Inicialização
  INIT: ESC + '@',
  
  // Reset de estilos
  RESET: ESC + '@' + GS + '!' + '\\x00' + ESC + 'E' + '\\x00' + GS + 'B' + '\\x00',
  
  // Formatação
  BOLD_ON: ESC + 'E' + '\\x01',
  BOLD_OFF: ESC + 'E' + '\\x00',
  NORMAL: GS + '!' + '\\x00',
  DOUBLE_HEIGHT: GS + '!' + '\\x01',
  DOUBLE_WIDTH: GS + '!' + '\\x10',
  
  // Inversão
  INVERT_ON: GS + 'B' + '\\x01',
  INVERT_OFF: GS + 'B' + '\\x00',
  
  // Alinhamento
  ALIGN_LEFT: ESC + 'a' + '\\x00',
  ALIGN_CENTER: ESC + 'a' + '\\x01',
  ALIGN_RIGHT: ESC + 'a' + '\\x02',
  
  // Controle
  LF: '\\n',
  CUT: GS + 'V' + '\\x00',
  PARTIAL_CUT: GS + 'V' + '\\x01',
  
  // Audio
  BEEP: (count: number, duration: number) => 
    ESC + 'B' + String.fromCharCode(Math.min(count, 9)) + String.fromCharCode(Math.min(Math.floor(duration / 50), 9)),
};

/**
 * Sanitize text for ESC/POS (ASCII only, no diacritics)
 */
function sanitize(input: unknown): string {
  const str = String(input ?? '');
  
  // Normalize and remove diacritics
  const noDiacritics = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  // Replace common symbols
  const replaced = noDiacritics
    .replace(/[–—]/g, '-')
    .replace(/['']/g, "'")
    .replace(/[""]/g, '"')
    .replace(/[°º]/g, 'o')
    .replace(/[ª]/g, 'a')
    .replace(/[\u00A0]/g, ' '); // NBSP
  
  // Keep only printable ASCII
  return replaced.replace(/[^\x0A\x0D\x20-\x7E]/g, '');
}

/**
 * Center text within column width
 */
function center(text: string, columns: number): string {
  const s = sanitize(text);
  if (s.length >= columns) return s.slice(0, columns);
  const padding = Math.floor((columns - s.length) / 2);
  return ' '.repeat(padding) + s;
}

/**
 * Pad text right-aligned
 */
function padRight(left: string, right: string, columns: number): string {
  const l = sanitize(left);
  const r = sanitize(right);
  const available = columns - r.length;
  
  if (l.length > available) {
    const truncated = truncateWithEllipsis(l, available - 1, '...');
    const padding = columns - truncated.length - r.length;
    return truncated + ' '.repeat(Math.max(1, padding)) + r;
  }
  
  const padding = columns - l.length - r.length;
  return l + ' '.repeat(Math.max(1, padding)) + r;
}

/**
 * Elegant Ticket Builder Class
 */
export class ElegantTicketBuilder {
  private buffer: string = '';
  private config: PrintConfig;
  private columns: number;
  
  constructor(config: PrintConfig = DEFAULT_PRINT_CONFIG) {
    this.config = config;
    this.columns = config.layout.columns;
    this.init();
  }
  
  /**
   * Initialize printer and reset styles
   */
  private init(): this {
    this.buffer = CMD.INIT + CMD.NORMAL + CMD.BOLD_OFF + CMD.INVERT_OFF + CMD.ALIGN_LEFT;
    
    // Top margin
    for (let i = 0; i < this.config.layout.marginTop; i++) {
      this.buffer += CMD.LF;
    }
    
    return this;
  }
  
  /**
   * Add blank lines
   */
  blank(count: number = 1): this {
    for (let i = 0; i < count; i++) {
      this.buffer += CMD.LF;
    }
    return this;
  }
  
  /**
   * Add separator line
   */
  separator(type: 'solid' | 'dashed' | 'double' = 'solid'): this {
    this.buffer += getSeparator(this.config.layout, type) + CMD.LF;
    return this;
  }
  
  /**
   * Add centered text (normal)
   */
  centered(text: string): this {
    this.buffer += CMD.ALIGN_CENTER;
    this.buffer += sanitize(text) + CMD.LF;
    this.buffer += CMD.ALIGN_LEFT;
    return this;
  }
  
  /**
   * Add header (company name style)
   */
  header(text: string): this {
    const style = this.config.style.companyNameStyle;
    this.buffer += CMD.ALIGN_CENTER;
    
    if (style === 'inverted') {
      this.buffer += CMD.INVERT_ON + CMD.BOLD_ON;
      this.buffer += ' ' + sanitize(text).toUpperCase() + ' ' + CMD.LF;
      this.buffer += CMD.BOLD_OFF + CMD.INVERT_OFF;
    } else {
      this.buffer += CMD.BOLD_ON;
      this.buffer += sanitize(text).toUpperCase() + CMD.LF;
      this.buffer += CMD.BOLD_OFF;
    }
    
    this.buffer += CMD.ALIGN_LEFT;
    return this;
  }
  
  /**
   * Add order number in prominent style
   */
  orderNumber(number: string | number): this {
    const style = this.config.style.orderNumberStyle;
    const text = `PEDIDO #${number}`;
    
    this.buffer += CMD.ALIGN_CENTER;
    
    if (style === 'inverted') {
      this.buffer += CMD.INVERT_ON + CMD.BOLD_ON;
      this.buffer += ' ' + sanitize(text) + ' ' + CMD.LF;
      this.buffer += CMD.BOLD_OFF + CMD.INVERT_OFF;
    } else if (style === 'boxed') {
      this.separator('double');
      this.buffer += CMD.BOLD_ON + sanitize(text) + CMD.LF + CMD.BOLD_OFF;
      this.separator('double');
    } else {
      this.buffer += CMD.BOLD_ON + sanitize(text) + CMD.LF + CMD.BOLD_OFF;
    }
    
    this.buffer += CMD.ALIGN_LEFT;
    return this;
  }
  
  /**
   * Add origin badge (e.g., "★★★ DELIVERY ★★★")
   */
  originBadge(origin: string): this {
    const style = this.config.style.headerStyle;
    const text = `*** ${sanitize(origin).toUpperCase()} ***`;
    
    this.buffer += CMD.ALIGN_CENTER;
    
    if (style === 'inverted') {
      this.buffer += CMD.INVERT_ON + CMD.BOLD_ON;
      this.buffer += text + CMD.LF;
      this.buffer += CMD.BOLD_OFF + CMD.INVERT_OFF;
    } else {
      this.buffer += CMD.BOLD_ON + text + CMD.LF + CMD.BOLD_OFF;
    }
    
    this.buffer += CMD.ALIGN_LEFT;
    return this;
  }
  
  /**
   * Add consume mode badge (COMER AQUI / LEVAR)
   */
  consumeMode(mode: 'eat_here' | 'takeaway' | null): this {
    if (!mode || !this.config.content.showConsumeMode) return this;
    
    const text = mode === 'eat_here' ? 'COMER AQUI' : 'LEVAR';
    
    this.buffer += CMD.ALIGN_CENTER;
    this.buffer += CMD.BOLD_ON;
    this.buffer += '[ ' + text + ' ]' + CMD.LF;
    this.buffer += CMD.BOLD_OFF;
    this.buffer += CMD.ALIGN_LEFT;
    
    return this;
  }
  
  /**
   * Add table badge
   */
  tableBadge(tableNumber: number | string): this {
    if (!this.config.content.showTableNumber) return this;
    
    const text = `MESA ${tableNumber}`;
    
    this.buffer += CMD.ALIGN_CENTER;
    this.buffer += CMD.INVERT_ON + CMD.BOLD_ON;
    this.buffer += ' *** ' + text + ' *** ' + CMD.LF;
    this.buffer += CMD.BOLD_OFF + CMD.INVERT_OFF;
    this.buffer += CMD.ALIGN_LEFT;
    
    return this;
  }
  
  /**
   * Add key-value line
   */
  keyValue(key: string, value: string): this {
    this.buffer += padRight(sanitize(key), sanitize(value), this.columns) + CMD.LF;
    return this;
  }
  
  /**
   * Add bold key-value line
   */
  keyValueBold(key: string, value: string): this {
    this.buffer += CMD.BOLD_ON;
    this.buffer += padRight(sanitize(key), sanitize(value), this.columns) + CMD.LF;
    this.buffer += CMD.BOLD_OFF;
    return this;
  }
  
  /**
   * Add text line (left-aligned)
   */
  text(text: string): this {
    const lines = this.wrapText(sanitize(text), this.columns);
    for (const line of lines) {
      this.buffer += line + CMD.LF;
    }
    return this;
  }
  
  /**
   * Add bold text line
   */
  textBold(text: string): this {
    this.buffer += CMD.BOLD_ON;
    this.text(text);
    this.buffer += CMD.BOLD_OFF;
    return this;
  }
  
  /**
   * Add inverted text block (for notes/observations)
   */
  invertedBlock(title: string, content: string): this {
    const style = this.config.style.notesStyle;
    
    if (style === 'inverted') {
      this.buffer += CMD.INVERT_ON + CMD.BOLD_ON;
      this.buffer += center(sanitize(title).toUpperCase(), this.columns) + CMD.LF;
      const lines = this.wrapText(sanitize(content).toUpperCase(), this.columns);
      for (const line of lines) {
        this.buffer += line + CMD.LF;
      }
      this.buffer += CMD.BOLD_OFF + CMD.INVERT_OFF;
    } else if (style === 'boxed') {
      this.separator('dashed');
      this.textBold(title);
      this.text(content);
      this.separator('dashed');
    } else {
      this.textBold(title);
      this.text(content);
    }
    
    return this;
  }
  
  /**
   * Add product item
   */
  item(qty: number, name: string, priceCents?: number): this {
    const qtyStr = formatQuantity(qty, this.config.style);
    const truncatedName = truncateWithEllipsis(
      sanitize(name).toUpperCase(),
      this.config.layout.maxProductNameLen,
      this.config.layout.ellipsis
    );
    
    const mainLine = `${qtyStr} ${truncatedName}`;
    
    if (priceCents !== undefined && this.config.content.showPrices) {
      const price = formatCurrency(priceCents, this.config.style);
      this.buffer += CMD.BOLD_ON;
      this.buffer += padRight(mainLine, price, this.columns) + CMD.LF;
      this.buffer += CMD.BOLD_OFF;
    } else {
      this.buffer += CMD.BOLD_ON;
      this.buffer += mainLine + CMD.LF;
      this.buffer += CMD.BOLD_OFF;
    }
    
    return this;
  }
  
  /**
   * Add item child line (options, notes)
   */
  itemChild(text: string): this {
    const indent = getIndent(this.config.layout);
    const maxLen = this.columns - indent.length;
    const truncated = truncateWithEllipsis(sanitize(text), maxLen, '...');
    this.buffer += indent + truncated + CMD.LF;
    return this;
  }
  
  /**
   * Add total line with prominent style
   */
  total(label: string, valueCents: number): this {
    const value = formatCurrency(valueCents, this.config.style);
    const style = this.config.style.totalStyle;
    
    // Always reset before total to avoid inherited styles
    this.buffer += CMD.NORMAL + CMD.BOLD_OFF + CMD.INVERT_OFF;
    
    this.buffer += CMD.ALIGN_CENTER;
    
    if (style === 'inverted') {
      this.buffer += CMD.INVERT_ON + CMD.BOLD_ON;
      this.buffer += ' ' + padRight(sanitize(label), value, this.columns - 2) + ' ' + CMD.LF;
      this.buffer += CMD.BOLD_OFF + CMD.INVERT_OFF;
    } else if (style === 'double-height') {
      this.buffer += CMD.DOUBLE_HEIGHT + CMD.BOLD_ON;
      // Para double height, usar metade das colunas
      const halfCols = Math.floor(this.columns / 2);
      this.buffer += padRight(sanitize(label), value, halfCols) + CMD.LF;
      this.buffer += CMD.BOLD_OFF + CMD.NORMAL;
    } else {
      this.buffer += CMD.BOLD_ON;
      this.buffer += padRight(sanitize(label), value, this.columns) + CMD.LF;
      this.buffer += CMD.BOLD_OFF;
    }
    
    this.buffer += CMD.ALIGN_LEFT;
    
    // Reset após total para evitar vazamento de estilo
    this.buffer += CMD.NORMAL + CMD.BOLD_OFF + CMD.INVERT_OFF;
    
    return this;
  }
  
  /**
   * Add footer
   */
  footer(site?: string, phone?: string): this {
    if (!this.config.content.showFooter) return this;
    
    this.blank(1);
    this.separator('dashed');
    this.buffer += CMD.ALIGN_CENTER;
    
    if (this.config.content.showWebsite && site) {
      this.buffer += sanitize(site) + CMD.LF;
    }
    if (phone) {
      this.buffer += sanitize(phone) + CMD.LF;
    }
    
    this.buffer += CMD.ALIGN_LEFT;
    return this;
  }
  
  /**
   * Finalize and get ticket content
   */
  build(): string {
    // Bottom margin
    for (let i = 0; i < this.config.layout.marginBottom; i++) {
      this.buffer += CMD.LF;
    }
    
    // Beep if enabled
    if (this.config.beep.enabled) {
      this.buffer += CMD.BEEP(this.config.beep.count, this.config.beep.duration);
    }
    
    // Cut
    this.buffer += CMD.CUT;
    
    return this.buffer;
  }
  
  /**
   * Get raw buffer without cut (for chaining)
   */
  getBuffer(): string {
    return this.buffer;
  }
  
  /**
   * Wrap text to fit columns
   */
  private wrapText(text: string, maxWidth: number): string[] {
    const normalized = text.replace(/\s+/g, ' ').trim();
    if (!normalized) return [];
    if (normalized.length <= maxWidth) return [normalized];
    
    const lines: string[] = [];
    let remaining = normalized;
    
    while (remaining.length > 0) {
      if (remaining.length <= maxWidth) {
        lines.push(remaining);
        break;
      }
      
      let breakPoint = maxWidth;
      const chunk = remaining.slice(0, maxWidth);
      const lastSpace = chunk.lastIndexOf(' ');
      
      if (lastSpace > maxWidth * 0.3) {
        breakPoint = lastSpace;
      }
      
      lines.push(remaining.slice(0, breakPoint).trimEnd());
      remaining = remaining.slice(breakPoint).trimStart();
    }
    
    return lines;
  }
}

/**
 * Quick builder factory
 */
export function createTicketBuilder(config?: Partial<PrintConfig>): ElegantTicketBuilder {
  if (!config) {
    return new ElegantTicketBuilder();
  }
  
  const merged: PrintConfig = {
    layout: { ...DEFAULT_PRINT_CONFIG.layout, ...config.layout },
    style: { ...DEFAULT_PRINT_CONFIG.style, ...config.style },
    content: { ...DEFAULT_PRINT_CONFIG.content, ...config.content },
    beep: { ...DEFAULT_PRINT_CONFIG.beep, ...config.beep },
  };
  
  return new ElegantTicketBuilder(merged);
}
