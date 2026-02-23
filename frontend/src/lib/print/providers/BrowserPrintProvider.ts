/**
 * Browser Print Provider - Customer Receipt / Ticket Principal
 * 
 * LAYOUT PADRONIZADO:
 * - Cabeçalho: Nome do estabelecimento, CNPJ, endereço
 * - Nº do pedido + origem + data/hora
 * - Dados do cliente
 * - Observações do pedido
 * - Itens com quantidade, descrição, preço
 * - Totais: subtotal, taxas, descontos, total final
 * - Pagamento: forma de pagamento, troco
 * 
 * REGRAS:
 * - Validar dados obrigatórios antes de imprimir
 * - Se faltar dado obrigatório, bloquear e mostrar erro
 */
import { Order } from '@/hooks/useOrders';
import { PrintProvider, PrintResult, PrintConfig } from '../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { buildItemPrintBlock } from '@/lib/receiptFormatting';
import { getOrderTypeLabel } from '@/lib/orderTypeLabel';
import { formatPrintFooter, DEFAULT_FOOTER, PrintFooterConfig } from '../printFooter';
import { 
  validateCustomerTicket, 
  extractOrderOrigin, 
  formatValidationErrors,
  logValidationFailure,
  type CustomerTicketData 
} from '../ticketValidation';

const receiptTypeLabels: Record<string, string> = {
  entrega: 'DELIVERY',
  retirada: 'RETIRADA',
  local: 'CONSUMO NO LOCAL',
};

const paymentMethodLabels: Record<string, string> = {
  pix: 'PIX',
  dinheiro: 'DINHEIRO',
  money: 'DINHEIRO',
  cash: 'DINHEIRO',
  cartao_credito: 'CARTÃO CRÉDITO',
  credit: 'CARTÃO CRÉDITO',
  cartao_debito: 'CARTÃO DÉBITO',
  debit: 'CARTÃO DÉBITO',
  cashier_qr: 'QR CODE CAIXA',
};

/**
 * Browser Print Provider - Thermal Receipt Style
 * 
 * LAYOUT OPERACIONAL OTIMIZADO:
 * - Suporte a bobinas 58mm e 80mm
 * - Fonte monospace para impressoras térmicas
 * - Contraste máximo (preto no branco)
 * - Hierarquia visual clara com negrito, tamanho e inversão
 * - Leitura rápida na cozinha e despacho
 */
export class BrowserPrintProvider implements PrintProvider {
  readonly id = 'browser';
  readonly name = 'Impressora do Navegador';
  
  private config: PrintConfig = {};
  private footerConfig: PrintFooterConfig | null = null;

  isAvailable(): boolean {
    return typeof window !== 'undefined' && typeof window.print === 'function';
  }

  configure(config: PrintConfig): void {
    this.config = { ...this.config, ...config };
  }

  setFooterConfig(footerConfig: PrintFooterConfig | null): void {
    this.footerConfig = footerConfig;
  }

  async printOrder(order: Order & { address_notes?: string | null }, companyName?: string, companyInfo?: { cnpj?: string; address?: string; phone?: string }): Promise<PrintResult> {
    try {
      const html = this.generateOrderHtml(order, companyName, companyInfo);

      // In kiosk/fullscreen environments, popups are commonly blocked.
      // Printing via a hidden iframe is more reliable than window.open.
      return await this.printHtmlViaIframe(html);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido ao imprimir',
      };
    }
  }

  private printHtmlViaIframe(html: string): Promise<PrintResult> {
    return new Promise((resolve) => {
      try {
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
              cleanup();
              resolve({ success: true, printedAt: new Date() });
            } catch (e) {
              cleanup();
              resolve({
                success: false,
                error: e instanceof Error ? e.message : 'Falha ao acionar impressão',
              });
            }
          }, 150);
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
          // If already resolved, this is harmless.
          // If not, attempt printing anyway.
          const w = iframe.contentWindow;
          if (!w) return;
          try {
            w.focus();
            w.print();
            cleanup();
            resolve({ success: true, printedAt: new Date() });
          } catch (e) {
            cleanup();
            resolve({
              success: false,
              error: e instanceof Error ? e.message : 'Timeout ao tentar imprimir',
            });
          }
        }, 2000);
      } catch (e) {
        resolve({
          success: false,
          error: e instanceof Error ? e.message : 'Erro ao preparar impressão',
        });
      }
    });
  }


  private generateOrderHtml(order: Order & { address_notes?: string | null; order_number?: number | null; source?: string | null }, companyName?: string, companyInfo?: { cnpj?: string; address?: string; phone?: string }): string {
    // Validate before generating
    const validationData: CustomerTicketData = {
      orderId: order.id,
      orderNumber: order.order_number,
      origin: extractOrderOrigin(order as any),
      createdAt: order.created_at,
      items: (order.items || []).map(item => ({
        quantity: item.quantity,
        product_name: item.product_name,
        unit_price: item.unit_price,
      })),
      total: order.total,
      paymentMethod: order.payment_method,
      customerName: order.customer_name,
      customerPhone: order.customer_phone,
      customerAddress: order.customer_address,
      notes: (order as any).notes,
      deliveryFee: order.delivery_fee,
      status: order.status,
    };
    
    const validation = validateCustomerTicket(validationData);
    if (!validation.valid) {
      logValidationFailure('customer', order.id, validation);
      return this.generateErrorHtml(order.id, validation);
    }

    // Use order_number if available, otherwise fallback to ID
    const orderNumber = order.order_number 
      ? String(order.order_number).padStart(3, '0')
      : order.id.slice(0, 8).toUpperCase();
    const receiptType = order.receipt_type ? receiptTypeLabels[order.receipt_type] || order.receipt_type.toUpperCase() : 'DELIVERY';
    const paymentMethod = order.payment_method ? paymentMethodLabels[order.payment_method] || order.payment_method.toUpperCase() : '';
    
    // Extract command info if available
    const commandNumber = (order as any).command_number ?? null;
    const commandName = (order as any).command_name ?? null;
    const hasCommandInfo = commandNumber !== null || commandName !== null;
    
    // Origem do pedido usando função centralizada
    const originLabel = extractOrderOrigin(order as any);
    const orderTypeInfo = getOrderTypeLabel(order.order_type, order.source, (order as any).eat_here);
    const orderTypePrintLabel = `★★★ ${originLabel} ★★★`;
    
    // Horários
    const orderTime = format(new Date(order.created_at), "HH:mm", { locale: ptBR });
    
    // Calcular hora prevista baseado em eta_minutes ou usar estimatedDelivery
    let estimatedTime: string | null = null;
    if ((order as any).eta_minutes) {
      const etaDate = new Date(order.created_at);
      etaDate.setMinutes(etaDate.getMinutes() + (order as any).eta_minutes);
      estimatedTime = format(etaDate, "HH:mm", { locale: ptBR });
    } else if ((order as any).estimated_delivery_at) {
      estimatedTime = format(new Date((order as any).estimated_delivery_at), "HH:mm", { locale: ptBR });
    }
    
    // Build items block (single representation; no snapshot "* ..."; no wrapping)
    const LINE_LEN = 42;
    const itemsHtml = order.items?.map(item => {
      const block = buildItemPrintBlock({
        qty: item.quantity,
        name: item.product_name,
        price: item.quantity * item.unit_price,
        selectedOptionsJson: (item as any).selected_options_json,
        notes: item.notes,
        lineLen: LINE_LEN,
        childMaxLen: LINE_LEN - 4,
      });

      return `<pre class="item-pre">${block.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</pre>`;
    }).join('<div class="item-gap"></div>') || '<div class="item-row">Nenhum item</div>';

    // Troco
    const changeFor = order.change_for;
    const needsChange = order.payment_method === 'dinheiro' && changeFor && changeFor > order.total;
    const changeAmount = needsChange ? (changeFor - order.total).toFixed(2) : null;

    // Valores
    const deliveryFee = order.delivery_fee || 0;
    const subtotal = order.total - deliveryFee;

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Pedido #${orderNumber}</title>
  <style>
    /* ===== RESET E BASE ===== */
    @page { 
      size: 80mm auto; 
      margin: 2mm; 
    }
    * { 
      margin: 0; 
      padding: 0; 
      box-sizing: border-box; 
    }
    body { 
      font-family: 'Courier New', 'Lucida Console', Consolas, monospace; 
      font-size: 12px; 
      width: 76mm;
      max-width: 76mm;
      padding: 4px;
      line-height: 1.4;
      color: #000;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    /* ===== HIERARQUIA DE FONTES ===== */
    .h2 { font-size: 16px; }
    .h3 { font-size: 14px; }
    .h4 { font-size: 11px; }
    .bold { font-weight: bold; }
    .center { text-align: center; }
    
    /* ===== INVERSÃO DE COR ===== */
    .inverted {
      background-color: #000 !important;
      color: #fff !important;
      padding: 8px 4px;
      margin: 4px 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    /* ===== SEPARADORES ===== */
    .separator {
      border: none;
      border-top: 1px dashed #000;
      margin: 8px 0;
    }
    .separator-double {
      border: none;
      border-top: 2px solid #000;
      margin: 8px 0;
    }
    
    /* ===== SEÇÕES ===== */
    .section {
      margin: 8px 0;
    }
    
    /* ===== CABEÇALHO EMPRESA ===== */
    .company-header {
      text-align: center;
      margin-bottom: 8px;
    }
    .company-name {
      font-size: 18px;
      font-weight: bold;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .company-cnpj,
    .company-address {
      font-size: 11px;
    }
    .company-phone {
      font-size: 14px;
      font-weight: bold;
    }
    
    /* ===== IDENTIFICAÇÃO DO PEDIDO ===== */
    .order-number {
      background-color: #000 !important;
      color: #fff !important;
      font-size: 20px;
      font-weight: bold;
      text-align: center;
      padding: 10px;
      margin: 8px 0;
      letter-spacing: 2px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .order-type {
      font-size: 18px;
      font-weight: bold;
      text-align: center;
      margin: 6px 0;
    }
    .order-times {
      font-size: 16px;
      font-weight: bold;
      margin: 4px 0;
    }
    
    /* ===== DADOS DO CLIENTE ===== */
    .customer-section {
      margin: 8px 0;
    }
    .customer-line {
      font-size: 16px;
      font-weight: bold;
      margin: 4px 0;
      word-wrap: break-word;
    }
    
    /* ===== OBSERVAÇÕES ===== */
    .obs-section {
      margin: 8px 0;
    }
    .obs-title {
      background-color: #000 !important;
      color: #fff !important;
      font-size: 16px;
      font-weight: bold;
      text-align: center;
      padding: 6px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .obs-content {
      background-color: #000 !important;
      color: #fff !important;
      font-size: 16px;
      font-weight: bold;
      padding: 8px;
      margin-top: 2px;
      word-wrap: break-word;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    /* ===== ITENS ===== */
    .items-title {
      font-size: 12px;
      font-weight: bold;
      margin-bottom: 6px;
      text-decoration: none;
      color: #000;
    }

    .item-pre {
      font-size: 12px;
      font-weight: bold;
      white-space: pre;
      overflow: hidden;
      margin: 0;
    }

    .item-gap { height: 8px; }
    
    /* ===== TOTAIS ===== */
    .totals-section {
      margin: 8px 0;
    }
    .total-line {
      display: flex;
      justify-content: space-between;
      font-size: 16px;
      font-weight: bold;
      margin: 4px 0;
    }
    .total-final {
      background-color: #000 !important;
      color: #fff !important;
      display: flex;
      justify-content: space-between;
      font-size: 18px;
      font-weight: bold;
      padding: 10px 8px;
      margin: 8px 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    /* ===== PAGAMENTO ===== */
    .payment-section {
      margin: 8px 0;
      text-align: center;
    }
    .payment-method {
      font-size: 16px;
      font-weight: bold;
      margin: 4px 0;
    }
    .change-section {
      background-color: #000 !important;
      color: #fff !important;
      font-size: 16px;
      font-weight: bold;
      text-align: center;
      padding: 10px;
      margin: 8px 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    /* ===== RODAPÉ ===== */
    .footer {
      text-align: center;
      font-size: 11px;
      margin-top: 12px;
      padding-top: 8px;
      border-top: 1px dashed #000;
    }
    
    @media print {
      body { 
        width: 100%; 
        max-width: 76mm;
      }
    }
  </style>
</head>
<body>

  <!-- ================================ -->
  <!-- 1️⃣ CABEÇALHO DA EMPRESA -->
  <!-- ================================ -->
  <div class="company-header">
    <div class="company-name">${companyName || 'ESTABELECIMENTO'}</div>
    ${companyInfo?.cnpj ? `<div class="company-cnpj">CNPJ: ${companyInfo.cnpj}</div>` : ''}
    ${companyInfo?.address ? `<div class="company-address">${companyInfo.address}</div>` : ''}
    ${companyInfo?.phone ? `<div class="company-phone">Tel: ${companyInfo.phone}</div>` : ''}
  </div>
  
  <hr class="separator-double" />
  
  <!-- ================================ -->
  <!-- 2️⃣ IDENTIFICAÇÃO DO PEDIDO -->
  <!-- ================================ -->
  <div class="order-number">PEDIDO #${orderNumber}</div>
  
  ${hasCommandInfo ? `
  <div style="background: #f59e0b; color: #000; font-size: 16px; font-weight: bold; text-align: center; padding: 8px; margin: 4px 0; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
    🏷️ COMANDA ${commandNumber ? `#${commandNumber}` : ''}${commandName ? ` - ${commandName.toUpperCase()}` : ''}
  </div>
  ` : ''}
  
  <!-- TIPO DE PEDIDO BEM DESTACADO -->
  <div class="order-type-highlight" style="background-color: ${orderTypeInfo.bgColor}; color: ${orderTypeInfo.textColor}; font-size: 22px; font-weight: bold; text-align: center; padding: 12px; margin: 8px 0; letter-spacing: 2px; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
    ${orderTypePrintLabel}
  </div>
  
  <div class="order-type">TIPO RECEBIMENTO: ${receiptType}</div>
  
  <div class="order-times">HORA PEDIDO: ${orderTime}</div>
  <div class="order-times">PREVISÃO: ${estimatedTime || 'A DEFINIR'}</div>
  
  <hr class="separator" />
  
  <!-- ================================ -->
  <!-- 3️⃣ DADOS DO CLIENTE -->
  <!-- ================================ -->
  <div class="customer-section">
    ${order.customer_name ? `<div class="customer-line">CLIENTE: ${order.customer_name.toUpperCase()}</div>` : ''}
    ${order.customer_phone ? `<div class="customer-line">TEL: ${order.customer_phone}</div>` : ''}
    ${order.customer_address ? `<div class="customer-line">END: ${order.customer_address.toUpperCase()}</div>` : ''}
    ${order.address_notes ? `<div class="customer-line" style="background:#000;color:#fff;padding:4px;margin-top:4px;">📍 ${order.address_notes.toUpperCase()}</div>` : ''}
  </div>
  
  <!-- ================================ -->
  <!-- 4️⃣ OBSERVAÇÕES DO PEDIDO -->
  <!-- ================================ -->
  ${order.notes ? `
  <div class="obs-section">
    <div class="obs-title">████ OBSERVAÇÕES ████</div>
    <div class="obs-content">${order.notes.toUpperCase()}</div>
  </div>
  ` : ''}
  
  <hr class="separator-double" />
  
  <!-- ================================ -->
  <!-- 5️⃣ ITENS DO PEDIDO -->
  <!-- ================================ -->
  <div class="items-title">ITENS:</div>
  <div class="items-section">
    ${itemsHtml}
  </div>
  
  <hr class="separator" />
  
  <!-- ================================ -->
  <!-- TOTAIS -->
  <!-- ================================ -->
  <div class="totals-section">
    <div class="total-line">
      <span>Subtotal:</span>
      <span>R$ ${subtotal.toFixed(2)}</span>
    </div>
    ${deliveryFee > 0 ? `
    <div class="total-line">
      <span>Taxa Entrega:</span>
      <span>R$ ${deliveryFee.toFixed(2)}</span>
    </div>
    ` : ''}
  </div>
  
  <div class="total-final">
    <span>TOTAL:</span>
    <span>R$ ${Number(order.total).toFixed(2)}</span>
  </div>
  
  <hr class="separator" />
  
  <!-- ================================ -->
  <!-- 6️⃣ RODAPÉ - PAGAMENTO -->
  <!-- ================================ -->
  <div class="payment-section">
    ${paymentMethod ? `<div class="payment-method">Pagamento: ${paymentMethod}</div>` : ''}
  </div>
  
  ${needsChange ? `
  <div class="change-section">
    <div>TROCO PARA: R$ ${changeFor?.toFixed(2)}</div>
    <div style="font-size: 20px; margin-top: 4px;">LEVAR TROCO: R$ ${changeAmount}</div>
  </div>
  ` : ''}
  
  <!-- ================================ -->
  <!-- QR CODE ACOMPANHAMENTO -->
  <!-- ================================ -->
  <div class="qr-section" style="text-align: center; margin: 12px 0; padding: 8px; border: 1px dashed #000;">
    <div style="font-size: 11px; font-weight: bold; margin-bottom: 6px;">📱 ACOMPANHE SEU PEDIDO</div>
    <div style="display: flex; justify-content: center; margin-bottom: 4px;">
      <img 
        src="https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(`${typeof window !== 'undefined' ? window.location.origin : 'https://tenant-base-forge.lovable.app'}/acompanhar/${order.id}`)}" 
        alt="QR Code" 
        style="width: 80px; height: 80px;"
        onerror="this.parentElement.parentElement.style.display='none'"
      />
    </div>
    <div style="font-size: 9px; color: #666;">Escaneie para ver o status em tempo real</div>
  </div>

  <div class="footer">
    <div style="margin-bottom: 4px;"><img src="/zoopi-logo.png" alt="Zoopi" style="height: 25px; opacity: 0.8;" onerror="this.style.display='none'" /></div>
    <div>Obrigado pela preferência!</div>
    <div>${this.footerConfig ? formatPrintFooter(this.footerConfig) : formatPrintFooter(DEFAULT_FOOTER)}</div>
  </div>

</body>
</html>`;
  }

  /**
   * Generate error HTML when validation fails
   */
  private generateErrorHtml(orderId: string, validation: { errors: string[] }): string {
    const errorList = validation.errors.map(e => `<li style="margin: 4px 0;">${e}</li>`).join('');
    
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Erro de Impressão</title>
  <style>
    @page { size: 80mm auto; margin: 2mm; }
    body { 
      font-family: 'Courier New', monospace; 
      padding: 10px; 
      max-width: 76mm;
      color: #000;
      background: #fff;
    }
    .error-title { 
      background: #dc2626; 
      color: #fff; 
      padding: 12px; 
      text-align: center; 
      font-weight: bold;
      font-size: 16px;
      margin-bottom: 10px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .error-list { 
      margin: 10px 0; 
      padding-left: 20px;
      font-size: 12px;
    }
    .order-id { 
      font-size: 10px; 
      color: #666;
      margin-top: 10px;
      text-align: center;
    }
    .action-hint {
      font-size: 11px;
      text-align: center;
      margin-top: 10px;
      padding: 8px;
      border: 1px dashed #000;
    }
  </style>
</head>
<body>
  <div class="error-title">⚠️ IMPRESSÃO BLOQUEADA</div>
  <p style="font-size: 12px; font-weight: bold;">Dados obrigatórios faltando:</p>
  <ul class="error-list">${errorList}</ul>
  <div class="action-hint">Corrija os dados do pedido e tente novamente</div>
  <p class="order-id">Pedido: ${orderId}</p>
</body>
</html>`;
  }
}
