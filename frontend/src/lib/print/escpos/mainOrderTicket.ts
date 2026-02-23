/**
 * Main Order Ticket Template - Cupom Térmico Profissional
 * 
 * Hierarquia Visual (80mm / 48 colunas):
 * 
 * ┌──────────────────────────────────────────────┐
 * │  [INVERTIDO 2X]  NOME DA EMPRESA             │  28px - GRANDE
 * ├──────────────────────────────────────────────┤
 * │  [INVERTIDO 2X]  PEDIDO #XXX                 │  24px - ENORME
 * ├──────────────────────────────────────────────┤
 * │  [INVERTIDO 2X]  TIPO: DELIVERY              │  18px - MÉDIO
 * ├──────────────────────────────────────────────┤
 * │  Hora: HH:MM    Data: DD/MM/YYYY             │  Normal
 * │  Previsão: A DEFINIR                         │  Normal
 * ├──────────────────────────────────────────────┤
 * │  [INVERTIDO]  CLIENTE                        │  Header seção
 * │  Nome: FULANO DE TAL                         │  Normal
 * │  Fone: (XX) XXXXX-XXXX                       │  Bold
 * ├──────────────────────────────────────────────┤
 * │  [INVERTIDO 2X]  ENDERECO                    │  GRANDE - DESTAQUE
 * │  Rua das Flores, 123                         │  GRANDE - Bold
 * │  Bairro Centro - Complemento                 │  GRANDE - Bold
 * ├──────────────────────────────────────────────┤
 * │  [INVERTIDO]  ITENS                          │  Header seção
 * │  ┌────────────────────────────────────────┐  │
 * │  │ 2x HAMBURGUER ESPECIAL     R$ 45,90   │  │  Item em "caixa"
 * │  │    + Bacon extra                       │  │
 * │  └────────────────────────────────────────┘  │
 * ├──────────────────────────────────────────────┤
 * │  Subtotal:                       R$ XX,XX    │  Normal
 * │  Taxa Entrega:                   R$ XX,XX    │  Normal
 * ├──────────────────────────────────────────────┤
 * │  [INVERTIDO 2X]  TOTAL:         R$ XX,XX    │  GRANDE
 * ├──────────────────────────────────────────────┤
 * │  [INVERTIDO]  PAGAMENTO                      │  Header seção
 * │  Metodo: DINHEIRO                            │  GRANDE
 * │  [INVERTIDO 2X]  TROCO: R$ X,XX             │  GRANDE
 * ├──────────────────────────────────────────────┤
 * │  [QRCODE + BARCODE - via bitmap]             │
 * └──────────────────────────────────────────────┘
 */

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ESCPOS, LINE } from './commands';
import {
  reset,
  sanitizeText,
  wrapText,
  formatCurrency,
} from './styles';

const LINE_WIDTH = LINE.WIDTH; // 48

// ========== HELPER FUNCTIONS ==========

/** Gera linha centralizada com padding */
function centerLine(text: string, width: number = LINE_WIDTH): string {
  const clean = sanitizeText(text);
  if (clean.length >= width) return clean.slice(0, width);
  const leftPad = Math.floor((width - clean.length) / 2);
  return ' '.repeat(leftPad) + clean;
}

/** Gera linha key-value alinhada */
function keyValue(key: string, value: string, width: number = LINE_WIDTH): string {
  const keyClean = sanitizeText(key);
  const valueClean = sanitizeText(value);
  const padding = width - keyClean.length - valueClean.length;
  return keyClean + ' '.repeat(Math.max(1, padding)) + valueClean;
}

/** Bloco de separador completo */
function separator(char: string = '='): string {
  return char.repeat(LINE_WIDTH) + ESCPOS.LF;
}

/** Bloco de separador duplo */
function doubleSeparator(): string {
  return '='.repeat(LINE_WIDTH) + ESCPOS.LF;
}

// ========== DATA INTERFACE ==========

export interface MainOrderTicketData {
  companyName: string;
  orderId: string;
  orderNumber?: string | number | null;
  orderType?: 'table' | 'delivery' | 'pickup' | 'dine_in' | string | null;
  tableNumber?: number | null;
  comandaNumber?: number | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerAddress?: string | null;
  createdAt: string;
  estimatedAt?: string | null;
  items: Array<{
    quantity: number;
    productName: string;
    unitPriceCents: number;
    totalPriceCents: number;
    notes?: string | null;
    additionals?: string[] | null;
  }>;
  subtotalCents: number;
  discountCents?: number | null;
  deliveryFeeCents?: number | null;
  surchargeCents?: number | null;
  totalCents: number;
  paymentMethod?: string | null;
  changeForCents?: number | null;
  notes?: string | null;
  website?: string | null;
  phone?: string | null;
}

export interface BuildMainOrderTicketOptions {
  omitCut?: boolean;
}

// ========== NORMALIZERS ==========

function normalizePaymentMethod(method: string | null | undefined): string {
  if (!method) return 'NAO INFORMADO';
  const m = method.toLowerCase().trim();
  const map: Record<string, string> = {
    'pix': 'PIX',
    'cash': 'DINHEIRO',
    'money': 'DINHEIRO',
    'dinheiro': 'DINHEIRO',
    'credit': 'CARTAO CREDITO',
    'debit': 'CARTAO DEBITO',
    'credit_card': 'CARTAO CREDITO',
    'debit_card': 'CARTAO DEBITO',
    'cartao': 'CARTAO',
    'voucher': 'VALE REFEICAO',
    'ifood': 'PAGO IFOOD',
  };
  return map[m] || method.toUpperCase();
}

function normalizeOrderType(orderType: string | null | undefined): string {
  if (!orderType) return 'PEDIDO';
  const t = orderType.toLowerCase().trim();
  const map: Record<string, string> = {
    'table': 'MESA',
    'dine_in': 'CONSUMO LOCAL',
    'delivery': 'DELIVERY',
    'pickup': 'RETIRADA',
    'takeout': 'BALCAO',
  };
  return map[t] || orderType.toUpperCase();
}

// ========== MAIN BUILDER ==========

export function buildMainOrderTicketEscPos(
  data: MainOrderTicketData,
  options: BuildMainOrderTicketOptions = {}
): string {
  const orderNum = data.orderNumber 
    ? String(data.orderNumber).padStart(3, '0')
    : data.orderId.slice(0, 8).toUpperCase();
  
  const createdTime = format(new Date(data.createdAt), 'HH:mm', { locale: ptBR });
  const createdDate = format(new Date(data.createdAt), 'dd/MM/yyyy', { locale: ptBR });
  const printedAt = format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR });
  
  const tipoRecebimento = normalizeOrderType(data.orderType);
  const isDelivery = tipoRecebimento === 'DELIVERY';
  
  let ticket = '';
  
  // ===== INIT =====
  ticket += reset();
  
  // ═══════════════════════════════════════════════════════════════════════
  // BLOCO 1: NOME DA EMPRESA (INVERTIDO, 2X ALTURA, CENTRALIZADO)
  // CSS: .empresa-nome { font-size: 28px; font-weight: bold; }
  // ═══════════════════════════════════════════════════════════════════════
  ticket += ESCPOS.ALIGN_CENTER;
  ticket += ESCPOS.SIZE_DOUBLE_HEIGHT;
  ticket += ESCPOS.INVERT_ON;
  ticket += ESCPOS.BOLD_ON;
  ticket += ' ' + sanitizeText(data.companyName).toUpperCase() + ' ' + ESCPOS.LF;
  ticket += ESCPOS.BOLD_OFF;
  ticket += ESCPOS.INVERT_OFF;
  ticket += ESCPOS.SIZE_NORMAL;
  ticket += ESCPOS.LF;
  
  // ═══════════════════════════════════════════════════════════════════════
  // BLOCO 2: NÚMERO DO PEDIDO (INVERTIDO, 2X ALTURA, CENTRALIZADO)
  // CSS: .bloco-invertido.grande { font-size: 24px; }
  // ═══════════════════════════════════════════════════════════════════════
  ticket += ESCPOS.SIZE_DOUBLE_HEIGHT;
  ticket += ESCPOS.INVERT_ON;
  ticket += ESCPOS.BOLD_ON;
  ticket += centerLine(`*** PEDIDO #${orderNum} ***`) + ESCPOS.LF;
  ticket += ESCPOS.BOLD_OFF;
  ticket += ESCPOS.INVERT_OFF;
  ticket += ESCPOS.SIZE_NORMAL;
  ticket += ESCPOS.LF;
  
  // ═══════════════════════════════════════════════════════════════════════
  // BLOCO 3: TIPO DE ENTREGA (INVERTIDO, 2X ALTURA)
  // CSS: .bloco-invertido.medio { font-size: 18px; }
  // ═══════════════════════════════════════════════════════════════════════
  ticket += ESCPOS.SIZE_DOUBLE_HEIGHT;
  ticket += ESCPOS.INVERT_ON;
  ticket += ESCPOS.BOLD_ON;
  ticket += centerLine(`  ${tipoRecebimento}  `) + ESCPOS.LF;
  ticket += ESCPOS.BOLD_OFF;
  ticket += ESCPOS.INVERT_OFF;
  ticket += ESCPOS.SIZE_NORMAL;
  ticket += ESCPOS.LF;
  
  // ═══════════════════════════════════════════════════════════════════════
  // BLOCO 4: DADOS BÁSICOS (hora, data, previsão)
  // CSS: .dados-basicos { font-size: 12px; }
  // ═══════════════════════════════════════════════════════════════════════
  ticket += doubleSeparator();
  ticket += ESCPOS.ALIGN_LEFT;
  ticket += keyValue('HORA PEDIDO:', createdTime) + ESCPOS.LF;
  ticket += keyValue('DATA:', createdDate) + ESCPOS.LF;
  
  const previsao = data.estimatedAt 
    ? format(new Date(data.estimatedAt), 'HH:mm', { locale: ptBR })
    : 'A DEFINIR';
  ticket += keyValue('PREVISAO:', previsao) + ESCPOS.LF;
  
  // Mesa/Comanda (se aplicável)
  if (data.tableNumber) {
    ticket += keyValue('MESA:', String(data.tableNumber)) + ESCPOS.LF;
  }
  if (data.comandaNumber) {
    ticket += keyValue('COMANDA:', `#${data.comandaNumber}`) + ESCPOS.LF;
  }
  
  ticket += doubleSeparator();
  
  // ═══════════════════════════════════════════════════════════════════════
  // BLOCO 5: CLIENTE (nome e telefone)
  // CSS: .secao-cliente { border: 2px solid #000; }
  // ═══════════════════════════════════════════════════════════════════════
  ticket += ESCPOS.ALIGN_CENTER;
  ticket += ESCPOS.INVERT_ON;
  ticket += ESCPOS.BOLD_ON;
  ticket += centerLine('  CLIENTE  ') + ESCPOS.LF;
  ticket += ESCPOS.BOLD_OFF;
  ticket += ESCPOS.INVERT_OFF;
  ticket += ESCPOS.ALIGN_LEFT;
  ticket += ESCPOS.LF;
  
  // Nome do cliente
  let clientName = 'CONSUMIDOR';
  if (data.tableNumber) {
    clientName = `MESA ${data.tableNumber}`;
    if (data.comandaNumber) {
      clientName += ` - COMANDA #${data.comandaNumber}`;
    }
  } else if (data.customerName) {
    clientName = sanitizeText(data.customerName).toUpperCase();
  }
  
  ticket += ESCPOS.BOLD_ON;
  ticket += `Nome: ${clientName}` + ESCPOS.LF;
  ticket += ESCPOS.BOLD_OFF;
  
  // Telefone (se houver)
  if (data.customerPhone) {
    ticket += `Fone: ${data.customerPhone}` + ESCPOS.LF;
  }
  
  ticket += ESCPOS.LF;
  
  // ═══════════════════════════════════════════════════════════════════════
  // BLOCO 6: ENDEREÇO (DESTAQUE ESPECIAL PARA DELIVERY)
  // CSS: .cliente-endereco { font-size: 16px; font-weight: bold; background: #f0f0f0; }
  // ═══════════════════════════════════════════════════════════════════════
  if (isDelivery || data.customerAddress) {
    ticket += ESCPOS.ALIGN_CENTER;
    ticket += ESCPOS.SIZE_DOUBLE_HEIGHT;
    ticket += ESCPOS.INVERT_ON;
    ticket += ESCPOS.BOLD_ON;
    ticket += centerLine('  ENDERECO  ') + ESCPOS.LF;
    ticket += ESCPOS.BOLD_OFF;
    ticket += ESCPOS.INVERT_OFF;
    ticket += ESCPOS.SIZE_NORMAL;
    ticket += ESCPOS.ALIGN_LEFT;
    ticket += ESCPOS.LF;
    
    if (data.customerAddress) {
      // Endereço em fonte GRANDE e BOLD
      ticket += ESCPOS.SIZE_DOUBLE_HEIGHT;
      ticket += ESCPOS.BOLD_ON;
      const addrLines = wrapText(data.customerAddress, 24); // 24 cols em 2x
      for (const line of addrLines) {
        ticket += line + ESCPOS.LF;
      }
      ticket += ESCPOS.BOLD_OFF;
      ticket += ESCPOS.SIZE_NORMAL;
    } else {
      // Se delivery sem endereço, ALERTA GRANDE
      ticket += ESCPOS.SIZE_DOUBLE_HEIGHT;
      ticket += ESCPOS.BOLD_ON;
      ticket += 'ENDERECO NAO INFORMADO!' + ESCPOS.LF;
      ticket += ESCPOS.BOLD_OFF;
      ticket += ESCPOS.SIZE_NORMAL;
    }
    
    ticket += ESCPOS.LF;
  }
  
  ticket += doubleSeparator();
  
  // ═══════════════════════════════════════════════════════════════════════
  // BLOCO 7: OBSERVAÇÕES GERAIS (se houver)
  // ═══════════════════════════════════════════════════════════════════════
  if (data.notes) {
    ticket += ESCPOS.ALIGN_CENTER;
    ticket += ESCPOS.INVERT_ON;
    ticket += ESCPOS.BOLD_ON;
    ticket += centerLine('  OBSERVACOES  ') + ESCPOS.LF;
    ticket += ESCPOS.BOLD_OFF;
    ticket += ESCPOS.INVERT_OFF;
    ticket += ESCPOS.ALIGN_LEFT;
    ticket += ESCPOS.LF;
    
    ticket += ESCPOS.BOLD_ON;
    const noteLines = wrapText(data.notes, LINE_WIDTH);
    for (const line of noteLines) {
      ticket += line + ESCPOS.LF;
    }
    ticket += ESCPOS.BOLD_OFF;
    ticket += ESCPOS.LF;
    ticket += doubleSeparator();
  }
  
  // ═══════════════════════════════════════════════════════════════════════
  // BLOCO 8: ITENS (cada item em "caixa" com quantidade destacada)
  // CSS: .item { border: 2px solid #000; }
  // CSS: .item-quantidade { font-size: 18px; font-weight: bold; }
  // ═══════════════════════════════════════════════════════════════════════
  ticket += ESCPOS.ALIGN_CENTER;
  ticket += ESCPOS.INVERT_ON;
  ticket += ESCPOS.BOLD_ON;
  ticket += centerLine('  ITENS DO PEDIDO  ') + ESCPOS.LF;
  ticket += ESCPOS.BOLD_OFF;
  ticket += ESCPOS.INVERT_OFF;
  ticket += ESCPOS.ALIGN_LEFT;
  ticket += ESCPOS.LF;
  
  for (const item of data.items) {
    // Linha superior da "caixa"
    ticket += '-'.repeat(LINE_WIDTH) + ESCPOS.LF;
    
    // Quantidade grande
    const qty = item.quantity;
    const priceStr = formatCurrency(item.totalPriceCents);
    
    ticket += ESCPOS.SIZE_DOUBLE_HEIGHT;
    ticket += ESCPOS.BOLD_ON;
    ticket += `${qty}x ` + ESCPOS.LF;
    ticket += ESCPOS.SIZE_NORMAL;
    
    // Nome do produto
    const nameClean = sanitizeText(item.productName).toUpperCase();
    const nameLines = wrapText(nameClean, LINE_WIDTH);
    for (const line of nameLines) {
      ticket += line + ESCPOS.LF;
    }
    ticket += ESCPOS.BOLD_OFF;
    
    // Preço alinhado à direita
    ticket += priceStr.padStart(LINE_WIDTH) + ESCPOS.LF;
    
    // Adicionais
    if (item.additionals && item.additionals.length > 0) {
      for (const add of item.additionals) {
        ticket += `  + ${sanitizeText(add)}` + ESCPOS.LF;
      }
    }
    
    // Observação do item
    if (item.notes) {
      ticket += ESCPOS.BOLD_ON;
      ticket += '  OBS: ' + ESCPOS.LF;
      const itemNoteLines = wrapText(item.notes, LINE_WIDTH - 4);
      for (const line of itemNoteLines) {
        ticket += '    ' + line + ESCPOS.LF;
      }
      ticket += ESCPOS.BOLD_OFF;
    }
  }
  
  // Linha final dos itens
  ticket += '-'.repeat(LINE_WIDTH) + ESCPOS.LF;
  ticket += ESCPOS.LF;
  
  // ═══════════════════════════════════════════════════════════════════════
  // BLOCO 9: SUBTOTAL E TAXAS
  // ═══════════════════════════════════════════════════════════════════════
  ticket += keyValue('Subtotal:', formatCurrency(data.subtotalCents)) + ESCPOS.LF;
  
  if (data.discountCents && data.discountCents > 0) {
    ticket += keyValue('Desconto:', `-${formatCurrency(data.discountCents)}`) + ESCPOS.LF;
  }
  
  if (data.surchargeCents && data.surchargeCents > 0) {
    ticket += keyValue('Acrescimo:', `+${formatCurrency(data.surchargeCents)}`) + ESCPOS.LF;
  }
  
  if (data.deliveryFeeCents && data.deliveryFeeCents > 0) {
    ticket += keyValue('Taxa Entrega:', formatCurrency(data.deliveryFeeCents)) + ESCPOS.LF;
  }
  
  ticket += ESCPOS.LF;
  
  // ═══════════════════════════════════════════════════════════════════════
  // BLOCO 10: TOTAL (INVERTIDO, 2X ALTURA) - O MAIS IMPORTANTE
  // CSS: .total-grande { font-size: 20px; background: #000; color: #fff; }
  // ═══════════════════════════════════════════════════════════════════════
  ticket += ESCPOS.SIZE_DOUBLE_HEIGHT;
  ticket += ESCPOS.INVERT_ON;
  ticket += ESCPOS.BOLD_ON;
  ticket += keyValue('  TOTAL:', formatCurrency(data.totalCents) + '  ', LINE_WIDTH) + ESCPOS.LF;
  ticket += ESCPOS.BOLD_OFF;
  ticket += ESCPOS.INVERT_OFF;
  ticket += ESCPOS.SIZE_NORMAL;
  ticket += ESCPOS.LF;
  
  ticket += doubleSeparator();
  
  // ═══════════════════════════════════════════════════════════════════════
  // BLOCO 11: PAGAMENTO (seção destacada)
  // CSS: .secao-pagamento { border: 2px solid #000; }
  // ═══════════════════════════════════════════════════════════════════════
  ticket += ESCPOS.ALIGN_CENTER;
  ticket += ESCPOS.INVERT_ON;
  ticket += ESCPOS.BOLD_ON;
  ticket += centerLine('  PAGAMENTO  ') + ESCPOS.LF;
  ticket += ESCPOS.BOLD_OFF;
  ticket += ESCPOS.INVERT_OFF;
  ticket += ESCPOS.ALIGN_LEFT;
  ticket += ESCPOS.LF;
  
  const paymentLabel = normalizePaymentMethod(data.paymentMethod);
  
  // Método de pagamento GRANDE
  ticket += ESCPOS.SIZE_DOUBLE_HEIGHT;
  ticket += ESCPOS.BOLD_ON;
  ticket += ESCPOS.ALIGN_CENTER;
  ticket += paymentLabel + ESCPOS.LF;
  ticket += ESCPOS.SIZE_NORMAL;
  ticket += ESCPOS.BOLD_OFF;
  ticket += ESCPOS.ALIGN_LEFT;
  
  // Troco (se houver) - INVERTIDO e GRANDE
  if (data.changeForCents && data.changeForCents > data.totalCents) {
    const troco = data.changeForCents - data.totalCents;
    ticket += ESCPOS.LF;
    ticket += ESCPOS.SIZE_DOUBLE_HEIGHT;
    ticket += ESCPOS.INVERT_ON;
    ticket += ESCPOS.BOLD_ON;
    ticket += ESCPOS.ALIGN_CENTER;
    ticket += ` TROCO: ${formatCurrency(troco)} ` + ESCPOS.LF;
    ticket += ESCPOS.BOLD_OFF;
    ticket += ESCPOS.INVERT_OFF;
    ticket += ESCPOS.SIZE_NORMAL;
    ticket += ESCPOS.ALIGN_LEFT;
    
    ticket += ESCPOS.ALIGN_CENTER;
    ticket += `(Troco p/ ${formatCurrency(data.changeForCents)})` + ESCPOS.LF;
    ticket += ESCPOS.ALIGN_LEFT;
  }
  
  ticket += ESCPOS.LF;
  ticket += doubleSeparator();
  
  // ═══════════════════════════════════════════════════════════════════════
  // BLOCO 12: ACOMPANHE SEU PEDIDO (QRCode + Barcode via bitmap)
  // ═══════════════════════════════════════════════════════════════════════
  ticket += ESCPOS.ALIGN_CENTER;
  ticket += ESCPOS.INVERT_ON;
  ticket += ESCPOS.BOLD_ON;
  ticket += centerLine('  ACOMPANHE SEU PEDIDO  ') + ESCPOS.LF;
  ticket += ESCPOS.BOLD_OFF;
  ticket += ESCPOS.INVERT_OFF;
  ticket += ESCPOS.LF;
  
  // Placeholder para bitmap (será anexado pelo createPrintJobsForOrder)
  ticket += 'Escaneie o QRCode ou codigo abaixo' + ESCPOS.LF;
  ticket += ESCPOS.LF;
  
  // ═══════════════════════════════════════════════════════════════════════
  // BLOCO 13: FOOTER
  // ═══════════════════════════════════════════════════════════════════════
  ticket += separator('-');
  ticket += ESCPOS.LF;
  ticket += 'Obrigado pela preferencia!' + ESCPOS.LF;
  
  if (data.website) {
    ticket += sanitizeText(data.website) + ESCPOS.LF;
  }
  if (data.phone) {
    ticket += `Tel: ${data.phone}` + ESCPOS.LF;
  }
  
  ticket += ESCPOS.LF;
  ticket += `Impresso: ${printedAt}` + ESCPOS.LF;
  ticket += ESCPOS.ALIGN_LEFT;
  
  // ═══════════════════════════════════════════════════════════════════════
  // RESET + SPACE (+ CUT opcional)
  // ═══════════════════════════════════════════════════════════════════════
  ticket += ESCPOS.LF + ESCPOS.LF + ESCPOS.LF + ESCPOS.LF + ESCPOS.LF;
  ticket += reset();
  
  if (!options.omitCut) {
    ticket += ESCPOS.CUT;
  }
  
  return ticket;
}

// ========== CONVERTER FROM ORDER ==========

export function orderToMainTicketData(
  order: {
    id: string;
    order_number?: number | string | null;
    order_type?: string | null;
    table_number?: number | string | null;
    comanda_number?: number | string | null;
    customer_name?: string | null;
    customer_phone?: string | null;
    customer_address?: any | null;
    destination_address?: string | null;
    address_notes?: string | null;
    items?: Array<{
      quantity: number;
      product_name?: string;
      unit_price?: number;
      observation?: string;
      notes?: string;
      additionals?: any[];
    }>;
    subtotal?: number;
    discount?: number;
    delivery_fee?: number;
    total: number;
    payment_method?: string | null;
    change_for?: number | null;
    notes?: string | null;
    created_at: string;
    estimated_at?: string | null;
  },
  companyName: string,
  companyPhone?: string,
  companyWebsite?: string
): MainOrderTicketData {
  // Converter itens
  const items = (order.items || []).map(item => ({
    quantity: item.quantity || 1,
    productName: item.product_name || 'Item',
    unitPriceCents: Math.round((item.unit_price || 0) * 100),
    totalPriceCents: Math.round((item.unit_price || 0) * (item.quantity || 1) * 100),
    notes: item.observation || item.notes || null,
    additionals: item.additionals?.map((a: any) => a.name || String(a)) || null,
  }));
  
  // Montar endereço completo
  let customerAddress: string | null = null;
  
  // 1. Tentar customer_address como string
  if (typeof order.customer_address === 'string' && order.customer_address.trim()) {
    customerAddress = order.customer_address.trim();
  }
  // 2. Tentar customer_address como objeto
  else if (order.customer_address && typeof order.customer_address === 'object') {
    const addr = order.customer_address;
    const parts = [
      addr.street,
      addr.number ? `N ${addr.number}` : null,
      addr.complement,
      addr.neighborhood ? `Bairro: ${addr.neighborhood}` : null,
      addr.city,
      addr.state,
      addr.zip_code || addr.cep,
    ].filter(Boolean);
    if (parts.length > 0) {
      customerAddress = parts.join(', ');
    }
  }
  // 3. Tentar destination_address
  else if (order.destination_address && order.destination_address.trim()) {
    customerAddress = order.destination_address.trim();
  }
  
  // 4. Adicionar complemento/referência
  if (order.address_notes && order.address_notes.trim()) {
    customerAddress = customerAddress
      ? `${customerAddress} | REF: ${order.address_notes.trim()}`
      : `REF: ${order.address_notes.trim()}`;
  }
  
  return {
    companyName,
    orderId: order.id,
    orderNumber: order.order_number,
    orderType: order.order_type,
    tableNumber: order.table_number ? Number(order.table_number) : null,
    comandaNumber: order.comanda_number ? Number(order.comanda_number) : null,
    customerName: order.customer_name,
    customerPhone: order.customer_phone,
    customerAddress,
    createdAt: order.created_at,
    estimatedAt: order.estimated_at,
    items,
    subtotalCents: Math.round((order.subtotal || order.total) * 100),
    discountCents: order.discount ? Math.round(order.discount * 100) : null,
    deliveryFeeCents: order.delivery_fee ? Math.round(order.delivery_fee * 100) : null,
    totalCents: Math.round(order.total * 100),
    paymentMethod: order.payment_method,
    changeForCents: order.change_for ? Math.round(order.change_for * 100) : null,
    notes: order.notes,
    website: companyWebsite,
    phone: companyPhone,
  };
}
