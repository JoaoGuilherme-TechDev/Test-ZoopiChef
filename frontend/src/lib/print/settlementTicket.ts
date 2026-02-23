/**
 * Settlement Ticket Print Module
 * Imprime comprovante de acerto de entregador para assinatura
 */

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface SettlementTicketData {
  delivererName: string;
  ordersCount: number;
  totalAmount: number;
  cashAmount: number;
  changeGiven: number;
  totalDeliveryFees: number;
  netAmount: number;
  orders: Array<{
    order_number: number | null;
    total: number;
    payment_method: string | null;
    delivery_fee: number | null;
    created_at: string;
    customer_name: string | null;
  }>;
}

export function printSettlementTicket(data: SettlementTicketData): void {
  const now = new Date();
  const dateStr = format(now, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });

  // Determinar se entregador devolve ou recebe
  const isDelivererReceiving = data.netAmount < 0;
  const absoluteNet = Math.abs(data.netAmount);

  const ticketHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Acerto Entregador</title>
  <style>
    @page { margin: 0; }
    body {
      font-family: 'Courier New', monospace;
      font-size: 12px;
      font-weight: 900;
      width: 80mm;
      margin: 0 auto;
      padding: 5mm;
      color: #000;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .header {
      text-align: center;
      border-bottom: 2px dashed #000;
      padding-bottom: 8px;
      margin-bottom: 8px;
    }
    .title {
      font-size: 16px;
      font-weight: 900;
      margin-bottom: 4px;
    }
    .section {
      margin-bottom: 8px;
    }
    .section-title {
      font-weight: 900;
      border-bottom: 2px solid #000;
      margin-bottom: 4px;
    }
    .row {
      display: flex;
      justify-content: space-between;
      font-weight: 900;
    }
    .bold { font-weight: 900; }
    .separator {
      border-top: 2px dashed #000;
      margin: 8px 0;
    }
    .total-box {
      border: 3px solid #000;
      padding: 10px;
      margin: 12px 0;
      text-align: center;
    }
    .total-label {
      font-size: 14px;
      font-weight: 900;
    }
    .total-value {
      font-size: 20px;
      font-weight: 900;
    }
    .signature {
      margin-top: 30px;
      text-align: center;
    }
    .signature-line {
      border-top: 2px solid #000;
      width: 70%;
      margin: 30px auto 5px;
    }
    .orders-list {
      font-size: 11px;
      margin-top: 8px;
      font-weight: 900;
    }
    .order-row {
      display: flex;
      justify-content: space-between;
      padding: 3px 0;
      border-bottom: 1px dotted #000;
      font-weight: 900;
    }
    @media print {
      body { width: 80mm; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">ACERTO DE ENTREGADOR</div>
    <div>${dateStr}</div>
  </div>

  <div class="section">
    <div class="row bold">
      <span>ENTREGADOR:</span>
      <span>${data.delivererName.toUpperCase()}</span>
    </div>
    <div class="row">
      <span>Qtd Pedidos:</span>
      <span>${data.ordersCount}</span>
    </div>
  </div>

  <div class="separator"></div>

  <div class="section">
    <div class="section-title">RESUMO FINANCEIRO</div>
    <div class="row">
      <span>Total Pedidos:</span>
      <span>R$ ${data.totalAmount.toFixed(2)}</span>
    </div>
    <div class="row">
      <span>Dinheiro Recebido:</span>
      <span>R$ ${data.cashAmount.toFixed(2)}</span>
    </div>
    <div class="row">
      <span>Troco Dado:</span>
      <span>R$ ${data.changeGiven.toFixed(2)}</span>
    </div>
    <div class="row">
      <span>Taxa de Entrega:</span>
      <span>R$ ${data.totalDeliveryFees.toFixed(2)}</span>
    </div>
  </div>

  <div class="total-box">
    <div class="total-label">
      ${isDelivererReceiving ? 'EMPRESA PAGA AO ENTREGADOR' : 'ENTREGADOR DEVOLVE À EMPRESA'}
    </div>
    <div class="total-value">R$ ${absoluteNet.toFixed(2)}</div>
  </div>

  <div class="separator"></div>

  <div class="section">
    <div class="section-title">PEDIDOS INCLUÍDOS</div>
    <div class="orders-list">
      ${data.orders.map(o => `
        <div class="order-row">
          <span>#${o.order_number || '-'} ${o.customer_name?.substring(0, 15) || '-'}</span>
          <span>R$ ${o.total.toFixed(2)}</span>
        </div>
      `).join('')}
    </div>
  </div>

  <div class="signature">
    <div class="signature-line"></div>
    <div>Assinatura do Entregador</div>
    <div style="margin-top: 20px; font-size: 10px;">
      ${data.delivererName}
    </div>
  </div>

  <div style="text-align: center; margin-top: 20px; font-size: 9px;">
    Documento gerado em ${dateStr}
  </div>
</body>
</html>
  `;

  // Abrir janela de impressão
  const printWindow = window.open('', '_blank', 'width=350,height=600');
  if (!printWindow) {
    console.error('Popup blocked');
    return;
  }

  printWindow.document.write(ticketHtml);
  printWindow.document.close();

  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 200);
  };
}
