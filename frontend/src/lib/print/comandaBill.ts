/**
 * Comanda Pre-Bill Print
 * Generates a pre-bill for comanda payment review before closing.
 *
 * Preferência:
 * - Se existir "Impressora padrão" (company.default_printer), imprime via serviço local (Rede TCP/IP) sem abrir diálogo.
 * - Caso contrário, cai no window.print (abre diálogo do navegador).
 */
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/lib/supabase-shim';
import { isNetworkPrintServiceAvailable, printToNetwork } from './NetworkPrintService';
import { isPrintAgentRunning } from './PrintAgentHealth';
import { createPrintJobV3 } from './v3/createPrintJobV3';

export interface ComandaBillItem {
  product_name: string;
  quantity: number;
  unit_price_cents: number;
  total_price_cents: number;
  notes?: string | null;
}

export interface ComandaBillData {
  comandaNumber: number;
  comandaName?: string | null;
  companyName: string;
  openedAt: string;
  items: ComandaBillItem[];
  subtotalCents: number;
  serviceFeeCents?: number;
  serviceFeePercent?: number;
  discountCents?: number;
  surchargeCents?: number;
  totalCents: number;
  paidCents?: number;
  balanceCents?: number;
}

export function generateComandaBillHTML(data: ComandaBillData): string {
  const formatCurrency = (cents: number) => {
    return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  const calculateElapsedTime = (openedAt: string) => {
    const opened = new Date(openedAt).getTime();
    const now = Date.now();
    const totalSeconds = Math.floor((now - opened) / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}min`;
    }
    return `${minutes}min`;
  };

  // Unify equal products
  const unifyItems = (items: ComandaBillItem[]) => {
    const unifiedMap = new Map<string, ComandaBillItem>();
    items.forEach(item => {
      const key = `${item.product_name}-${item.notes || ''}`;
      const existing = unifiedMap.get(key);
      if (existing) {
        existing.quantity += item.quantity;
        existing.total_price_cents += item.total_price_cents;
      } else {
        unifiedMap.set(key, { ...item });
      }
    });
    return Array.from(unifiedMap.values());
  };

  const unifiedItems = unifyItems(data.items);

  const itemsHtml = unifiedItems.map(item => `
    <tr>
      <td class="qty">${item.quantity}x</td>
      <td class="name">
        ${item.product_name}
        ${item.notes ? `<br><small class="notes">${item.notes}</small>` : ''}
      </td>
      <td class="price">${formatCurrency(item.total_price_cents)}</td>
    </tr>
  `).join('');

  const hasBalance = data.balanceCents && data.balanceCents > 0;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @page {
          size: 80mm auto;
          margin: 0;
        }
        body {
          font-family: 'Courier New', Courier, monospace;
          font-size: 12px;
          width: 80mm;
          margin: 0;
          padding: 5mm;
          box-sizing: border-box;
          color: #000;
        }
        .header {
          text-align: center;
          margin-bottom: 8px;
          padding-bottom: 8px;
          border-bottom: 1px dashed #000;
        }
        .company-name {
          font-size: 16px;
          font-weight: bold;
        }
        .pre-bill-title {
          font-size: 14px;
          font-weight: bold;
          margin: 8px 0;
          padding: 4px;
          background: #f0f0f0;
          text-align: center;
        }
        .comanda-info {
          display: flex;
          justify-content: space-between;
          margin: 8px 0;
          font-weight: bold;
          font-size: 14px;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          margin: 2px 0;
        }
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin: 8px 0;
        }
        .items-table td {
          padding: 3px 0;
          vertical-align: top;
        }
        .items-table .qty {
          width: 30px;
          text-align: left;
        }
        .items-table .name {
          text-align: left;
        }
        .items-table .price {
          width: 70px;
          text-align: right;
        }
        .notes {
          font-size: 10px;
          font-style: italic;
          color: #666;
        }
        .divider {
          border-bottom: 1px dashed #000;
          margin: 8px 0;
        }
        .totals {
          margin-top: 8px;
        }
        .total-row {
          display: flex;
          justify-content: space-between;
          margin: 4px 0;
        }
        .total-row.grand-total {
          font-size: 16px;
          font-weight: bold;
          margin-top: 8px;
          padding-top: 8px;
          border-top: 2px solid #000;
        }
        .total-row.balance {
          font-size: 14px;
          font-weight: bold;
          color: #c00;
        }
        .footer {
          text-align: center;
          margin-top: 12px;
          font-size: 10px;
        }
        .watermark {
          text-align: center;
          font-size: 12px;
          font-weight: bold;
          margin-top: 8px;
          padding: 4px;
          border: 1px solid #000;
        }
        @media print {
          body { 
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="company-name">${data.companyName}</div>
      </div>
      
      <div class="pre-bill-title">PRÉ-CONTA</div>
      
      <div class="comanda-info">
        <span>Comanda ${data.comandaNumber}</span>
        ${data.comandaName ? `<span>${data.comandaName}</span>` : ''}
      </div>
      
      <div class="info-row">
        <span>Abertura: ${formatDate(data.openedAt)}</span>
        <span>Tempo: ${calculateElapsedTime(data.openedAt)}</span>
      </div>
      
      <div class="divider"></div>
      
      <table class="items-table">
        ${itemsHtml}
      </table>
      
      <div class="divider"></div>
      
      <div class="totals">
        <div class="total-row">
          <span>Subtotal:</span>
          <span>${formatCurrency(data.subtotalCents)}</span>
        </div>
        ${data.serviceFeeCents && data.serviceFeeCents > 0 ? `
          <div class="total-row">
            <span>Taxa de serviço (${data.serviceFeePercent || 10}%):</span>
            <span>${formatCurrency(data.serviceFeeCents)}</span>
          </div>
        ` : ''}
        ${data.discountCents && data.discountCents > 0 ? `
          <div class="total-row">
            <span>Desconto:</span>
            <span>-${formatCurrency(data.discountCents)}</span>
          </div>
        ` : ''}
        ${data.surchargeCents && data.surchargeCents > 0 ? `
          <div class="total-row">
            <span>Acréscimo:</span>
            <span>${formatCurrency(data.surchargeCents)}</span>
          </div>
        ` : ''}
        <div class="total-row grand-total">
          <span>TOTAL:</span>
          <span>${formatCurrency(data.totalCents)}</span>
        </div>
        ${data.paidCents && data.paidCents > 0 ? `
          <div class="total-row">
            <span>Pago:</span>
            <span>${formatCurrency(data.paidCents)}</span>
          </div>
        ` : ''}
        ${hasBalance ? `
          <div class="total-row balance">
            <span>SALDO A PAGAR:</span>
            <span>${formatCurrency(data.balanceCents!)}</span>
          </div>
        ` : ''}
      </div>
      
      <div class="divider"></div>
      
      <div class="watermark">
        *** NÃO É DOCUMENTO FISCAL ***
      </div>
      
      <div class="footer">
        Impresso em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}
      </div>
    </body>
    </html>
  `;
}

export function buildComandaBillPlainText(data: ComandaBillData): string {
  const formatCurrency = (cents: number) => {
    return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), "dd/MM/yyyy HH:mm", { locale: ptBR });
  };

  const lines: string[] = [];
  const width = 42;
  const divider = '-'.repeat(width);

  lines.push(data.companyName.padStart((width + data.companyName.length) / 2).padEnd(width));
  lines.push('');
  lines.push('PRE-CONTA'.padStart((width + 9) / 2).padEnd(width));
  lines.push(divider);
  lines.push(`Comanda ${data.comandaNumber}${data.comandaName ? ` - ${data.comandaName}` : ''}`);
  lines.push(`Abertura: ${formatDate(data.openedAt)}`);
  lines.push(divider);
  lines.push('');
  lines.push('ITENS');
  lines.push('');

  // Unify items
  const unifiedMap = new Map<string, ComandaBillItem>();
  data.items.forEach(item => {
    const key = `${item.product_name}-${item.notes || ''}`;
    const existing = unifiedMap.get(key);
    if (existing) {
      existing.quantity += item.quantity;
      existing.total_price_cents += item.total_price_cents;
    } else {
      unifiedMap.set(key, { ...item });
    }
  });

  Array.from(unifiedMap.values()).forEach(item => {
    const qty = `${item.quantity}x`;
    const price = formatCurrency(item.total_price_cents);
    const nameWidth = width - qty.length - price.length - 2;
    const name = item.product_name.slice(0, nameWidth).padEnd(nameWidth);
    lines.push(`${qty} ${name} ${price}`);
    if (item.notes) {
      lines.push(`   ${item.notes}`);
    }
  });

  lines.push('');
  lines.push(divider);
  lines.push(`Subtotal: ${formatCurrency(data.subtotalCents).padStart(width - 10)}`);

  if (data.serviceFeeCents && data.serviceFeeCents > 0) {
    lines.push(`Serviço ${data.serviceFeePercent || 10}%: ${formatCurrency(data.serviceFeeCents).padStart(width - 14)}`);
  }
  if (data.discountCents && data.discountCents > 0) {
    lines.push(`Desconto: -${formatCurrency(data.discountCents).padStart(width - 11)}`);
  }
  if (data.surchargeCents && data.surchargeCents > 0) {
    lines.push(`Acrescimo: ${formatCurrency(data.surchargeCents).padStart(width - 11)}`);
  }

  lines.push(divider);
  lines.push(`TOTAL: ${formatCurrency(data.totalCents).padStart(width - 7)}`);

  if (data.paidCents && data.paidCents > 0) {
    lines.push(`Pago: ${formatCurrency(data.paidCents).padStart(width - 6)}`);
  }

  if (data.balanceCents && data.balanceCents > 0) {
    lines.push(`SALDO: ${formatCurrency(data.balanceCents).padStart(width - 7)}`);
  }

  lines.push('');
  lines.push(divider);
  lines.push('*** NAO E DOCUMENTO FISCAL ***'.padStart((width + 30) / 2).padEnd(width));
  lines.push(`Impresso em ${format(new Date(), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}`);

  return lines.join('\n');
}

export function isTcpPrinterAddress(printer?: string | null): boolean {
  return Boolean(printer && parsePrinterAddress(printer));
}

function parsePrinterAddress(printer: string): { host: string; port: number } | null {
  const trimmed = printer.trim();
  if (!trimmed) return null;

  // Shared printer format: \\HOSTNAME\PrinterName - not TCP/IP based
  if (trimmed.startsWith('\\\\')) {
    return null;
  }

  // IP:port or just IP
  const parts = trimmed.split(':');
  const host = parts[0];
  const port = parts.length > 1 ? parseInt(parts[1], 10) : 9100;

  // Basic IP validation
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    return null;
  }

  return { host, port };
}

export function printComandaBillToWindow(data: ComandaBillData, printWindow: Window): boolean {
  try {
    const html = generateComandaBillHTML(data);
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    // Trigger print immediately and also on load
    setTimeout(() => {
      try {
        printWindow.print();
      } catch {
        // ignore
      }
    }, 300);
    printWindow.onload = () => {
      try {
        printWindow.print();
      } catch {
        // ignore
      }
    };
    return true;
  } catch {
    return false;
  }
}

/**
 * Print via hidden iframe - more reliable than window.open
 */
function printViaIframe(html: string): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    try {
      console.log('[comandaBill] Printing via iframe...');
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

        setTimeout(() => {
          try {
            w.focus();
            w.print();
            console.log('[comandaBill] Print dialog triggered successfully');
            cleanup();
            resolve({ success: true });
          } catch (e) {
            cleanup();
            resolve({
              success: false,
              error: e instanceof Error ? e.message : 'Falha ao acionar impressão',
            });
          }
        }, 200);
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

      setTimeout(() => {
        const w = iframe.contentWindow;
        if (!w) return;
        try {
          w.focus();
          w.print();
          cleanup();
          resolve({ success: true });
        } catch (e) {
          cleanup();
          resolve({
            success: false,
            error: e instanceof Error ? e.message : 'Timeout ao tentar imprimir',
          });
        }
      }, 2500);
    } catch (e) {
      resolve({
        success: false,
        error: e instanceof Error ? e.message : 'Erro ao preparar impressão',
      });
    }
  });
}

export async function printComandaBillDirect(
  data: ComandaBillData,
  defaultPrinter?: string | null,
  companyId?: string | null
): Promise<{ success: boolean; error?: string; warning?: string }> {
  console.log('[comandaBill] printComandaBillDirect called', {
    hasDefaultPrinter: !!defaultPrinter,
    hasCompanyId: !!companyId,
    comandaNumber: data.comandaNumber,
  });

  // Nesta aplicação, impressão de comanda deve ser SILENCIOSA (sem diálogo do Windows).
  // Portanto, sempre enviamos para a fila do agente.
  if (!companyId) {
    return {
      success: false,
      error:
        'Impressão não configurada: informe o ID da empresa para enviar à fila (agente desktop).',
    };
  }

  // Interpreta impressora padrão:
  // - TCP: "IP:porta" (ex: 192.168.0.50:9100)
  // - Caso contrário: nome de impressora (USB/Windows)
  const tcp = defaultPrinter ? parsePrinterAddress(defaultPrinter) : null;

  // Converte a comanda para o mesmo formato de "table_bill" que o agente já entende.
  // 1 comanda = 1 seção.
  const cmdName = data.comandaName || `Comanda #${data.comandaNumber}`;
  const commandItems = (data.items || []).map((it) => ({
    product_name: it.product_name,
    quantity: it.quantity,
    unit_price_cents: it.unit_price_cents,
    total_price_cents: it.total_price_cents,
    notes: it.notes,
    command_name: cmdName,
    command_number: data.comandaNumber,
  }));

  const metadata: any = {
    companyName: data.companyName,
    tableNumber: data.comandaNumber,
    tableName: data.comandaName,
    openedAt: data.openedAt,
    commands: [
      {
        id: `comanda-${data.comandaNumber}`,
        name: cmdName,
        number: data.comandaNumber,
        items: commandItems,
        total_cents: data.totalCents,
      },
    ],
    subtotalCents: data.subtotalCents,
    surchargeCents: data.surchargeCents,
    discountCents: data.discountCents,
    totalCents: data.totalCents,
  };

  if (tcp) {
    metadata.printerHost = tcp.host;
    metadata.printerPort = tcp.port;
  } else if (defaultPrinter) {
    metadata.printerName = defaultPrinter;
  }

  // Check agent but don't block - enqueue anyway
  // The health check may fail due to CORS/mixed content but the agent could still be running
  const agent = await isPrintAgentRunning();
  const agentWarning = !agent.running 
    ? agent.error || 'Não foi possível verificar o agente de impressão.' 
    : undefined;
  
  if (!agent.running) {
    console.warn('[comandaBill] Agent health check failed, enqueueing anyway:', agent);
  }

  // Preferir fila v3 (agente atual consome print_job_queue_v3)
  const plain = buildComandaBillPlainText(data);
  let rawEscPosBase64: string | undefined;
  try {
    rawEscPosBase64 = btoa(plain);
  } catch {
    rawEscPosBase64 = undefined;
  }

  metadata.rawEscPos = plain;
  metadata.rawEscPosBase64 = rawEscPosBase64;

  const created = await createPrintJobV3({
    companyId,
    jobType: 'table_bill',
    // Mantém sem order_id; pré-conta é por comanda/mesa
    rawEscPos: rawEscPosBase64,
    metadata: JSON.parse(JSON.stringify({
      ...metadata,
      // Mantém compat com leitores antigos que buscavam metadata.source
      source: 'comanda_bill_direct',
    })),
    priority: 3,
  });

  if (!created.success) {
    return {
      success: false,
      error: created.error || 'Erro ao enviar para a fila de impressão',
    };
  }

  return { 
    success: true,
    warning: agentWarning,
  };
}

export function printComandaBill(data: ComandaBillData): boolean {
  const html = generateComandaBillHTML(data);
  const printWindow = window.open('', '_blank', 'width=300,height=600');
  
  if (!printWindow) {
    // Try iframe as fallback
    printViaIframe(html);
    return true;
  }

  return printComandaBillToWindow(data, printWindow);
}
