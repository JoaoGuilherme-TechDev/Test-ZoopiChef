/**
 * Núcleo do Agente de Impressão
 * Monitora a fila de impressão no banco de dados e processa os jobs
 * 
 * REGRAS DE FORMATAÇÃO ESC/POS:
 * - NUNCA usar toLocaleString/Intl.NumberFormat para moeda (causa NBSP)
 * - Dinheiro sempre via moneyBR() em ASCII puro
 * - Reset obrigatório no início e após destaques
 * - 80mm = 48 colunas (Font A)
 */

const { createClient } = require('@supabase/supabase-js');
const { getConfig } = require('./config-manager');
const { printContent, printTestPage, COMMANDS } = require('./printer');
const { notifyPrintSuccess, notifyPrintError, notifyConnectionLost, notifyReconnected } = require('./notification-manager');

// Módulo de formatação ASCII puro
const {
  INIT_STR,
  RESET_STYLE_STR,
  LINE_WIDTH,
  killNbsp,
  moneyBR,
  moneyCents,
  sanitize,
  formatLine,
  padCenter,
  wrapText,
  truncate,
  getTestLine,
} = require('./escpos-format');

// Estado global
let supabase = null;
let isProcessing = false;
let processedJobs = new Set();
let pollIntervalId = null;
let realtimeChannel = null;
let reconnectAttempts = 0;
let wasConnected = false;
let authSubscription = null;
let reauthInFlight = null;

let stats = {
  started: null,
  printed: 0,
  failed: 0,
  lastPrint: null,
  isRunning: false,
  lastError: null,
};

function isJwtExpiredError(err) {
  const msg = String(err?.message || err || '').toLowerCase();
  return msg.includes('jwt expired') || msg.includes('invalid jwt') || msg.includes('token has expired');
}

async function ensureAgentAuthenticated(reason = 'auto') {
  const config = getConfig();
  if (!supabase) throw new Error('Cliente não inicializado');

  if (reauthInFlight) return reauthInFlight;

  reauthInFlight = (async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: config.agentEmail,
      password: config.agentPassword,
    });

    if (error || !data?.session?.access_token) {
      throw new Error(`Falha no login do agente: ${error?.message || 'sem sessão'}`);
    }

    console.log(`✓ Login/refresh do agente OK (${reason})`);
    return data.session;
  })();

  try {
    return await reauthInFlight;
  } finally {
    reauthInFlight = null;
  }
}

/**
 * Formata um pedido para impressão
 * Regras:
 * - largura padrão: 48 colunas (80mm / Fonte A)
 * - número do pedido SEMPRE prioriza order_number (sequência)
 * - destaca módulo/origem (ex: MESA 1 / IFOOD / WHATSAPP)
 * - destaca nome do cliente
 * - itens com quebra controlada (sem "quebrar" aleatoriamente)
 * 
 * IMPORTANTE: Usar funções do escpos-format.js (moneyBR, sanitize, etc)
 */
const INDENT = '  ';

function getOrderDisplayNumber(order) {
  if (order && order.order_number !== null && order.order_number !== undefined) {
    const n = Number(order.order_number);
    if (!Number.isNaN(n)) return String(n).padStart(3, '0');
  }
  // fallback (último recurso)
  return (order?.id || '').slice(0, 3).toUpperCase() || '---';
}

/**
 * Retorna a ORIGEM do pedido (de onde veio)
 * QRCODE / MESA / PEDIDO ONLINE / LIGAÇÃO
 */
function getOrderOriginLabel(order) {
  const orderType = String(order?.order_type || '').toLowerCase();
  const source = String(order?.source || '').toLowerCase();
  
  // QRCode - pedidos do cardápio digital
  if (source === 'qrcode' || source === 'menu') return 'QRCODE';
  
  // Mesa
  if (orderType === 'table' || orderType === 'dine_in') {
    const tableNumber = order?.table_number || order?.table_name || '';
    if (tableNumber) return `MESA ${tableNumber}`;
    return 'MESA';
  }
  
  // Ligação
  if (source === 'phone' || orderType === 'phone') return 'LIGAÇÃO';
  
  // Delivery online
  if (orderType === 'delivery') return 'PEDIDO ONLINE';
  
  // Balcão
  if (orderType === 'counter' || orderType === 'local') return 'BALCÃO';
  
  // Fallback
  return 'PEDIDO';
}

/**
 * Retorna o TIPO DE RECEBIMENTO (como vai ser entregue)
 * DELIVERY / BALCÃO / MESA / RETIRADA
 */
function getFulfillmentTypeLabel(order) {
  const orderType = String(order?.order_type || '').toLowerCase();
  const eatHere = order?.eat_here ?? order?.eat_in ?? null;
  
  if (orderType === 'delivery') return 'DELIVERY';
  if (orderType === 'table' || orderType === 'dine_in') return 'MESA';
  if (orderType === 'local') return 'RETIRADA';
  if (orderType === 'counter' && eatHere === true) return 'COMER AQUI';
  if (orderType === 'counter') return 'BALCÃO';
  
  return 'BALCÃO';
}

function formatOrder(order, items, sectorName) {
  const orderNumber = getOrderDisplayNumber(order);
  const originLabel = getOrderOriginLabel(order);
  const fulfillmentLabel = getFulfillmentTypeLabel(order);
  const orderType = String(order?.order_type || '').toLowerCase();

  let ticket = '';

  // Margem superior
  ticket += '\n';

  // ========== CABEÇALHO ==========
  ticket += COMMANDS.ALIGN_CENTER;
  ticket += COMMANDS.BOLD_ON;
  ticket += COMMANDS.DOUBLE_HEIGHT_ON;
  ticket += `${padCenter('ZOOPI CHEF')}\n`;
  ticket += COMMANDS.NORMAL;
  ticket += COMMANDS.BOLD_OFF;

  ticket += COMMANDS.ALIGN_LEFT;
  ticket += '='.repeat(LINE_WIDTH) + '\n';

  // ========== NÚMERO DO PEDIDO (DESTAQUE) ==========
  ticket += COMMANDS.ALIGN_CENTER;
  ticket += COMMANDS.BOLD_ON;
  ticket += COMMANDS.DOUBLE_HEIGHT_ON;
  ticket += `PEDIDO #${orderNumber}\n`;
  ticket += COMMANDS.NORMAL;
  ticket += COMMANDS.BOLD_OFF;
  ticket += COMMANDS.ALIGN_LEFT;

  ticket += '-'.repeat(LINE_WIDTH) + '\n';

  // ========== ORIGEM DO PEDIDO (QRCODE/MESA/LIGAÇÃO/ONLINE) ==========
  ticket += COMMANDS.BOLD_ON;
  ticket += COMMANDS.DOUBLE_HEIGHT_ON;
  ticket += `ORIGEM: ${originLabel}\n`;
  ticket += COMMANDS.NORMAL;
  ticket += COMMANDS.BOLD_OFF;

  // ========== TIPO DE RECEBIMENTO ==========
  ticket += COMMANDS.BOLD_ON;
  ticket += `TIPO: ${fulfillmentLabel}\n`;
  ticket += COMMANDS.BOLD_OFF;

  // ========== HORA DO PEDIDO ==========
  const createdAt = order?.created_at ? new Date(order.created_at) : new Date();
  ticket += `HORA: ${createdAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}\n`;

  ticket += '-'.repeat(LINE_WIDTH) + '\n';

  // ========== CLIENTE (SE HOUVER) ==========
  if (order?.customer_name) {
    ticket += COMMANDS.BOLD_ON;
    ticket += COMMANDS.DOUBLE_HEIGHT_ON;
    const customer = String(order.customer_name).toUpperCase();
    wrapText(`CLIENTE: ${customer}`, LINE_WIDTH).forEach((l) => {
      ticket += `${l}\n`;
    });
    ticket += COMMANDS.NORMAL;
    ticket += COMMANDS.BOLD_OFF;
  }

  // ========== TELEFONE (SE HOUVER) ==========
  if (order?.customer_phone || order?.phone) {
    ticket += `TEL: ${order.customer_phone || order.phone}\n`;
  }

  // ========== ENDEREÇO (SE DELIVERY) ==========
  if (orderType === 'delivery') {
    const endereco = order?.delivery_address || order?.address || '';
    const bairro = order?.neighborhood || '';
    if (endereco) {
      wrapText(`END: ${endereco}`, LINE_WIDTH).forEach((l) => {
        ticket += `${l}\n`;
      });
    }
    if (bairro) {
      ticket += `${bairro}\n`;
    }
  }

  // ========== OBSERVAÇÕES DO PEDIDO ==========
  if (order?.notes) {
    const cleanOrderNotes = String(order.notes).trim();
    // Filtra observações automáticas/sistêmicas (ex: [Rodízio], sabores/bordas, etc)
    const looksAutoGenerated =
      cleanOrderNotes.includes(' | ') ||
      cleanOrderNotes.startsWith('[') ||
      /\[(rod[i\?]zio|rodizio)\]/i.test(cleanOrderNotes) ||
      /sabor|borda|bebida|escolh/i.test(cleanOrderNotes);

    if (!looksAutoGenerated && cleanOrderNotes.length > 0) {
    ticket += '-'.repeat(LINE_WIDTH) + '\n';
    ticket += COMMANDS.BOLD_ON;
      wrapText(`OBS: ${cleanOrderNotes}`, LINE_WIDTH).forEach((l) => {
        ticket += `${l}\n`;
      });
    ticket += COMMANDS.BOLD_OFF;
    }
  }

  ticket += '='.repeat(LINE_WIDTH) + '\n';

  // Itens
  ticket += COMMANDS.BOLD_ON;
  ticket += 'ITENS:\n';
  ticket += COMMANDS.BOLD_OFF;

  for (const item of items || []) {
    const qty = `${item.quantity}x`;
    const nameLines = wrapText(String(item.product_name || '').toUpperCase(), LINE_WIDTH - (qty.length + 1));

    ticket += COMMANDS.BOLD_ON;
    ticket += COMMANDS.DOUBLE_HEIGHT_ON;
    if (nameLines.length > 0) {
      ticket += `${qty} ${nameLines[0]}\n`;
      for (let i = 1; i < nameLines.length; i++) {
        ticket += `${' '.repeat(qty.length + 1)}${nameLines[i]}\n`;
      }
    } else {
      ticket += `${qty}\n`;
    }
    ticket += COMMANDS.NORMAL;
    ticket += COMMANDS.BOLD_OFF;

    // Opções - parse properly to extract ONLY answers, not questions
    if (item.selected_options_json) {
      try {
        const options = typeof item.selected_options_json === 'string'
          ? JSON.parse(item.selected_options_json)
          : item.selected_options_json;

        if (Array.isArray(options)) {
          for (const group of options) {
            // Get group name to determine type
            const groupName = String(group.groupName || group.group_name || '').toLowerCase();
            const items = Array.isArray(group.items) ? group.items : [];
            
            if (items.length === 0) continue;
            
            // Determine if this is a flavor group (for fractions)
            const isFlavorGroup = groupName.includes('sabor') || groupName.includes('pizza');
            const isBorderGroup = groupName.includes('borda');
            
            if (isFlavorGroup) {
              // Print flavors with fractions
              const fraction = items.length === 1 ? '1/1' : `1/${items.length}`;
              for (const sel of items) {
                const label = String(sel.label || sel.name || '');
                if (label) {
                  wrapText(`${fraction} ${label.toUpperCase()}`, LINE_WIDTH - INDENT.length).forEach((l) => {
                    ticket += `${INDENT}${l}\n`;
                  });
                }
              }
            } else if (isBorderGroup) {
              // Print borders
              for (const sel of items) {
                const label = String(sel.label || sel.name || '');
                if (label) {
                  wrapText(`BORDA ${label.toUpperCase()}`, LINE_WIDTH - INDENT.length).forEach((l) => {
                    ticket += `${INDENT}${l}\n`;
                  });
                }
              }
            } else {
              // Print other options with quantity
              for (const sel of items) {
                const label = String(sel.label || sel.name || '');
                const qty = Number(sel.quantity) || 1;
                if (label) {
                  const prefix = qty > 1 ? `${qty}X ` : '';
                  wrapText(`${prefix}${label.toUpperCase()}`, LINE_WIDTH - INDENT.length).forEach((l) => {
                    ticket += `${INDENT}${l}\n`;
                  });
                }
              }
            }
          }
        }
      } catch (e) {
        // ignore parsing
      }
    }

    // Observação do item - ONLY print if it's a genuine customer note (not auto-generated)
    if (item.notes) {
      const cleanNotes = String(item.notes).trim();
      // Skip auto-generated notes that contain question patterns or [Rodízio] prefix
      const looksAutoGenerated = 
        cleanNotes.includes(' | ') ||
        cleanNotes.startsWith('[') ||
        /\[(rod[i\?]zio|rodizio)\]/i.test(cleanNotes) ||
        /sabor|borda|bebida|escolh/i.test(cleanNotes);
      
      if (!looksAutoGenerated && cleanNotes.length > 0) {
        ticket += COMMANDS.BOLD_ON;
        wrapText(`OBS: ${cleanNotes}`, LINE_WIDTH - INDENT.length).forEach((l) => {
          ticket += `${INDENT}${l}\n`;
        });
        ticket += COMMANDS.BOLD_OFF;
      }
    }

    ticket += '-'.repeat(LINE_WIDTH) + '\n';
  }

  // Rodapé
  ticket += COMMANDS.ALIGN_CENTER;
  ticket += `Impresso: ${new Date().toLocaleString('pt-BR')}\n`;
  ticket += COMMANDS.ALIGN_LEFT;
  ticket += '\n\n\n';

  return ticket;
}

/**
 * Formata um TICKET COMPLETO (com valores) - VIA ENTREGADOR/EXPEDIÇÃO
 * Otimizado para 80mm (48 colunas)
 * 
 * REGRAS:
 * - NUNCA usar toLocaleString/Intl.NumberFormat para moeda
 * - Usar moneyBR() do escpos-format.js
 * - Reset de estilo obrigatório após cada bloco destacado
 * - TOTAL não pode quebrar linha
 * - Barcode CODE128 no final para expedição
 */
function formatFullOrder(order, items, companyName) {
  const orderNumber = getOrderDisplayNumber(order);
  const originLabel = sanitize(getOrderOriginLabel(order));
  const fulfillmentLabel = sanitize(getFulfillmentTypeLabel(order));
  const orderType = String(order?.order_type || '').toLowerCase();

  let ticket = '';
  
  // ========== INIT - Reset completo obrigatório ==========
  ticket += INIT_STR;
  ticket += '\n';

  // Nome da empresa (normal, centralizado)
  if (companyName) {
    ticket += COMMANDS.ALIGN_CENTER;
    ticket += COMMANDS.BOLD_ON;
    ticket += `${padCenter(sanitize(companyName).toUpperCase())}\n`;
    ticket += COMMANDS.BOLD_OFF;
    ticket += RESET_STYLE_STR; // Reset após estilo
  }
  
  ticket += '='.repeat(LINE_WIDTH) + '\n';
  
  // ORIGEM - destacado mas SEM double (evita "DELIVERY" gigante)
  ticket += COMMANDS.ALIGN_CENTER;
  ticket += COMMANDS.BOLD_ON;
  ticket += COMMANDS.INVERT_ON;
  ticket += ` ${originLabel} \n`;
  ticket += COMMANDS.INVERT_OFF;
  ticket += COMMANDS.BOLD_OFF;
  ticket += RESET_STYLE_STR; // Reset após destaque
  
  // NÚMERO DO PEDIDO - negrito centralizado
  ticket += COMMANDS.ALIGN_CENTER;
  ticket += COMMANDS.BOLD_ON;
  ticket += `PEDIDO #${orderNumber}\n`;
  ticket += COMMANDS.BOLD_OFF;
  ticket += RESET_STYLE_STR; // Reset
  
  ticket += COMMANDS.ALIGN_LEFT;
  ticket += '-'.repeat(LINE_WIDTH) + '\n';

  // Data/hora do pedido (formatação manual para evitar UTF-8)
  const createdAt = order?.created_at ? new Date(order.created_at) : new Date();
  const day = String(createdAt.getDate()).padStart(2, '0');
  const month = String(createdAt.getMonth() + 1).padStart(2, '0');
  const year = createdAt.getFullYear();
  const hours = String(createdAt.getHours()).padStart(2, '0');
  const mins = String(createdAt.getMinutes()).padStart(2, '0');
  ticket += `Data: ${day}/${month}/${year}  Hora: ${hours}:${mins}\n`;
  
  // Tipo de recebimento
  ticket += `Tipo: ${fulfillmentLabel}\n`;

  ticket += '-'.repeat(LINE_WIDTH) + '\n';

  // Dados do cliente
  if (order?.customer_name) {
    ticket += COMMANDS.BOLD_ON;
    ticket += 'CLIENTE\n';
    ticket += COMMANDS.BOLD_OFF;
    ticket += `${sanitize(order.customer_name).toUpperCase()}\n`;
  }

  if (order?.customer_phone || order?.phone) {
    ticket += `Tel: ${sanitize(order.customer_phone || order.phone)}\n`;
  }

  // Endereço para delivery
  if (orderType === 'delivery' || order?.customer_address) {
    const endereco = order?.customer_address || order?.delivery_address || order?.address || '';
    if (endereco) {
      ticket += '\n';
      ticket += COMMANDS.BOLD_ON;
      ticket += 'ENDERECO DE ENTREGA\n';
      ticket += COMMANDS.BOLD_OFF;
      wrapText(sanitize(endereco).toUpperCase(), LINE_WIDTH).forEach((l) => {
        ticket += `${l}\n`;
      });
    }
  }

  ticket += '-'.repeat(LINE_WIDTH) + '\n';

  // Itens
  ticket += COMMANDS.BOLD_ON;
  ticket += 'ITENS\n';
  ticket += COMMANDS.BOLD_OFF;
  
  const safeItems = items || [];
  let computedTotal = 0;

  for (const item of safeItems) {
    const qty = Number(item.quantity || 0);
    const unit = Number(item.unit_price ?? item.unitPrice ?? 0);
    const lineTotal = qty * unit;

    if (!Number.isNaN(lineTotal)) computedTotal += lineTotal;

    const qtyStr = `${qty}x`;
    const name = sanitize(item.product_name || '').toUpperCase();
    const priceStr = moneyBR(lineTotal); // ASCII puro!
    
    // Usar formatLine para alinhamento correto
    const itemLine = formatLine(`${qtyStr} ${truncate(name, LINE_WIDTH - priceStr.length - qtyStr.length - 3)}`, priceStr);
    ticket += `${itemLine}\n`;

    // Observações do item - skip auto-generated notes
    if (item.notes) {
      const cleanNotes = sanitize(item.notes).trim();
      const looksAutoGenerated = 
        cleanNotes.includes(' | ') ||
        cleanNotes.startsWith('[') ||
        /\[rodízio\]|\[rodizio\]/i.test(cleanNotes) ||
        /sabor|borda|bebida|escolh/i.test(cleanNotes);
      
      if (!looksAutoGenerated && cleanNotes.length > 0) {
        wrapText(`  OBS: ${cleanNotes}`, LINE_WIDTH).forEach((l) => (ticket += `${l}\n`));
      }
    }
  }

  ticket += '-'.repeat(LINE_WIDTH) + '\n';

  // ========== TOTAIS - Reset obrigatório antes ==========
  ticket += RESET_STYLE_STR;
  
  const orderTotal = order?.total ?? null;
  const totalToPrint = orderTotal !== null && orderTotal !== undefined ? orderTotal : computedTotal;
  
  // Subtotal - usando formatLine para alinhamento
  ticket += formatLine('Subtotal:', moneyBR(totalToPrint)) + '\n';

  // Taxa de entrega
  if (order?.delivery_fee && Number(order.delivery_fee) > 0) {
    ticket += formatLine('Taxa Entrega:', moneyBR(order.delivery_fee)) + '\n';
  }

  // Desconto
  if (order?.discount && Number(order.discount) > 0) {
    ticket += formatLine('Desconto:', '-' + moneyBR(order.discount)) + '\n';
  }

  ticket += '='.repeat(LINE_WIDTH) + '\n';

  // ========== TOTAL destacado - CRÍTICO: reset após! ==========
  ticket += COMMANDS.BOLD_ON;
  ticket += COMMANDS.INVERT_ON;
  ticket += formatLine(' TOTAL:', moneyBR(totalToPrint) + ' ') + '\n';
  ticket += COMMANDS.INVERT_OFF;
  ticket += COMMANDS.BOLD_OFF;
  ticket += RESET_STYLE_STR; // RESET OBRIGATÓRIO após TOTAL

  ticket += '='.repeat(LINE_WIDTH) + '\n';

  // Forma de pagamento
  const paymentMethod = order?.payment_method || order?.paymentMethod || '';
  if (paymentMethod) {
    ticket += COMMANDS.ALIGN_CENTER;
    ticket += COMMANDS.BOLD_ON;
    ticket += `Pagamento: ${sanitize(paymentMethod).toUpperCase()}\n`;
    ticket += COMMANDS.BOLD_OFF;
    ticket += COMMANDS.ALIGN_LEFT;
  }

  // Troco
  const changeFor = order?.change_for || order?.changeFor;
  if (changeFor && Number(changeFor) > 0) {
    const changeValue = Number(changeFor) - totalToPrint;
    if (changeValue > 0) {
      ticket += COMMANDS.ALIGN_CENTER;
      ticket += `Troco para ${moneyBR(changeFor)}: ${moneyBR(changeValue)}\n`;
      ticket += COMMANDS.ALIGN_LEFT;
    }
  }

  // Observações gerais
  if (order?.notes) {
    ticket += '-'.repeat(LINE_WIDTH) + '\n';
    ticket += COMMANDS.BOLD_ON;
    ticket += '*** OBSERVACAO ***\n';
    ticket += COMMANDS.BOLD_OFF;
    wrapText(sanitize(order.notes).toUpperCase(), LINE_WIDTH).forEach((l) => {
      ticket += `${l}\n`;
    });
  }

  ticket += '\n';
  ticket += '-'.repeat(LINE_WIDTH) + '\n';

  // ========== BARCODE CODE128 para expedição ==========
  ticket += COMMANDS.ALIGN_CENTER;
  ticket += 'ESCANEIE PARA EXPEDICAO\n';
  ticket += '\n';
  
  // Gerar barcode CODE128 (para leitura no leitor do motoboy)
  // IMPORTANT: usar número do pedido (sequencial) e não UUID
  const barcodeData = `PEDIDO:${getOrderDisplayNumber(order)}`;
  ticket += generateBarcode128(barcodeData);
  
  // Texto do código abaixo do barcode
  ticket += '\n';
  ticket += `${padCenter(barcodeData)}\n`;
  ticket += COMMANDS.ALIGN_LEFT;
  
  ticket += '\n';
  ticket += '-'.repeat(LINE_WIDTH) + '\n';

  // Rodapé
  ticket += COMMANDS.ALIGN_CENTER;
  ticket += COMMANDS.BOLD_ON;
  ticket += 'VIA ENTREGADOR / EXPEDICAO\n';
  ticket += COMMANDS.BOLD_OFF;
  
  // Data/hora impressão (formato manual)
  const now = new Date();
  const nowDay = String(now.getDate()).padStart(2, '0');
  const nowMonth = String(now.getMonth() + 1).padStart(2, '0');
  const nowYear = now.getFullYear();
  const nowHours = String(now.getHours()).padStart(2, '0');
  const nowMins = String(now.getMinutes()).padStart(2, '0');
  const nowSecs = String(now.getSeconds()).padStart(2, '0');
  ticket += `Impresso: ${nowDay}/${nowMonth}/${nowYear} ${nowHours}:${nowMins}:${nowSecs}\n`;
  
  ticket += 'www.zoopi.app.br\n';
  ticket += COMMANDS.ALIGN_LEFT;
  ticket += '\n\n\n';
  ticket += COMMANDS.CUT;

  return ticket;
}

/**
 * Gera comandos ESC/POS para barcode CODE128
 * @param {string} data - Dados do barcode (ex: "ORDER:abc123")
 * @returns {string} Comandos ESC/POS para imprimir barcode
 * 
 * Formato CODE128:
 * - Usa Code Set B (ASCII 32-127)
 * - Começa com {B para indicar Code B
 * - Algumas impressoras requerem formato NUL-terminated, outras length-prefixed
 */
function generateBarcode128(data) {
  if (!data || data.length === 0) {
    console.warn('[barcode] Dados vazios, pulando barcode');
    return '';
  }
  
  let cmd = '';
  
  // Centralizar barcode
  cmd += COMMANDS.ALIGN_CENTER;
  
  // GS h n - Altura do barcode (60 dots = bom tamanho)
  cmd += String.fromCharCode(0x1D, 0x68, 60);
  
  // GS w n - Largura do barcode (2 = fino, bom para códigos longos)
  cmd += String.fromCharCode(0x1D, 0x77, 2);
  
  // GS H n - Posição do HRI (Human Readable Interpretation)
  // 0 = não imprime, 1 = acima, 2 = abaixo, 3 = ambos
  cmd += String.fromCharCode(0x1D, 0x48, 2);
  
  // GS f n - Font do HRI (0 = Font A)
  cmd += String.fromCharCode(0x1D, 0x66, 0);
  
  // Preparar dados com Code Set B prefix
  // {B indica início do Code Set B (ASCII printable)
  const barcodePayload = '{B' + data;
  
  // GS k m n d1...dn - Print barcode
  // m = 73 (0x49) = CODE128
  // n = comprimento dos dados
  cmd += String.fromCharCode(0x1D, 0x6B, 73, barcodePayload.length);
  cmd += barcodePayload;
  
  cmd += '\n';
  cmd += COMMANDS.ALIGN_LEFT;
  
  return cmd;
}

/**
 * Gera comandos ESC/POS para QR Code
 * @param {string} data - Dados do QR Code (URL, texto, etc)
 * @returns {string} Comandos ESC/POS para imprimir QR Code
 * 
 * Formato ESC/POS para QR Code:
 * 1. GS ( k - Seleciona QR Code model
 * 2. GS ( k - Define tamanho do módulo
 * 3. GS ( k - Define nível de correção de erro
 * 4. GS ( k - Armazena os dados
 * 5. GS ( k - Imprime o QR Code
 */
function generateQRCode(data) {
  if (!data || data.length === 0) {
    console.warn('[qrcode] Dados vazios, pulando QR code');
    return '';
  }
  
  let cmd = '';
  
  // Centralizar QR Code
  cmd += COMMANDS.ALIGN_CENTER;
  
  // Função helper para criar comandos GS ( k
  // O formato é: GS ( k pL pH cn fn [parâmetros]
  // pL + pH = comprimento total de cn + fn + parâmetros
  const gsK = (cn, fn, ...params) => {
    // Comprimento inclui cn + fn + params
    const totalLen = 2 + params.length;
    const pL = totalLen % 256;
    const pH = Math.floor(totalLen / 256);
    return String.fromCharCode(0x1D, 0x28, 0x6B, pL, pH, cn, fn, ...params);
  };
  
  // 1. Seleciona modelo QR Code (Model 2)
  // GS ( k pL pH cn fn m1 m2
  // cn=49 (QR Code), fn=65 (seleciona modelo), m1=50 (Model 2), m2=0
  cmd += gsK(49, 65, 50, 0);
  
  // 2. Define tamanho do módulo (4 = médio-grande para melhor leitura)
  // cn=49, fn=67, n=tamanho (1-16)
  cmd += gsK(49, 67, 5);
  
  // 3. Define nível de correção de erro (L=48, M=49, Q=50, H=51)
  // cn=49, fn=69, n=nível
  cmd += gsK(49, 69, 49); // M = 49
  
  // 4. Armazena os dados do QR Code
  // GS ( k pL pH cn fn m d1...dk
  // cn=49, fn=80, m=48 (modo), d1...dk=dados
  // O comprimento pL+pH = 3 (cn, fn, m) + comprimento dos dados
  const storeLen = 3 + data.length;
  const storePL = storeLen % 256;
  const storePH = Math.floor(storeLen / 256);
  cmd += String.fromCharCode(0x1D, 0x28, 0x6B, storePL, storePH, 49, 80, 48);
  cmd += data;
  
  // 5. Imprime o QR Code armazenado
  // cn=49, fn=81, m=48
  cmd += gsK(49, 81, 48);
  
  cmd += '\n';
  cmd += COMMANDS.ALIGN_LEFT;
  
  return cmd;
}

/**
 * Marca job como concluído
 */
async function markJobComplete(jobId) {
  await supabase
    .from('print_job_queue')
    .update({
      status: 'completed',
      printed_at: new Date().toISOString(),
    })
    .eq('id', jobId);
}

/**
 * Marca job como falho
 */
async function markJobFailed(jobId, errorMessage) {
  const { data: job } = await supabase
    .from('print_job_queue')
    .select('attempts')
    .eq('id', jobId)
    .single();

  const attempts = (job?.attempts || 0) + 1;
  const status = attempts >= 3 ? 'failed' : 'pending';

  await supabase
    .from('print_job_queue')
    .update({
      status,
      attempts,
      error_message: errorMessage,
    })
    .eq('id', jobId);
}

/**
 * Formata ticket de pré-conta (table_bill)
 *
 * REGRAS:
 * - ASCII puro via escpos-format.js
 * - 48 colunas (80mm / Fonte A)
 * - TOTAL/Subtotal sempre em UMA linha (sem quebrar)
 * - Reset/Normal após blocos para evitar herança de fonte gigante
 */
function formatTableBill(metadata) {
  // DEBUG: Log dos dados recebidos para verificar trackingUrl e tableNumber
  console.log('[formatTableBill] Metadata recebida:', {
    tableNumber: metadata.tableNumber,
    tableName: metadata.tableName,
    trackingUrl: metadata.trackingUrl,
    tableSessionId: metadata.tableSessionId,
    hasCommands: !!(metadata.commands && metadata.commands.length),
  });

  const unifyItems = (items) => {
    const map = new Map();
    for (const it of items || []) {
      const key = `${it.product_name || ''}|||${it.notes || ''}`;
      const existing = map.get(key);
      if (existing) {
        existing.quantity += Number(it.quantity || 0);
        existing.total_price_cents += Number(it.total_price_cents || 0);
      } else {
        map.set(key, {
          ...it,
          quantity: Number(it.quantity || 0),
          total_price_cents: Number(it.total_price_cents || 0),
        });
      }
    }
    return Array.from(map.values());
  };

  const SEP_DOTS = '.'.repeat(LINE_WIDTH);
  const SEP_SOLID = '-'.repeat(LINE_WIDTH);

  let ticket = '';

  // ========== INIT obrigatório ==========
  ticket += INIT_STR;
  ticket += '\n';

  // ========== NOME DA EMPRESA (simples, centralizado) ==========
  ticket += COMMANDS.ALIGN_CENTER;
  ticket += COMMANDS.BOLD_ON;
  ticket += `${sanitize(metadata.companyName || 'ZOOPI').toUpperCase()}\n`;
  ticket += COMMANDS.BOLD_OFF;
  ticket += RESET_STYLE_STR;
  ticket += '\n';

  // ========== BLOCO PRE-CONTA (invertido) ==========
  ticket += COMMANDS.INVERT_ON;
  ticket += COMMANDS.BOLD_ON;
  ticket += `${padCenter('  PRE-CONTA  ')}\n`;
  ticket += COMMANDS.BOLD_OFF;
  ticket += COMMANDS.INVERT_OFF;
  ticket += RESET_STYLE_STR;
  ticket += '\n';

  // ========== MESA COM ESTRELAS (invertido, double height) ==========
  ticket += COMMANDS.DOUBLE_HEIGHT_ON;
  ticket += COMMANDS.INVERT_ON;
  ticket += COMMANDS.BOLD_ON;
  const mesaText = `*** MESA ${sanitize(metadata.tableNumber)} ***`;
  ticket += `${padCenter('  ' + mesaText + '  ')}\n`;
  ticket += COMMANDS.BOLD_OFF;
  ticket += COMMANDS.INVERT_OFF;
  ticket += COMMANDS.NORMAL;
  ticket += RESET_STYLE_STR;
  ticket += '\n';

  // ========== INFO LINHAS ==========
  ticket += COMMANDS.ALIGN_LEFT;
  ticket += 'TIPO RECEBIMENTO: MESA\n';

  if (metadata.openedAt) {
    const openedDate = new Date(metadata.openedAt);
    const oHours = String(openedDate.getHours()).padStart(2, '0');
    const oMins = String(openedDate.getMinutes()).padStart(2, '0');
    ticket += `HORA PEDIDO: ${oHours}:${oMins}\n`;
  }
  ticket += 'PREVISAO: A DEFINIR\n';
  
  ticket += SEP_DOTS + '\n';

  // ========== CLIENTE / COMANDA ==========
  const commands = metadata.commands || [];
  const primaryCmd = commands[0];
  const comandaNum = primaryCmd?.number ?? 1;
  ticket += COMMANDS.BOLD_ON;
  ticket += `CLIENTE: MESA ${sanitize(metadata.tableNumber)} - COMANDA #${comandaNum}\n`;
  ticket += COMMANDS.BOLD_OFF;
  ticket += '\n';

  // ========== OBSERVAÇÕES HEADER (invertido) ==========
  ticket += COMMANDS.ALIGN_CENTER;
  ticket += COMMANDS.INVERT_ON;
  ticket += COMMANDS.BOLD_ON;
  ticket += `${padCenter('  OBSERVACOES  ')}\n`;
  ticket += COMMANDS.BOLD_OFF;
  ticket += COMMANDS.INVERT_OFF;
  ticket += RESET_STYLE_STR;
  ticket += '\n';

  // ========== COMANDAS ==========
  for (const cmd of commands) {
    const cmdTitle = cmd.name ? sanitize(cmd.name).toUpperCase() : `COMANDA #${sanitize(cmd.number || '')}`.trim();

    ticket += COMMANDS.ALIGN_LEFT;
    ticket += COMMANDS.BOLD_ON;
    ticket += `${cmdTitle}\n`;
    ticket += COMMANDS.BOLD_OFF;
    ticket += SEP_DOTS + '\n';

    // ITENS header
    ticket += 'ITENS:\n';

    const items = unifyItems(cmd.items || []);
    for (const item of items) {
      const qtyStr = `${Number(item.quantity || 0)}x`;
      const priceStr = moneyCents(Number(item.total_price_cents || 0));
      const nameMax = LINE_WIDTH - qtyStr.length - priceStr.length - 2;
      const name = truncate(sanitize(item.product_name || ''), nameMax);
      
      ticket += `${qtyStr} ${name.padEnd(nameMax)} ${priceStr}\n`;

      // Observações do item (indentadas)
      if (item.notes) {
        const notes = sanitize(item.notes);
        wrapText(notes, LINE_WIDTH - 2).forEach((l) => {
          ticket += `  ${l}\n`;
        });
      }
    }

    ticket += '\n';
  }

  // ========== LINHA SÓLIDA ==========
  ticket += SEP_SOLID + '\n';

  // ========== SUBTOTAL ==========
  ticket += formatLine('Subtotal:', moneyCents(Number(metadata.subtotalCents || 0))) + '\n';

  // ========== TOTAL (bloco invertido) ==========
  ticket += '\n';
  ticket += COMMANDS.ALIGN_CENTER;
  ticket += COMMANDS.INVERT_ON;
  ticket += COMMANDS.BOLD_ON;
  const totalValue = moneyCents(Number(metadata.totalCents || 0));
  const totalLine = `TOTAL:${' '.repeat(Math.max(1, 20 - totalValue.length))}${totalValue}`;
  ticket += `${padCenter(totalLine)}\n`;
  ticket += COMMANDS.BOLD_OFF;
  ticket += COMMANDS.INVERT_OFF;
  ticket += RESET_STYLE_STR;
  ticket += COMMANDS.ALIGN_LEFT;
  ticket += '\n';

  ticket += SEP_DOTS + '\n';

  // ========== PAGAMENTO ==========
  ticket += COMMANDS.ALIGN_CENTER;
  ticket += COMMANDS.BOLD_ON;
  ticket += 'Pagamento: A DEFINIR\n';
  ticket += COMMANDS.BOLD_OFF;
  ticket += '\n';

  ticket += SEP_DOTS + '\n';

  // ========== ACOMPANHE SEU PEDIDO ==========
  ticket += '\n';
  ticket += `${padCenter('ACOMPANHE SEU PEDIDO')}\n`;
  ticket += COMMANDS.ALIGN_LEFT;
  ticket += '\n';

  // Espaçamento extra antes do corte para não cortar em cima do texto
  ticket += '\n\n\n\n\n';
  
  // IMPORTANTE: Comando de corte automático
  ticket += COMMANDS.CUT;

  return ticket;
}

/**
 * Formata cupom de sangria (retirada de caixa)
 * Usa ASCII puro via escpos-format.js
 */
function formatSangria(metadata) {
  let ticket = '';
  ticket += INIT_STR;
  ticket += '\n';
  
  // Cabeçalho
  ticket += COMMANDS.ALIGN_CENTER;
  ticket += COMMANDS.BOLD_ON;
  ticket += COMMANDS.INVERT_ON;
  ticket += ' SANGRIA / RETIRADA \n';
  ticket += COMMANDS.INVERT_OFF;
  ticket += COMMANDS.BOLD_OFF;
  ticket += RESET_STYLE_STR;
  ticket += '\n';
  
  // Empresa
  if (metadata.companyName) {
    ticket += `${sanitize(metadata.companyName)}\n`;
  }
  ticket += '\n';
  
  ticket += COMMANDS.ALIGN_LEFT;
  ticket += '='.repeat(LINE_WIDTH) + '\n';
  
  // Data/hora formatada manualmente
  const timestamp = metadata.timestamp ? new Date(metadata.timestamp) : new Date();
  const tDay = String(timestamp.getDate()).padStart(2, '0');
  const tMonth = String(timestamp.getMonth() + 1).padStart(2, '0');
  const tYear = timestamp.getFullYear();
  const tHours = String(timestamp.getHours()).padStart(2, '0');
  const tMins = String(timestamp.getMinutes()).padStart(2, '0');
  ticket += `Data: ${tDay}/${tMonth}/${tYear}\n`;
  ticket += `Hora: ${tHours}:${tMins}\n`;
  ticket += `Operador: ${sanitize(metadata.operatorName || 'Nao informado')}\n`;
  
  ticket += '='.repeat(LINE_WIDTH) + '\n';
  ticket += '\n';
  
  // Valor destacado - usando moneyBR
  ticket += COMMANDS.ALIGN_CENTER;
  ticket += COMMANDS.BOLD_ON;
  ticket += COMMANDS.INVERT_ON;
  ticket += ` VALOR: ${moneyBR(metadata.amount)} \n`;
  ticket += COMMANDS.INVERT_OFF;
  ticket += COMMANDS.BOLD_OFF;
  ticket += RESET_STYLE_STR;
  ticket += '\n';
  
  ticket += COMMANDS.ALIGN_LEFT;
  ticket += '-'.repeat(LINE_WIDTH) + '\n';
  
  // Motivo
  ticket += COMMANDS.BOLD_ON;
  ticket += 'MOTIVO:\n';
  ticket += COMMANDS.BOLD_OFF;
  wrapText(sanitize(metadata.reason || 'Nao informado'), LINE_WIDTH).forEach((l) => {
    ticket += `${l}\n`;
  });
  
  ticket += '\n';
  ticket += '-'.repeat(LINE_WIDTH) + '\n';
  ticket += '\n\n';
  
  // Assinaturas
  ticket += COMMANDS.ALIGN_CENTER;
  ticket += '_'.repeat(30) + '\n';
  ticket += 'Assinatura do Operador\n';
  ticket += '\n\n\n';
  ticket += '_'.repeat(30) + '\n';
  ticket += 'Assinatura do Gerente\n';
  ticket += '\n\n';
  
  ticket += COMMANDS.ALIGN_LEFT;
  ticket += COMMANDS.CUT;
  
  return ticket;
}

/**
 * Formata cupom de suprimento (entrada de caixa)
 * Usa ASCII puro via escpos-format.js
 */
function formatSuprimento(metadata) {
  let ticket = '';
  ticket += INIT_STR;
  ticket += '\n';
  
  // Cabeçalho
  ticket += COMMANDS.ALIGN_CENTER;
  ticket += COMMANDS.BOLD_ON;
  ticket += COMMANDS.INVERT_ON;
  ticket += ' SUPRIMENTO / REFORCO \n';
  ticket += COMMANDS.INVERT_OFF;
  ticket += COMMANDS.BOLD_OFF;
  ticket += RESET_STYLE_STR;
  ticket += '\n';
  
  // Empresa
  if (metadata.companyName) {
    ticket += `${sanitize(metadata.companyName)}\n`;
  }
  ticket += '\n';
  
  ticket += COMMANDS.ALIGN_LEFT;
  ticket += '='.repeat(LINE_WIDTH) + '\n';
  
  // Data/hora formatada manualmente
  const timestamp = metadata.timestamp ? new Date(metadata.timestamp) : new Date();
  const tDay = String(timestamp.getDate()).padStart(2, '0');
  const tMonth = String(timestamp.getMonth() + 1).padStart(2, '0');
  const tYear = timestamp.getFullYear();
  const tHours = String(timestamp.getHours()).padStart(2, '0');
  const tMins = String(timestamp.getMinutes()).padStart(2, '0');
  ticket += `Data: ${tDay}/${tMonth}/${tYear}\n`;
  ticket += `Hora: ${tHours}:${tMins}\n`;
  ticket += `Operador: ${sanitize(metadata.operatorName || 'Nao informado')}\n`;
  
  ticket += '='.repeat(LINE_WIDTH) + '\n';
  ticket += '\n';
  
  // Valor destacado - usando moneyBR
  ticket += COMMANDS.ALIGN_CENTER;
  ticket += COMMANDS.BOLD_ON;
  ticket += COMMANDS.INVERT_ON;
  ticket += ` VALOR: ${moneyBR(metadata.amount)} \n`;
  ticket += COMMANDS.INVERT_OFF;
  ticket += COMMANDS.BOLD_OFF;
  ticket += RESET_STYLE_STR;
  ticket += '\n';
  
  ticket += COMMANDS.ALIGN_LEFT;
  ticket += '-'.repeat(LINE_WIDTH) + '\n';
  
  // Motivo
  if (metadata.reason) {
    ticket += COMMANDS.BOLD_ON;
    ticket += 'MOTIVO:\n';
    ticket += COMMANDS.BOLD_OFF;
    wrapText(sanitize(metadata.reason), LINE_WIDTH).forEach((l) => {
      ticket += `${l}\n`;
    });
    ticket += '\n';
  }
  
  ticket += '-'.repeat(LINE_WIDTH) + '\n';
  ticket += '\n\n';
  
  // Assinaturas
  ticket += COMMANDS.ALIGN_CENTER;
  ticket += '_'.repeat(30) + '\n';
  ticket += 'Assinatura do Operador\n';
  ticket += '\n\n\n';
  ticket += '_'.repeat(30) + '\n';
  ticket += 'Assinatura do Gerente\n';
  ticket += '\n\n';
  
  ticket += COMMANDS.ALIGN_LEFT;
  ticket += COMMANDS.CUT;
  
  return ticket;
}

/**
 * Processa um job de impressão
 */
async function processJob(job) {
  if (processedJobs.has(job.id) || isProcessing) {
    return;
  }

  isProcessing = true;
  processedJobs.add(job.id);
  const config = getConfig();

  try {
    console.log(`📄 Processando job ${job.id.slice(0, 8)} (tipo: ${job.job_type})...`);

    // ==== PROCESSAR TABLE_BILL (PRÉ-CONTA) ====
    if (job.job_type === 'table_bill') {
      const metadata = job.metadata;
      if (!metadata) {
        throw new Error('Metadata não encontrada para table_bill');
      }

      // NOVO: Usar bitmap-renderer para QR Code e Barcode
      // Renderiza QR/Barcode como imagens bitmap (GS v 0) para compatibilidade universal
      let bitmapRenderer = null;
      try {
        bitmapRenderer = require('./bitmap-renderer');
      } catch (e) {
        console.warn('[table_bill] bitmap-renderer não disponível, usando ESC/POS texto:', e.message);
      }

      // Resolve alvo de impressão.
      const printMode = metadata.printMode || config.printerType;
      const printerHost = metadata.printerHost || config.printerHost;
      const printerPort = metadata.printerPort || config.printerPort;
      const printerName = (config.printerName || metadata.printerName || '').trim();

      console.log(
        `   Pré-conta Mesa ${metadata.tableNumber} - Modo: ${printMode}, Impressora: ${printMode === 'windows' || printMode === 'usb' ? printerName : printerHost}`
      );
      
      if (bitmapRenderer) {
        // MÉTODO BITMAP: QR Code e Barcode renderizados como imagem
        console.log('   → Usando bitmap-renderer (QR/Barcode como imagem)');
        await bitmapRenderer.printTableBillBitmap(metadata, {
          printMode,
          printerHost,
          printerPort,
          printerName,
        });
      } else {
        // FALLBACK: ESC/POS texto (pode não funcionar em todas impressoras)
        console.log('   → Usando formatTableBill (ESC/POS texto)');
        const content = formatTableBill(metadata);
        await printContent(content, { 
          copies: config.copies,
          printerHost,
          printerPort,
          printerName,
          printMode,
        });
      }
      
      await markJobComplete(job.id);
      stats.printed++;
      stats.lastPrint = new Date().toISOString();
      stats.lastError = null;
      console.log(`   ✓ Pré-conta mesa ${metadata.tableNumber} impressa!`);
      return;
    }

    // ==== PROCESSAR SOMMELIER_TICKET (DICA DO ENÓLOGO) ====
    if (job.job_type === 'sommelier_ticket') {
      const metadata = job.metadata || {};
      const raw = String(metadata.ticketContent || '').trim();
      if (!raw) {
        throw new Error('ticketContent não encontrado para sommelier_ticket');
      }

      const sanitizeSommelier = (input) => {
        const str = String(input || '')
          .replace(/[\u{1F300}-\u{1FAFF}]/gu, '')
          .replace(/[─━]/g, '-')
          .replace(/[═]/g, '=');
        const noDia = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return noDia.replace(/[^\x0A\x0D\x20-\x7E]/g, '');
      };

      const content = sanitizeSommelier(raw) + '\n\n\n';
      await printContent(content, { copies: config.copies });

      await markJobComplete(job.id);
      stats.printed++;
      stats.lastPrint = new Date().toISOString();
      stats.lastError = null;
      console.log('   ✓ Ticket do enólogo impresso!');
      return;
    }

    // ==== PROCESSAR CASH_OPERATION (ABRIR GAVETA / SANGRIA / SUPRIMENTO) ====
    if (job.job_type === 'cash_operation' || job.job_type === 'cash_sangria' || job.job_type === 'cash_opening_supply') {
      const metadata = job.metadata || {};

      // Comando de abrir gaveta
      if (metadata.command === 'open_drawer' && metadata.rawData) {
        const rawBytes = new Uint8Array(metadata.rawData);
        
        // Usa impressora do metadata se disponível, senão a global
        const printerHost = metadata.printerHost || config.printerHost;
        const printerPort = metadata.printerPort || config.printerPort;
        const printerName = metadata.printerName || config.printerName;
        
        // Converte Uint8Array para string de bytes para o printContent
        const rawCommand = String.fromCharCode.apply(null, rawBytes);
        
        await printContent(rawCommand, {
          copies: 1, // Apenas 1 comando de gaveta
          printerHost,
          printerPort,
          printerName,
        });
        
        await markJobComplete(job.id);
        stats.printed++;
        stats.lastPrint = new Date().toISOString();
        stats.lastError = null;
        console.log(`   ✓ Gaveta aberta!`);
        return;
      }

      // Sangria / Retirada
      if (metadata.type === 'sangria' || job.job_type === 'cash_sangria') {
        const content = formatSangria(metadata);
        await printContent(content, { copies: 1 });
        
        await markJobComplete(job.id);
        stats.printed++;
        stats.lastPrint = new Date().toISOString();
        stats.lastError = null;
        console.log(`   ✓ Cupom de sangria impresso!`);
        return;
      }

      // Suprimento
      if (metadata.type === 'suprimento' || job.job_type === 'cash_opening_supply') {
        const content = formatSuprimento(metadata);
        await printContent(content, { copies: 1 });
        
        await markJobComplete(job.id);
        stats.printed++;
        stats.lastPrint = new Date().toISOString();
        stats.lastError = null;
        console.log(`   ✓ Cupom de suprimento impresso!`);
        return;
      }

      // Fallback para comandos desconhecidos
      throw new Error(`Comando de caixa desconhecido: ${JSON.stringify(metadata)}`);
    }

    // ==== PROCESSAR FULL_ORDER (TICKET COMPLETO) ====
    if (job.job_type === 'full_order') {
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', job.order_id)
        .single();

      if (orderError || !order) {
        throw new Error(`Pedido não encontrado: ${job.order_id}`);
      }

      // Buscar nome da empresa
      let companyName = config.companyName || null;
      if (!companyName && order.company_id) {
        const { data: company } = await supabase
          .from('companies')
          .select('name')
          .eq('id', order.company_id)
          .single();
        if (company) companyName = company.name;
      }

      const { data: items, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', job.order_id);

      if (itemsError) {
        throw new Error(`Erro ao buscar itens: ${itemsError.message}`);
      }

      const content = formatFullOrder(order, items || [], companyName);
      await printContent(content, { copies: config.copies });

      await markJobComplete(job.id);
      stats.printed++;
      stats.lastPrint = new Date().toISOString();
      stats.lastError = null;
      console.log(`   ✓ Ticket completo impresso!`);
      return;
    }

    // ==== PROCESSAR ORDER (PEDIDO) ====
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', job.order_id)
      .single();

    if (orderError || !order) {
      const extra = orderError
        ? ` (${orderError.code || 'erro'}: ${orderError.message})`
        : ' (possível falta de permissão: verifique o login do agente)';
      throw new Error(`Pedido não encontrado: ${job.order_id}${extra}`);
    }

    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', job.order_id);

    if (itemsError) {
      throw new Error(`Erro ao buscar itens: ${itemsError.message}`);
    }

    // Buscar configuração da impressora do setor (se houver)
    let sectorPrintMode = null;
    let sectorPrinterName = null;
    let sectorPrinterHost = null;
    let sectorPrinterPort = 9100;
    
    if (job.print_sector_id) {
      const { data: sector } = await supabase
        .from('print_sectors')
        .select('name, print_mode, printer_name, printer_host, printer_port')
        .eq('id', job.print_sector_id)
        .single();
      
      if (sector) {
        sectorPrintMode = sector.print_mode;
        sectorPrinterName = sector.printer_name;
        sectorPrinterHost = sector.printer_host;
        sectorPrinterPort = sector.printer_port || 9100;
        
        console.log(`   Setor: ${sector.name}, Modo: ${sectorPrintMode}, Impressora: ${sectorPrinterName || sectorPrinterHost || 'global'}`);
      }
    }

    // ===== FILTRAGEM DE ITENS USANDO product_ids DO METADATA =====
    // O createPrintJobsForOrder já calculou quais produtos vão para cada setor
    // e salvou em metadata.product_ids. Devemos usar isso diretamente.
    let filteredItems = items || [];
    const metadataProductIds = job.metadata?.product_ids;
    
    if (metadataProductIds && Array.isArray(metadataProductIds) && metadataProductIds.length > 0) {
      // Usa os product_ids pré-calculados (correto!)
      filteredItems = (items || []).filter(item => metadataProductIds.includes(item.product_id));
      console.log(`   Filtrando por metadata.product_ids: ${metadataProductIds.length} produtos -> ${filteredItems.length} itens`);
    } else if (job.print_sector_id) {
      // Fallback: buscar mapeamento diretamente (menos ideal, mas compatível)
      const { data: productMappings } = await supabase
        .from('product_print_sectors')
        .select('product_id')
        .eq('sector_id', job.print_sector_id);
      
      if (productMappings && productMappings.length > 0) {
        const sectorProductIds = productMappings.map(m => m.product_id);
        filteredItems = (items || []).filter(item => sectorProductIds.includes(item.product_id));
        console.log(`   Filtrando por product_print_sectors: ${sectorProductIds.length} produtos -> ${filteredItems.length} itens`);
      }
    }

    if (filteredItems.length === 0) {
      console.log('   Nenhum item para este setor - pulando impressão');
      await markJobComplete(job.id);
      return;
    }

    const content = formatOrder(order, filteredItems, null);
    
    // Passa as configurações do setor para a impressão
    await printContent(content, { 
      copies: config.copies,
      printMode: sectorPrintMode,
      printerName: sectorPrinterName,
      printerHost: sectorPrinterHost,
      printerPort: sectorPrinterPort,
    });

    await markJobComplete(job.id);

    stats.printed++;
    stats.lastPrint = new Date().toISOString();
    stats.lastError = null;
    console.log(`   ✓ Impresso!`);
    
    // Notificação silenciosa (apenas log)

  } catch (error) {
    console.error(`   ❌ Erro: ${error.message}`);
    await markJobFailed(job.id, error.message);
    stats.failed++;
    stats.lastError = error.message;
    
    // Notifica erro
    notifyPrintError(job.order_id || job.id, error.message);
  } finally {
    isProcessing = false;
  }
}

/**
 * Busca jobs pendentes
 */
async function fetchPendingJobs() {
  const config = getConfig();

  const runQuery = async () => {
    const query = supabase
      .from('print_job_queue')
      .select('*')
      .eq('status', 'pending')
      .in('job_type', ['order', 'full_order', 'table_bill', 'sommelier_ticket', 'cash_operation', 'cash_sangria', 'cash_opening_supply', 'comanda_bill'])
      .order('created_at', { ascending: true })
      .limit(10);

    if (config.companyId) {
      query.eq('company_id', config.companyId);
    }

    return await query;
  };

  let { data, error } = await runQuery();

  // Se o token expirou, reautentica e tenta 1 vez novamente
  if (error && isJwtExpiredError(error)) {
    try {
      await ensureAgentAuthenticated('jwt_expired');
      ({ data, error } = await runQuery());
    } catch (e) {
      error = error || e;
    }
  }

  if (error) {
    console.error('Erro ao buscar jobs:', error.message);
    return [];
  }

  return data || [];
}

/**
 * Loop de polling
 */
async function pollLoop() {
  if (!stats.isRunning) return;
  
  try {
    const jobs = await fetchPendingJobs();
    for (const job of jobs) {
      await processJob(job);
    }
    
    // Reseta contador de reconexão em sucesso
    if (reconnectAttempts > 0 && wasConnected) {
      reconnectAttempts = 0;
      notifyReconnected();
    }
    wasConnected = true;
    
  } catch (error) {
    console.error('Erro no poll:', error.message);
    
    reconnectAttempts++;
    if (reconnectAttempts === 1) {
      notifyConnectionLost();
    }
  }
}

/**
 * Inicia o agente
 */
async function startAgent() {
  const config = getConfig();

  if (stats.isRunning) {
    return { success: true, message: 'Já está rodando' };
  }

  if (!config.supabaseUrl || !config.supabaseKey) {
    return { success: false, error: 'Configure URL e Key' };
  }

  if (!config.companyId) {
    return { success: false, error: 'Configure o ID da Empresa' };
  }

  // Para ambientes com fila protegida por permissões (RLS), o agente PRECISA autenticar.
  if (!config.agentEmail || !config.agentPassword) {
    return { success: false, error: 'Configure Email e Senha do Agente' };
  }

  try {
    // Cliente principal do agente (mantém sessão e renova token automaticamente)
    supabase = createClient(config.supabaseUrl, config.supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });

    // Garante login inicial
    await ensureAgentAuthenticated('startup');

    // Observa eventos de auth para reautenticar caso algo zere a sessão
    if (authSubscription) {
      try {
        authSubscription.unsubscribe();
      } catch (_) {}
      authSubscription = null;
    }

    const { data: authData } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_OUT') {
        // tenta recuperar automaticamente sem depender do operador
        try {
          await ensureAgentAuthenticated('signed_out');
        } catch (e) {
          console.error('Auth: falha ao reautenticar após SIGNED_OUT:', e.message);
        }
      }
    });

    authSubscription = authData?.subscription || null;

    console.log('✓ Agente autenticado (auto-refresh habilitado)');

    realtimeChannel = supabase
      .channel('print-agent-desktop')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'print_job_queue',
          filter: `company_id=eq.${config.companyId}`,
        },
        (payload) => {
          console.log('🔔 Novo job via realtime');
          processJob(payload.new);
        }
      )
      .subscribe((status) => {
        console.log('Realtime status:', status);
      });

    pollIntervalId = setInterval(pollLoop, config.pollInterval);

    stats.isRunning = true;
    stats.started = new Date().toISOString();
    stats.lastError = null;
    processedJobs.clear();
    reconnectAttempts = 0;
    wasConnected = false;

    // Limpar jobs antigos pendentes antes de iniciar (evita reimprimir tickets velhos)
    try {
      console.log('🧹 Limpando jobs antigos (>30min) antes de iniciar...');
      const threshold = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      const { data: deletedJobs, error: deleteErr } = await supabase
        .from('print_job_queue')
        .delete()
        .eq('company_id', config.companyId)
        .eq('status', 'pending')
        .lt('created_at', threshold)
        .select('id');
      
      if (!deleteErr && deletedJobs?.length > 0) {
        console.log(`   ✓ ${deletedJobs.length} job(s) antigo(s) removido(s)`);
      }
    } catch (cleanupErr) {
      console.warn('   ⚠ Falha ao limpar jobs antigos:', cleanupErr.message);
    }

    // Primeiro poll imediato
    await pollLoop();

    console.log('✓ Agente iniciado');
    return { success: true };
  } catch (e) {
    stats.isRunning = false;
    stats.lastError = e.message;
    console.error('❌ Não foi possível iniciar o agente:', e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Para o agente
 */
function stopAgent() {
  if (pollIntervalId) {
    clearInterval(pollIntervalId);
    pollIntervalId = null;
  }

  if (realtimeChannel) {
    supabase?.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }

  if (authSubscription) {
    try {
      authSubscription.unsubscribe();
    } catch (_) {}
    authSubscription = null;
  }

  try {
    supabase?.auth?.stopAutoRefresh?.();
  } catch (_) {}

  stats.isRunning = false;
  console.log('⏹️ Agente parado');
  return { success: true };
}

/**
 * Retorna estatísticas
 */
function getStats() {
  return { ...stats };
}

/**
 * Imprime página de teste
 */
async function printTest() {
  try {
    await printTestPage();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

module.exports = {
  startAgent,
  stopAgent,
  getStats,
  printTest,
  processJob,
};
