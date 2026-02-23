/**
 * ESC/POS Formatting Module - ASCII Pure
 * 
 * REGRAS:
 * - NUNCA usar toLocaleString/Intl.NumberFormat para moeda (causa NBSP)
 * - Dinheiro sempre em ASCII puro: "R$ 123,45" com espaço 0x20
 * - Enviar bytes ascii/latin1, não string UTF-8
 * - 80mm = 48 colunas (Font A)
 */

const ESC = 0x1B;
const GS = 0x1D;

// Largura padrão para 80mm
const LINE_WIDTH = 48;

/**
 * INIT completo - Reset obrigatório no início do ticket
 * ESC @ + ESC ! 0 + GS ! 0 + ESC E 0 + ESC a 0
 */
const INIT_BYTES = Buffer.from([
  ESC, 0x40,        // ESC @ - Initialize
  ESC, 0x21, 0x00,  // ESC ! 0 - Normal mode
  GS,  0x21, 0x00,  // GS ! 0 - Normal size
  ESC, 0x45, 0x00,  // ESC E 0 - Bold off
  ESC, 0x61, 0x00,  // ESC a 0 - Left align
]);

/**
 * RESET_STYLE - Após qualquer destaque (TOTAL, cabeçalho, etc)
 * ESC ! 0 + GS ! 0 + ESC E 0 + ESC a 0
 */
const RESET_STYLE_BYTES = Buffer.from([
  ESC, 0x21, 0x00,  // ESC ! 0 - Normal mode
  GS,  0x21, 0x00,  // GS ! 0 - Normal size  
  ESC, 0x45, 0x00,  // ESC E 0 - Bold off
  ESC, 0x61, 0x00,  // ESC a 0 - Left align
]);

// Strings equivalentes para concatenação
const INIT_STR = String.fromCharCode(
  ESC, 0x40,
  ESC, 0x21, 0x00,
  GS,  0x21, 0x00,
  ESC, 0x45, 0x00,
  ESC, 0x61, 0x00
);

const RESET_STYLE_STR = String.fromCharCode(
  ESC, 0x21, 0x00,
  GS,  0x21, 0x00,
  ESC, 0x45, 0x00,
  ESC, 0x61, 0x00
);

/**
 * Remove NBSP e outros espaços especiais Unicode -> espaço ASCII 0x20
 * @param {string} s - Input string
 * @returns {string} String sem NBSP
 */
function killNbsp(s) {
  return String(s || '')
    .replace(/\u00A0/g, ' ')      // NBSP
    .replace(/[\u2000-\u200B]/g, ' ')  // Outros espaços Unicode
    .replace(/\u202F/g, ' ');     // Narrow no-break space
}

/**
 * Formata número como moeda brasileira em ASCII PURO
 * PROIBIDO usar toLocaleString/Intl.NumberFormat!
 * 
 * @param {number} n - Valor (pode ser centavos ou reais, detecta automaticamente)
 * @returns {string} "R$ 123,45" com espaço ASCII 0x20
 */
function moneyBR(n) {
  const raw = Number(n);
  if (!Number.isFinite(raw)) return 'R$ 0,00';
  
  // Detecta se é centavos (> 1000 e inteiro) ou reais
  const value = (Number.isInteger(raw) && Math.abs(raw) > 1000) ? raw / 100 : raw;
  
  // Formatar manualmente
  const abs = Math.abs(value);
  const fixed = abs.toFixed(2);           // "123.45"
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
  
  // Adicionar vírgula decimal
  formatted += ',' + decPart;
  
  // Sinal negativo se necessário
  if (value < 0) formatted = '-' + formatted;
  
  // R$ com espaço ASCII normal (0x20)
  return 'R$ ' + formatted;
}

/**
 * Formata centavos como moeda
 * @param {number} cents - Valor em centavos
 * @returns {string} "R$ 123,45"
 */
function moneyCents(cents) {
  const value = Number(cents) / 100;
  if (!Number.isFinite(value)) return 'R$ 0,00';
  
  const abs = Math.abs(value);
  const fixed = abs.toFixed(2);
  const [intPart, decPart] = fixed.split('.');
  
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
}

/**
 * Sanitiza texto para ASCII puro (remove acentos, caracteres especiais)
 * @param {string} input - Texto de entrada
 * @returns {string} Texto ASCII puro
 */
function sanitize(input) {
  const str = input == null ? '' : String(input);
  
  // Remove diacríticos (acentos)
  const withoutDiacritics = str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  
  // Remove NBSP e espaços especiais
  const noNbsp = killNbsp(withoutDiacritics);
  
  // Substitui caracteres especiais comuns
  const replaced = noNbsp
    .replace(/[–—]/g, '-')
    .replace(/[°º]/g, 'o')
    .replace(/[ª]/g, 'a')
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'");
  
  // Mantém apenas ASCII printável (0x20-0x7E) e newlines
  return replaced.replace(/[^\x0A\x0D\x20-\x7E]/g, '');
}

/**
 * Formata linha com valor alinhado à direita
 * 80mm = 48 colunas, cada item em UMA linha
 * 
 * @param {string} left - Texto à esquerda
 * @param {string} right - Texto à direita (valor)
 * @param {number} width - Largura em colunas (default: 48)
 * @returns {string} Linha formatada
 */
function formatLine(left, right, width = LINE_WIDTH) {
  let l = killNbsp(sanitize(left));
  let r = killNbsp(sanitize(right));
  
  // Se right é maior que width, trunca
  if (r.length > width) {
    r = r.slice(0, width);
  }
  
  // Espaço máximo para left (mínimo 1 espaço entre left e right)
  const maxLeft = Math.max(0, width - r.length - 1);
  
  // Trunca left se necessário
  if (l.length > maxLeft) {
    l = l.slice(0, maxLeft);
  }
  
  // Calcula padding
  const padding = Math.max(1, width - l.length - r.length);
  
  return l + ' '.repeat(padding) + r;
}

/**
 * Centraliza texto em uma largura
 * @param {string} text - Texto para centralizar
 * @param {number} width - Largura
 * @returns {string} Texto centralizado
 */
function padCenter(text, width = LINE_WIDTH) {
  const clean = sanitize(text);
  if (clean.length >= width) return clean.slice(0, width);
  const leftPad = Math.floor((width - clean.length) / 2);
  const rightPad = width - clean.length - leftPad;
  return ' '.repeat(leftPad) + clean + ' '.repeat(rightPad);
}

/**
 * Quebra texto em linhas de largura máxima
 * @param {string} text - Texto para quebrar
 * @param {number} width - Largura máxima
 * @returns {string[]} Array de linhas
 */
function wrapText(text, width = LINE_WIDTH) {
  const s = sanitize(text).replace(/\s+/g, ' ').trim();
  if (!s) return [];
  
  const out = [];
  let i = 0;
  
  while (i < s.length) {
    let take = Math.min(width, s.length - i);
    const chunk = s.slice(i, i + take);
    
    // Quebra no último espaço se não for o fim
    if (i + take < s.length) {
      const lastSpace = chunk.lastIndexOf(' ');
      if (lastSpace > 0) take = lastSpace;
    }
    
    out.push(s.slice(i, i + take).trimEnd());
    i += take;
    
    // Pula espaços iniciais da próxima linha
    while (s[i] === ' ') i++;
  }
  
  return out;
}

/**
 * Trunca texto para caber em uma linha (com espaço para preço)
 * @param {string} text - Texto
 * @param {number} maxLen - Largura máxima
 * @returns {string} Texto truncado
 */
function truncate(text, maxLen) {
  const s = sanitize(text);
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen - 2) + '..';
}

/**
 * TESTE OBRIGATÓRIO: Esta linha deve imprimir exatamente assim:
 * "TESTE: R$ 736,00"
 * Sem símbolos estranhos como R$¬ã...
 */
function getTestLine() {
  const value = moneyBR(736);
  return `TESTE: ${value}`;
}

// Verificação de bytes (para debug)
function verifyAscii(str) {
  const bytes = Buffer.from(str, 'utf8');
  const issues = [];
  
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    // Fora do range ASCII printável + controle básico
    if (b > 0x7F) {
      issues.push({ position: i, byte: b, hex: '0x' + b.toString(16) });
    }
  }
  
  return {
    isAscii: issues.length === 0,
    issues,
  };
}

module.exports = {
  // Bytes/Buffers
  INIT_BYTES,
  RESET_STYLE_BYTES,
  
  // Strings para concatenação
  INIT_STR,
  RESET_STYLE_STR,
  
  // Constantes
  LINE_WIDTH,
  
  // Funções de formatação
  killNbsp,
  moneyBR,
  moneyCents,
  sanitize,
  formatLine,
  padCenter,
  wrapText,
  truncate,
  
  // Teste/Debug
  getTestLine,
  verifyAscii,
};
