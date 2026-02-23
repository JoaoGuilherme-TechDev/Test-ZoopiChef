import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as net from 'net';
import { exec } from 'child_process';

// Use require to bypass type issues with node-thermal-printer
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ThermalPrinter = require('node-thermal-printer').printer;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PrinterTypes = require('node-thermal-printer').types;

@Injectable()
export class PrintAgentService {
  private printersFile = path.join(process.cwd(), 'printers.json');

  constructor() {
    // Ensure printers file exists
    if (!fs.existsSync(this.printersFile)) {
      fs.writeFileSync(this.printersFile, JSON.stringify([]));
    }
  }

  getPrinters(): any[] {
    try {
      const data = fs.readFileSync(this.printersFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return [];
    }
  }

  /**
   * Lista impressoras instaladas no sistema
   */
  async getSystemPrinters(): Promise<string[]> {
    return new Promise((resolve) => {
      if (process.platform === 'win32') {
        exec('wmic printer get name', (error, stdout) => {
          if (error) {
            console.error('[PrinterManager] Error listing printers:', error);
            resolve([]);
            return;
          }
          const printers = stdout
            .split('\n')
            .slice(1)
            .map((line) => line.trim())
            .filter((line) => line.length > 0);
          resolve(printers);
        });
      } else if (process.platform === 'darwin') {
        exec('lpstat -p', (error, stdout) => {
          if (error) {
            resolve([]);
            return;
          }
          const printers = stdout
            .split('\n')
            .filter((line) => line.startsWith('printer'))
            .map((line) => line.split(' ')[1]);
          resolve(printers);
        });
      } else {
        exec('lpstat -a', (error, stdout) => {
          if (error) {
            resolve([]);
            return;
          }
          const printers = stdout
            .split('\n')
            .map((line) => line.split(' ')[0])
            .filter((name) => name.length > 0);
          resolve(printers);
        });
      }
    });
  }

  /**
   * Helpers para envio direto de dados binários
   */
  async sendToNetworkPrinter(host: string, port: number, buffer: Buffer) {
    return new Promise<void>((resolve, reject) => {
      const client = new net.Socket();
      const timeout = setTimeout(() => {
        client.destroy();
        reject(new Error('Timeout de conexão'));
      }, 5000);

      client.connect(port, host, () => {
        clearTimeout(timeout);
        client.write(buffer, () => {
          client.end();
          resolve();
        });
      });

      client.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  }

  async sendToUSBPrinter(printerName: string, buffer: Buffer) {
    const tempFile = path.join(os.tmpdir(), `zoopi-raw-${Date.now()}.bin`);
    fs.writeFileSync(tempFile, buffer);

    return new Promise<void>((resolve, reject) => {
      let command;

      if (process.platform === 'win32') {
        command = `copy /b "${tempFile}" "\\\\localhost\\${printerName}"`;
      } else {
        command = `lpr -P "${printerName}" "${tempFile}"`;
      }

      exec(command, (error) => {
        try {
          fs.unlinkSync(tempFile);
        } catch (e) {
          /* ignore */
        }

        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Formata e imprime um ticket baseado nos dados JSON
   */
  async printTicket(printerConfig: any, ticketData: any) {
    console.log('[PrinterManager] Printing ticket:', ticketData.type);

    try {
      // Para impressoras de rede, usa conexão direta
      if (printerConfig.type === 'network') {
        return this.printToNetwork(printerConfig, ticketData);
      }

      // Para USB, usa o sistema operacional
      return this.printToUSB(printerConfig, ticketData);
    } catch (error) {
      console.error('[PrinterManager] Print error:', error);
      throw error;
    }
  }

  /**
   * Impressão via rede (TCP/IP)
   */
  async printToNetwork(config: any, ticketData: any) {
    const escposData = this.buildEscPosTicket(
      ticketData,
      config.paperWidth || 80,
    );

    return new Promise((resolve, reject) => {
      const client = new net.Socket();
      const timeout = setTimeout(() => {
        client.destroy();
        reject(new Error('Timeout de conexão'));
      }, 5000);

      client.connect(config.port || 9100, config.host, () => {
        clearTimeout(timeout);
        client.write(Buffer.from(escposData, 'binary'), () => {
          client.end();
          resolve({ success: true });
        });
      });

      client.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  }

  /**
   * Impressão via USB (sistema operacional)
   */
  async printToUSB(config: any, ticketData: any) {
    const escposData = this.buildEscPosTicket(
      ticketData,
      config.paperWidth || 80,
    );
    const tempFile = path.join(os.tmpdir(), `zoopi-print-${Date.now()}.bin`);

    // Salva dados binários em arquivo temporário
    fs.writeFileSync(tempFile, Buffer.from(escposData, 'binary'));

    return new Promise((resolve, reject) => {
      let command;

      if (process.platform === 'win32') {
        // Windows: usa copy /b para impressora compartilhada
        const printerPath = config.sharePath || `\\\\localhost\\${config.name}`;
        command = `copy /b "${tempFile}" "${printerPath}"`;
      } else if (process.platform === 'darwin') {
        // macOS
        command = `lpr -P "${config.name}" "${tempFile}"`;
      } else {
        // Linux
        command = `lpr -P "${config.name}" "${tempFile}"`;
      }

      exec(command, (error) => {
        // Limpa arquivo temporário
        try {
          fs.unlinkSync(tempFile);
        } catch (e) {
          /* ignore */
        }

        if (error) {
          reject(error);
        } else {
          resolve({ success: true });
        }
      });
    });
  }

  /**
   * Constrói comandos ESC/POS para o ticket
   */
  buildEscPosTicket(data: any, paperWidth: number) {
    const ESC = '\x1B';
    const GS = '\x1D';
    const LF = '\x0A';

    const CMD = {
      INIT: ESC + '@',
      BOLD_ON: ESC + 'E\x01',
      BOLD_OFF: ESC + 'E\x00',
      UNDERLINE_ON: ESC + '-\x01',
      UNDERLINE_OFF: ESC + '-\x00',
      CENTER: ESC + 'a\x01',
      LEFT: ESC + 'a\x00',
      RIGHT: ESC + 'a\x02',
      DOUBLE_HEIGHT: GS + '!\x01',
      DOUBLE_WIDTH: GS + '!\x10',
      DOUBLE_BOTH: GS + '!\x11',
      NORMAL: GS + '!\x00',
      INVERT_ON: GS + 'B\x01',
      INVERT_OFF: GS + 'B\x00',
      CUT: GS + 'V\x00',
      PARTIAL_CUT: GS + 'V\x01',
      BEEP: ESC + 'B\x05\x02',
    };

    const cols = paperWidth === 58 ? 32 : 48;
    const separator = '='.repeat(cols);
    const dashed = '-'.repeat(cols);

    let ticket = CMD.INIT;

    // Cabeçalho com nome da empresa
    if (data.companyName) {
      ticket += CMD.CENTER + CMD.BOLD_ON;
      ticket += data.companyName + LF;
      ticket += CMD.BOLD_OFF + CMD.LEFT;
      ticket += LF;
    }

    // Número do pedido (destaque)
    if (data.orderNumber) {
      ticket += CMD.CENTER + CMD.INVERT_ON + CMD.DOUBLE_BOTH;
      ticket += ` PEDIDO #${data.orderNumber} ` + LF;
      ticket += CMD.NORMAL + CMD.INVERT_OFF + CMD.LEFT;
      ticket += LF;
    }

    // Origem (Mesa, Delivery, etc)
    if (data.origin) {
      ticket += CMD.CENTER + CMD.BOLD_ON + CMD.DOUBLE_HEIGHT;
      ticket += data.origin + LF;
      ticket += CMD.NORMAL + CMD.BOLD_OFF + CMD.LEFT;
      ticket += LF;
    }

    // Informações do cliente
    if (data.customerName) {
      ticket +=
        CMD.BOLD_ON + 'Cliente: ' + CMD.BOLD_OFF + data.customerName + LF;
    }
    if (data.customerPhone) {
      ticket += 'Tel: ' + data.customerPhone + LF;
    }
    if (data.address) {
      ticket += 'End: ' + data.address + LF;
    }

    // Data e hora
    if (data.datetime) {
      ticket += data.datetime + LF;
    }

    ticket += separator + LF;

    // Itens do pedido
    if (data.items && data.items.length > 0) {
      for (const item of data.items) {
        // Quantidade e nome do item
        const qtyStr = `${item.quantity}x `;
        const nameStr = item.name.toUpperCase();
        ticket += CMD.BOLD_ON + qtyStr + nameStr + CMD.BOLD_OFF + LF;

        // Observações do item
        if (item.notes) {
          ticket += '   -> ' + item.notes + LF;
        }

        // Adicionais
        if (item.addons && item.addons.length > 0) {
          for (const addon of item.addons) {
            ticket += '   + ' + addon + LF;
          }
        }

        // Preço (se não for ticket de produção)
        if (data.showPrices && item.price) {
          const priceStr = this.formatCurrency(item.price);
          ticket += this.rightAlign(`R$ ${priceStr}`, cols) + LF;
        }

        ticket += LF;
      }
    }

    ticket += separator + LF;

    // Totais
    if (data.showPrices) {
      if (data.subtotal) {
        ticket +=
          this.lineKeyValue(
            'Subtotal:',
            `R$ ${this.formatCurrency(data.subtotal)}`,
            cols,
          ) + LF;
      }
      if (data.discount) {
        ticket +=
          this.lineKeyValue(
            'Desconto:',
            `-R$ ${this.formatCurrency(data.discount)}`,
            cols,
          ) + LF;
      }
      if (data.deliveryFee) {
        ticket +=
          this.lineKeyValue(
            'Taxa Entrega:',
            `R$ ${this.formatCurrency(data.deliveryFee)}`,
            cols,
          ) + LF;
      }
      if (data.total) {
        ticket += CMD.BOLD_ON + CMD.DOUBLE_HEIGHT;
        ticket +=
          this.lineKeyValue(
            'TOTAL:',
            `R$ ${this.formatCurrency(data.total)}`,
            cols,
          ) + LF;
        ticket += CMD.NORMAL + CMD.BOLD_OFF;
      }
    }

    // Forma de pagamento
    if (data.paymentMethod) {
      ticket += LF;
      ticket += 'Pagamento: ' + data.paymentMethod + LF;
      if (data.change) {
        ticket += 'Troco para: R$ ' + this.formatCurrency(data.change) + LF;
      }
    }

    // Observações gerais
    if (data.notes) {
      ticket += LF + dashed + LF;
      ticket += CMD.BOLD_ON + 'OBS: ' + CMD.BOLD_OFF + data.notes + LF;
    }

    // Rodapé
    ticket += LF;
    if (data.footer) {
      ticket += CMD.CENTER + data.footer + LF;
    }

    // Código de barras
    if (data.barcode) {
      ticket += LF + CMD.CENTER;
      ticket += this.buildBarcode(data.barcode);
      ticket += CMD.LEFT;
    }

    // QR Code
    if (data.qrcode) {
      ticket += LF + CMD.CENTER;
      ticket += this.buildQRCode(data.qrcode);
      ticket += CMD.LEFT;
    }

    // Espaço e corte
    ticket += LF + LF + LF;

    if (data.beep) {
      ticket += CMD.BEEP;
    }

    if (data.cut !== false) {
      ticket += CMD.PARTIAL_CUT;
    }

    return ticket;
  }

  /**
   * Gera código de barras CODE128
   */
  buildBarcode(content: string) {
    const GS = '\x1D';
    let barcode = '';

    // Altura do código de barras
    barcode += GS + 'h' + String.fromCharCode(60);
    // Largura
    barcode += GS + 'w' + String.fromCharCode(2);
    // HRI abaixo do código
    barcode += GS + 'H' + String.fromCharCode(2);
    // CODE128
    barcode += GS + 'k' + String.fromCharCode(73);
    barcode += String.fromCharCode(content.length);
    barcode += content;

    return barcode + '\x0A';
  }

  /**
   * Gera QR Code (ESC/POS padrão)
   */
  buildQRCode(content: string) {
    const GS = '\x1D';
    let qr = '';

    // Modelo do QR (Model 2)
    qr += GS + '(k' + '\x04\x00' + '\x31\x41' + '\x32\x00';

    // Tamanho do módulo (1-16, usamos 4)
    qr += GS + '(k' + '\x03\x00' + '\x31\x43' + '\x04';

    // Nível de correção de erro (L=48, M=49, Q=50, H=51)
    qr += GS + '(k' + '\x03\x00' + '\x31\x45' + '\x31';

    // Armazena os dados no buffer
    const len = content.length + 3;
    const pL = len % 256;
    const pH = Math.floor(len / 256);
    qr +=
      GS +
      '(k' +
      String.fromCharCode(pL) +
      String.fromCharCode(pH) +
      '\x31\x50\x30' +
      content;

    // Imprime o QR do buffer
    qr += GS + '(k' + '\x03\x00' + '\x31\x51\x30';

    return qr + '\x0A';
  }

  /**
   * Alinha texto à direita
   */
  rightAlign(text: string, cols: number) {
    const padding = cols - text.length;
    return ' '.repeat(Math.max(0, padding)) + text;
  }

  /**
   * Cria linha com chave à esquerda e valor à direita
   */
  lineKeyValue(key: string, value: string, cols: number) {
    const spacing = cols - key.length - value.length;
    return key + ' '.repeat(Math.max(1, spacing)) + value;
  }

  /**
   * Formata valor monetário
   */
  formatCurrency(value: any) {
    return parseFloat(value).toFixed(2).replace('.', ',');
  }

  /**
   * Teste de impressão
   */
  async testPrint(printerConfig: any) {
    const testData = {
      companyName: 'ZOOPI - TESTE DE IMPRESSAO',
      orderNumber: '000',
      origin: '*** TESTE ***',
      datetime: new Date().toLocaleString('pt-BR'),
      items: [
        { quantity: 1, name: 'Item de Teste', notes: 'Observacao de teste' },
        {
          quantity: 2,
          name: 'Outro Item',
          addons: ['Adicional 1', 'Adicional 2'],
        },
      ],
      showPrices: true,
      total: 99.99,
      footer: 'Impressao de teste OK!',
      beep: true,
      cut: true,
    };

    try {
      await this.printTicket(printerConfig, testData);
      return {
        success: true,
        message: 'Teste de impressão enviado com sucesso!',
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}
