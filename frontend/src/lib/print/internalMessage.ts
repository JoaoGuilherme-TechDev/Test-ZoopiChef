import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { isNetworkPrintServiceAvailable, printToNetwork } from './NetworkPrintService';

interface InternalMessage {
  id: string;
  sender_name: string;
  message: string;
  target_type: string;
  target_sector_id?: string | null;
  created_at: string;
}

function parsePrinterAddress(printer: string): { host: string; port: number } | null {
  const trimmed = printer.trim();
  if (!trimmed) return null;

  // Accept formats: "192.168.0.10" or "192.168.0.10:9100"
  const [host, portRaw] = trimmed.split(':');
  const port = portRaw ? Number(portRaw) : 9100;

  if (!host) return null;
  if (Number.isNaN(port) || port <= 0) return null;

  return { host, port };
}

function buildInternalMessagePlainText(message: InternalMessage, companyName?: string): string {
  const messageTime = format(new Date(message.created_at), 'HH:mm', { locale: ptBR });
  const messageDate = format(new Date(message.created_at), 'dd/MM/yyyy', { locale: ptBR });

  const targetLabel =
    ({
      all: 'TODOS',
      kds: 'COZINHA',
      printer: 'IMPRESSORA',
      waiter: 'GARÇOM',
    } as const)[message.target_type as keyof typeof message] ?? message.target_type.toUpperCase();

  const line = '--------------------------------';

  return [
    'MENSAGEM INTERNA',
    companyName || 'SISTEMA',
    `DESTINO: ${targetLabel}`,
    line,
    `DE: ${message.sender_name}`,
    `${messageDate} ${messageTime}`,
    line,
    message.message.toUpperCase(),
    '\n\n',
  ].join('\n');
}

/**
 * Generate HTML for internal message ticket
 * Optimized for 80mm thermal printers
 */
export function generateInternalMessageHTML(message: InternalMessage, companyName?: string): string {
  const messageTime = format(new Date(message.created_at), 'HH:mm', { locale: ptBR });
  const messageDate = format(new Date(message.created_at), 'dd/MM/yyyy', { locale: ptBR });

  const targetLabel = {
    all: 'TODOS',
    kds: 'COZINHA',
    printer: 'IMPRESSORA',
    waiter: 'GARÇOM',
  }[message.target_type] || message.target_type.toUpperCase();

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Mensagem Interna</title>
  <style>
    @page { size: 80mm auto; margin: 2mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Courier New', monospace; 
      font-size: 12px; 
      width: 76mm;
      padding: 4px;
      line-height: 1.4;
      color: #000;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .header {
      background: #f97316;
      color: #fff;
      text-align: center;
      padding: 12px;
      margin: -4px -4px 8px -4px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .header-title { 
      font-size: 20px; 
      font-weight: bold; 
      letter-spacing: 1px; 
    }
    .header-sub { 
      font-size: 12px; 
      margin-top: 4px; 
    }
    
    .target-badge {
      background: #000;
      color: #fff;
      font-size: 16px;
      font-weight: bold;
      text-align: center;
      padding: 8px;
      margin: 8px 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .message-box {
      border: 2px solid #000;
      padding: 12px;
      margin: 12px 0;
      font-size: 16px;
      font-weight: bold;
      line-height: 1.5;
      word-wrap: break-word;
    }
    
    .sender-info {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      padding: 8px;
      background: #eee;
      margin: 8px 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .separator { 
      border-top: 1px dashed #000; 
      margin: 8px 0; 
    }
    
    .footer { 
      text-align: center; 
      font-size: 10px; 
      margin-top: 12px; 
      padding-top: 8px; 
      border-top: 1px solid #000; 
    }
    
    @media print { 
      body { width: 100%; max-width: 76mm; } 
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-title">📢 MENSAGEM INTERNA</div>
    <div class="header-sub">${companyName || 'SISTEMA'}</div>
  </div>
  
  <div class="target-badge">DESTINO: ${targetLabel}</div>
  
  <div class="message-box">
    ${message.message.toUpperCase()}
  </div>
  
  <div class="sender-info">
    <span>👤 ${message.sender_name}</span>
    <span>🕐 ${messageTime}</span>
  </div>
  
  <div class="separator"></div>
  
  <div class="footer">
    <div style="margin-bottom: 4px;"><img src="/zoopi-logo.png" alt="Zoopi" style="height: 25px; opacity: 0.7;" onerror="this.style.display='none'" /></div>
    ${messageDate} ${messageTime} - MENSAGEM INTERNA
  </div>
</body>
</html>`;
}

/**
 * Print internal message
 *
 * Prefer: Rede TCP/IP (Zoopi Print Service) se a empresa tiver "Impressora padrão" configurada.
 * Fallback: impressão do navegador (pode depender de pop-up permitido).
 */
export async function printInternalMessage(
  message: InternalMessage,
  companyName?: string,
  defaultPrinter?: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1) Network printing (recommended)
    const printer = defaultPrinter ? parsePrinterAddress(defaultPrinter) : null;
    if (printer) {
      const serviceAvailable = await isNetworkPrintServiceAvailable();
      if (serviceAvailable) {
        const content = buildInternalMessagePlainText(message, companyName);
        const result = await printToNetwork(content, {
          host: printer.host,
          port: printer.port,
          copies: 1,
          cut: true,
          beep: true,
        });

        if (result.success) return { success: true };
        // If it fails, fall back to browser print with the error surfaced
        console.warn('[InternalMessagePrint] Network print failed:', result.error);
      } else {
        console.warn('[InternalMessagePrint] Network print service not available');
      }
    }

    // 2) Browser printing fallback
    const html = generateInternalMessageHTML(message, companyName);

    const printWindow = window.open('', '_blank', 'width=350,height=600');
    if (!printWindow) {
      return {
        success: false,
        error: defaultPrinter
          ? 'Serviço de impressão não disponível e pop-up bloqueado (permita pop-ups ou use o Print Service).'
          : 'Pop-up bloqueado. Configure a Impressora padrão ou permita pop-ups.',
      };
    }

    printWindow.document.write(html);
    printWindow.document.close();

    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
      setTimeout(() => printWindow.close(), 1000);
    };

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}

