/**
 * Print Configuration System
 * 
 * Configuração centralizada e parametrizável para impressão térmica.
 * Permite ajustar layout, fontes, espaçamentos e estilos de forma elegante.
 */

export interface PrintLayoutConfig {
  // Dimensões
  columns: number;           // Largura em colunas (padrão: 48 para 80mm)
  marginTop: number;         // Linhas em branco no topo
  marginBottom: number;      // Linhas em branco no final
  
  // Separadores
  separatorChar: '=' | '-' | '_' | '─' | '━' | '═';
  separatorDashedChar: '-' | '·' | '─';
  separatorDoubleChar: '=' | '═';
  
  // Indentação
  childIndent: number;       // Espaços para itens filhos
  
  // Truncamento
  ellipsis: string;          // Caractere de truncamento (padrão: "...")
  maxProductNameLen: number; // Tamanho máximo do nome do produto
}

export interface PrintStyleConfig {
  // Cabeçalho
  headerStyle: 'bold' | 'inverted' | 'double' | 'normal';
  companyNameStyle: 'bold' | 'inverted' | 'centered';
  
  // Número do pedido
  orderNumberStyle: 'inverted' | 'bold' | 'boxed';
  
  // Itens
  itemStyle: 'bold' | 'normal';
  quantityFormat: 'Nx' | 'N x' | 'N X' | '(N)';
  
  // Preços
  priceAlignment: 'right' | 'inline';
  currencySymbol: 'R$' | 'R$ ' | '';
  decimalSeparator: ',' | '.';
  
  // Totais
  totalStyle: 'inverted' | 'bold' | 'double-height';
  
  // Observações
  notesStyle: 'inverted' | 'boxed' | 'normal';
}

export interface PrintContentConfig {
  // Cabeçalho
  showCompanyName: boolean;
  showOrderNumber: boolean;
  showDateTime: boolean;
  showOrigin: boolean;
  
  // Cliente
  showCustomerName: boolean;
  showCustomerPhone: boolean;
  showAddress: boolean;
  
  // Itens
  showQuantity: boolean;
  showPrices: boolean;
  showOptions: boolean;
  showNotes: boolean;
  
  // Rodapé
  showFooter: boolean;
  showWebsite: boolean;
  footerSite: string;
  footerPhone: string;
  
  // Extras
  showConsumeMode: boolean;
  showTableNumber: boolean;
}

export interface PrintBeepConfig {
  enabled: boolean;
  count: number;     // Número de beeps
  duration: number;  // Duração em ms
}

export interface PrintConfig {
  layout: PrintLayoutConfig;
  style: PrintStyleConfig;
  content: PrintContentConfig;
  beep: PrintBeepConfig;
}

// Configuração padrão - Elegante e profissional
export const DEFAULT_PRINT_CONFIG: PrintConfig = {
  layout: {
    columns: 48,
    marginTop: 1,
    marginBottom: 2,
    separatorChar: '═',
    separatorDashedChar: '─',
    separatorDoubleChar: '═',
    childIndent: 4,
    ellipsis: '...',
    maxProductNameLen: 36,
  },
  style: {
    headerStyle: 'inverted',
    companyNameStyle: 'bold',
    orderNumberStyle: 'inverted',
    itemStyle: 'bold',
    quantityFormat: 'N X',
    priceAlignment: 'right',
    currencySymbol: 'R$',
    decimalSeparator: ',',
    totalStyle: 'inverted',
    notesStyle: 'inverted',
  },
  content: {
    showCompanyName: true,
    showOrderNumber: true,
    showDateTime: true,
    showOrigin: true,
    showCustomerName: true,
    showCustomerPhone: true,
    showAddress: true,
    showQuantity: true,
    showPrices: true,
    showOptions: true,
    showNotes: true,
    showFooter: true,
    showWebsite: true,
    footerSite: 'www.zoopi.app.br',
    footerPhone: '',
    showConsumeMode: true,
    showTableNumber: true,
  },
  beep: {
    enabled: true,
    count: 3,
    duration: 50,
  },
};

// Preset: Minimalista
export const MINIMAL_PRINT_CONFIG: PrintConfig = {
  ...DEFAULT_PRINT_CONFIG,
  layout: {
    ...DEFAULT_PRINT_CONFIG.layout,
    marginTop: 0,
    marginBottom: 1,
    separatorChar: '-',
    separatorDashedChar: '-',
  },
  style: {
    ...DEFAULT_PRINT_CONFIG.style,
    headerStyle: 'bold',
    orderNumberStyle: 'bold',
    totalStyle: 'bold',
    notesStyle: 'normal',
  },
  content: {
    ...DEFAULT_PRINT_CONFIG.content,
    showFooter: false,
    showWebsite: false,
  },
};

// Preset: Produção (cozinha)
export const PRODUCTION_PRINT_CONFIG: PrintConfig = {
  ...DEFAULT_PRINT_CONFIG,
  layout: {
    ...DEFAULT_PRINT_CONFIG.layout,
    marginTop: 1,
    marginBottom: 1,
    childIndent: 6,
  },
  style: {
    ...DEFAULT_PRINT_CONFIG.style,
    headerStyle: 'inverted',
    orderNumberStyle: 'inverted',
    itemStyle: 'bold',
    notesStyle: 'inverted',
  },
  content: {
    ...DEFAULT_PRINT_CONFIG.content,
    showPrices: false,
    showCustomerPhone: false,
    showAddress: false,
  },
  beep: {
    enabled: true,
    count: 5,
    duration: 100,
  },
};

// Preset: Conta/Fatura
export const BILL_PRINT_CONFIG: PrintConfig = {
  ...DEFAULT_PRINT_CONFIG,
  layout: {
    ...DEFAULT_PRINT_CONFIG.layout,
    marginTop: 2,
    marginBottom: 3,
  },
  style: {
    ...DEFAULT_PRINT_CONFIG.style,
    headerStyle: 'bold',
    totalStyle: 'double-height',
    priceAlignment: 'right',
  },
  content: {
    ...DEFAULT_PRINT_CONFIG.content,
    showOrigin: false,
    showConsumeMode: false,
  },
  beep: {
    enabled: false,
    count: 0,
    duration: 0,
  },
};

/**
 * Merge partial config with defaults
 */
export function mergeConfig(partial: Partial<PrintConfig>): PrintConfig {
  return {
    layout: { ...DEFAULT_PRINT_CONFIG.layout, ...partial.layout },
    style: { ...DEFAULT_PRINT_CONFIG.style, ...partial.style },
    content: { ...DEFAULT_PRINT_CONFIG.content, ...partial.content },
    beep: { ...DEFAULT_PRINT_CONFIG.beep, ...partial.beep },
  };
}

/**
 * Get separator string based on config
 */
export function getSeparator(config: PrintLayoutConfig, type: 'solid' | 'dashed' | 'double' = 'solid'): string {
  const char = type === 'solid' 
    ? config.separatorChar 
    : type === 'dashed' 
      ? config.separatorDashedChar 
      : config.separatorDoubleChar;
  return char.repeat(config.columns);
}

/**
 * Format quantity based on style config
 */
export function formatQuantity(qty: number, style: PrintStyleConfig): string {
  switch (style.quantityFormat) {
    case 'Nx': return `${qty}x`;
    case 'N x': return `${qty} x`;
    case 'N X': return `${qty} X`;
    case '(N)': return `(${qty})`;
    default: return `${qty}x`;
  }
}

/**
 * Format currency based on style config
 */
export function formatCurrency(cents: number, style: PrintStyleConfig): string {
  const value = (cents / 100).toFixed(2);
  const formatted = style.decimalSeparator === ',' 
    ? value.replace('.', ',') 
    : value;
  return style.currencySymbol ? `${style.currencySymbol} ${formatted}` : formatted;
}

/**
 * Get child indent string
 */
export function getIndent(config: PrintLayoutConfig): string {
  return ' '.repeat(config.childIndent);
}

/**
 * Truncate text with ellipsis
 */
export function truncateWithEllipsis(text: string, maxLen: number, ellipsis: string = '...'): string {
  if (text.length <= maxLen) return text;
  if (maxLen <= ellipsis.length) return text.slice(0, maxLen);
  return text.slice(0, maxLen - ellipsis.length) + ellipsis;
}
