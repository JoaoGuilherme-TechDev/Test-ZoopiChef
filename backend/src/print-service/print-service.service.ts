import { Injectable } from '@nestjs/common';
import * as net from 'net';
import * as iconv from 'iconv-lite';

// Service for handling print operations
@Injectable()
export class PrintServiceService {
  private ESC = '\x1B';
  private GS = '\x1D';
  private LF = '\n';
  private COMMANDS = {
    INIT: this.ESC + '@', // Inicializa impressora
    CUT: this.GS + 'V' + '\x00', // Corte total
    PARTIAL_CUT: this.GS + 'V' + '\x01', // Corte parcial
    BOLD_ON: this.ESC + 'E' + '\x01',
    BOLD_OFF: this.ESC + 'E' + '\x00',
    CENTER: this.ESC + 'a' + '\x01',
    LEFT: this.ESC + 'a' + '\x00',
    RIGHT: this.ESC + 'a' + '\x02',
    DOUBLE_HEIGHT: this.ESC + '!' + '\x10',
    DOUBLE_WIDTH: this.ESC + '!' + '\x20',
    DOUBLE_SIZE: this.ESC + '!' + '\x30',
    NORMAL: this.ESC + '!' + '\x00',
    FEED_LINES: (n: number) => this.ESC + 'd' + String.fromCharCode(n),
    BEEP: this.ESC + 'B' + '\x03' + '\x02', // 3 beeps, 200ms each
    // Barcode commands
    BARCODE_HEIGHT: (h: number) =>
      this.GS + 'h' + String.fromCharCode(Math.min(255, Math.max(1, h))),
    BARCODE_WIDTH: (w: number) =>
      this.GS + 'w' + String.fromCharCode(Math.min(6, Math.max(2, w))),
    BARCODE_HRI_BELOW: this.GS + 'H' + '\x02',
    BARCODE_HRI_NONE: this.GS + 'H' + '\x00',
    BARCODE_CODE128: this.GS + 'k' + 'I', // CODE128 type (method A, NUL terminated)
  };

  /**
   * Generate CODE128 barcode ESC/POS commands
   * @param {string} payload - Text to encode (max 255 chars, printable ASCII only)
   * @param {object} options - Barcode configuration
   */
  generateBarcode(payload: string, options: any = {}) {
    const { height = 60, width = 2, showHRI = true, center = true } = options;

    if (!payload || payload.trim() === '') {
      return { success: false, error: 'Empty payload' };
    }

    // Clean payload - only printable ASCII (0x20-0x7E)
    const validPayload = payload.replace(/[^\x20-\x7E]/g, '');
    if (validPayload.length === 0) {
      return { success: false, error: 'No valid characters' };
    }
    if (validPayload.length > 255) {
      return { success: false, error: 'Payload too long (max 255)' };
    }

    let out = '';
    if (center) out += this.COMMANDS.CENTER;
    out += this.COMMANDS.BARCODE_HEIGHT(height);
    out += this.COMMANDS.BARCODE_WIDTH(width);
    out += showHRI
      ? this.COMMANDS.BARCODE_HRI_BELOW
      : this.COMMANDS.BARCODE_HRI_NONE;
    out += this.COMMANDS.BARCODE_CODE128;
    out += validPayload;
    out += '\x00'; // NUL terminator for method A
    out += this.LF;
    if (center) out += this.COMMANDS.LEFT;

    return { success: true, data: out, payload: validPayload };
  }

  // Função para testar conexão com impressora
  testPrinterConnection(host: string, port: number) {
    return new Promise((resolve, reject) => {
      const socket = new net.Socket();
      const timeout = 5000;

      socket.setTimeout(timeout);

      socket.connect(port, host, () => {
        socket.destroy();
        resolve({ success: true, message: 'Conexão estabelecida com sucesso' });
      });

      socket.on('error', (err) => {
        socket.destroy();
        reject(new Error(`Não foi possível conectar: ${err.message}`));
      });

      socket.on('timeout', () => {
        socket.destroy();
        reject(new Error('Timeout: impressora não respondeu'));
      });
    });
  }

  // Função principal de impressão via TCP
  printToNetworkPrinter(
    host: string,
    port: number,
    content: string,
    options: any = {},
  ) {
    return new Promise((resolve, reject) => {
      const { cut = true, beep = false, encoding = 'cp860' } = options;
      const socket = new net.Socket();
      const timeout = 10000;

      socket.setTimeout(timeout);

      socket.connect(port, host, () => {
        try {
          // Monta o buffer de impressão
          let buffer = Buffer.from(this.COMMANDS.INIT, 'binary');

          // Beep se solicitado
          if (beep) {
            buffer = Buffer.concat([
              buffer,
              Buffer.from(this.COMMANDS.BEEP, 'binary'),
            ]);
          }

          // Conteúdo convertido para a codificação correta
          const encodedContent = iconv.encode(content, encoding);
          buffer = Buffer.concat([buffer, encodedContent]);

          // Alimenta algumas linhas e corta
          buffer = Buffer.concat([
            buffer,
            Buffer.from(this.COMMANDS.FEED_LINES(4), 'binary'),
          ]);

          if (cut) {
            buffer = Buffer.concat([
              buffer,
              Buffer.from(this.COMMANDS.PARTIAL_CUT, 'binary'),
            ]);
          }

          socket.write(buffer, () => {
            socket.end();
            resolve({ success: true });
          });
        } catch (err) {
          socket.destroy();
          reject(err);
        }
      });

      socket.on('error', (err) => {
        socket.destroy();
        reject(new Error(`Erro de conexão: ${err.message}`));
      });

      socket.on('timeout', () => {
        socket.destroy();
        reject(new Error('Timeout: impressora não respondeu'));
      });

      socket.on('close', () => {
        resolve({ success: true });
      });
    });
  }

  // Função para formatar ticket de cozinha COM CÓDIGO DE BARRAS
  formatTicket(ticket: any) {
    const {
      orderNumber,
      orderId,
      orderType,
      items = [],
      customerName,
      tableName,
      notes,
      createdAt,
      sectorName,
      companyName,
      delivererName,
      delivererCode,
    } = ticket;

    let content = '';

    // Cabeçalho com nome da empresa
    if (companyName) {
      content += this.COMMANDS.CENTER;
      content += this.COMMANDS.DOUBLE_SIZE;
      content += `${companyName}\n`;
      content += this.COMMANDS.NORMAL;
    }

    // Cabeçalho
    content += this.COMMANDS.CENTER;
    content += this.COMMANDS.DOUBLE_SIZE;
    content += `PEDIDO #${orderNumber}\n`;
    content += this.COMMANDS.NORMAL;
    content += this.COMMANDS.BOLD_ON;

    if (sectorName) {
      content += `[${sectorName.toUpperCase()}]\n`;
    }

    content += this.COMMANDS.BOLD_OFF;
    content += '================================\n';
    content += this.COMMANDS.LEFT;

    // Tipo do pedido
    if (orderType) {
      content += this.COMMANDS.BOLD_ON;
      content += `Tipo: ${orderType}\n`;
      content += this.COMMANDS.BOLD_OFF;
    }

    // Mesa ou cliente
    if (tableName) {
      content += `Mesa: ${tableName}\n`;
    }
    if (customerName) {
      content += `Cliente: ${customerName}\n`;
    }

    // Data/hora
    if (createdAt) {
      const date = new Date(createdAt);
      content += `Hora: ${date.toLocaleTimeString('pt-BR')}\n`;
    }

    content += '--------------------------------\n';

    // Itens
    content += this.COMMANDS.BOLD_ON;
    content += 'ITENS:\n';
    content += this.COMMANDS.BOLD_OFF;

    for (const item of items) {
      content += this.COMMANDS.DOUBLE_HEIGHT;
      content += `${item.quantity}x ${item.name}\n`;
      content += this.COMMANDS.NORMAL;

      // Opcionais
      if (item.options && item.options.length > 0) {
        for (const opt of item.options) {
          content += `   + ${opt}\n`;
        }
      }

      // Observações do item - skip auto-generated notes
      if (item.notes) {
        const cleanNotes = String(item.notes).trim();
        const looksAutoGenerated =
          cleanNotes.includes(' | ') ||
          cleanNotes.startsWith('[') ||
          /\[rodízio\]|\[rodizio\]/i.test(cleanNotes) ||
          /sabor|borda|bebida|escolh/i.test(cleanNotes);

        if (!looksAutoGenerated && cleanNotes.length > 0) {
          content += this.COMMANDS.BOLD_ON;
          content += `   OBS: ${cleanNotes}\n`;
          content += this.COMMANDS.BOLD_OFF;
        }
      }
    }

    // Observações gerais
    if (notes) {
      content += '--------------------------------\n';
      content += this.COMMANDS.BOLD_ON;
      content += `OBSERVAÇÕES:\n`;
      content += this.COMMANDS.BOLD_OFF;
      content += `${notes}\n`;
    }

    content += '================================\n';

    // ======== CÓDIGO DE BARRAS DO ENTREGADOR ========
    // CRÍTICO: Sempre incluir para pedidos delivery
    const barcodePayload =
      delivererCode ||
      (orderId ? `ORDER:${orderId.slice(0, 8).toUpperCase()}` : null) ||
      (orderNumber ? `PEDIDO:${String(orderNumber).padStart(3, '0')}` : null);

    if (barcodePayload) {
      content += '\n';
      content += this.COMMANDS.CENTER;
      content += this.COMMANDS.BOLD_ON;
      content += 'CODIGO ENTREGADOR\n';
      content += this.COMMANDS.BOLD_OFF;

      if (delivererName) {
        content += `${delivererName}\n`;
      }

      // Gera código de barras CODE128
      const barcodeResult = this.generateBarcode(barcodePayload, {
        height: 60,
        width: 2,
        showHRI: true,
        center: true,
      });

      if (barcodeResult.success) {
        content += '\n';
        content += barcodeResult.data;
      } else {
        // Fallback: imprime código como texto grande se barcode falhar
        console.warn('[Barcode] Fallback to text:', barcodeResult.error);
        content += this.COMMANDS.DOUBLE_SIZE;
        content += `${barcodePayload}\n`;
        content += this.COMMANDS.NORMAL;
      }

      content += '\n';
      content += '================================\n';
    }

    content += this.COMMANDS.CENTER;
    content += 'Zoopi Sistema\n';
    content += this.COMMANDS.LEFT;

    return content;
  }
}
