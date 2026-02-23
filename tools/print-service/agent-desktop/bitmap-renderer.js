/**
 * Gerador de Bitmap ESC/POS para Cupom de Mesa (table_bill)
 * 
 * Gera comandos ESC/POS bitmap diretamente usando:
 * - QR Code via qrcode (pure JS)
 * - Código de Barras via bwip-js (pure JS)
 * 
 * Funciona com pkg (sem dependências nativas como Puppeteer).
 */

const QRCode = require('qrcode');
const bwipjs = require('bwip-js');
const { PNG } = require('pngjs');

const { COMMANDS, printContent } = require('./printer');
const { getConfig } = require('./config-manager');
const {
  INIT_STR,
  RESET_STYLE_STR,
  LINE_WIDTH,
  sanitize,
  moneyCents,
  formatLine,
  padCenter,
  wrapText,
  truncate,
} = require('./escpos-format');

/**
 * Gera QR Code como Buffer PNG
 */
async function generateQRCodePNG(text, size = 150) {
  if (!text) return null;
  
  try {
    const buffer = await QRCode.toBuffer(text, {
      type: 'png',
      width: size,
      margin: 1,
      color: { dark: '#000000', light: '#FFFFFF' },
      errorCorrectionLevel: 'M',
    });
    return buffer;
  } catch (err) {
    console.error('[bitmap] Erro ao gerar QR Code:', err.message);
    return null;
  }
}

/**
 * Gera Código de Barras CODE128 como Buffer PNG
 */
async function generateBarcodePNG(text, options = {}) {
  if (!text) return null;
  
  const { height = 50, scale = 2 } = options;
  
  try {
    const buffer = await bwipjs.toBuffer({
      bcid: 'code128',
      text: text,
      scale: scale,
      height: height / scale,
      includetext: false,
      backgroundcolor: 'FFFFFF',
    });
    return buffer;
  } catch (err) {
    console.error('[bitmap] Erro ao gerar Barcode:', err.message);
    return null;
  }
}

/**
 * Converte PNG para comandos ESC/POS raster bitmap (GS v 0)
 */
function pngToRasterBitmap(pngBuffer) {
  return new Promise((resolve, reject) => {
    const png = new PNG();
    
    png.parse(pngBuffer, (err, data) => {
      if (err) return reject(err);
      
      const { width, height } = data;
      
      // Largura em bytes (arredondada para cima para múltiplo de 8)
      const bytesPerLine = Math.ceil(width / 8);
      
      // GS v 0 m xL xH yL yH d1...dk
      const xL = bytesPerLine % 256;
      const xH = Math.floor(bytesPerLine / 256);
      const yL = height % 256;
      const yH = Math.floor(height / 256);
      
      const commands = [0x1D, 0x76, 0x30, 0x00, xL, xH, yL, yH];
      
      // Converte pixels para 1-bit (preto=1, branco=0)
      for (let y = 0; y < height; y++) {
        for (let byteX = 0; byteX < bytesPerLine; byteX++) {
          let byte = 0;
          
          for (let bit = 0; bit < 8; bit++) {
            const x = byteX * 8 + bit;
            
            if (x < width) {
              const idx = (y * width + x) * 4;
              const r = data.data[idx];
              const g = data.data[idx + 1];
              const b = data.data[idx + 2];
              const a = data.data[idx + 3];
              
              // Threshold: pixels escuros = preto
              const gray = (r + g + b) / 3;
              const isBlack = a > 128 && gray < 128;
              
              if (isBlack) {
                byte |= (0x80 >> bit);
              }
            }
          }
          
          commands.push(byte);
        }
      }
      
      resolve(Buffer.from(commands));
    });
  });
}

/**
 * Formata ticket de pré-conta com QR Code e Barcode em bitmap
 * 
 * Usa ESC/POS texto para o conteúdo principal,
 * e GS v 0 (raster bitmap) para QR Code e Barcode.
 */
async function formatTableBillWithBitmap(metadata) {
  console.log('[bitmap] Formatando pré-conta com QR/Barcode em bitmap...');
  
  // Unifica itens duplicados
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

  let ticket = '';

  // ========== INIT obrigatório ==========
  ticket += INIT_STR;

  const SEP_DOTS = '.'.repeat(LINE_WIDTH);
  const SEP_SOLID = '-'.repeat(LINE_WIDTH);

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
    const cmdTitle = cmd.name
      ? sanitize(cmd.name).toUpperCase()
      : `COMANDA #${sanitize(cmd.number || '')}`.trim();

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

      ticket += `${qtyStr} ${String(name).padEnd(nameMax)} ${priceStr}\n`;

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

  // ========== ACOMPANHE SEU PEDIDO (o QR/URL vêm abaixo em bitmap) ==========
  ticket += '\n';
  ticket += `${padCenter('ACOMPANHE SEU PEDIDO')}\n`;
  ticket += COMMANDS.ALIGN_LEFT;
  ticket += '\n';

  // Buffer para comandos mistos (texto + bitmap)
  const parts = [];
  
  // Adiciona texto inicial
  parts.push(Buffer.from(ticket, 'binary'));

  // ========== QR CODE (Bitmap) ==========
  let trackingUrl = metadata.trackingUrl;
  if (!trackingUrl && metadata.tableSessionId) {
    trackingUrl = `https://zoopi.app.br/acompanhar/mesa/${metadata.tableSessionId}`;
  }
  
  console.log('[bitmap] trackingUrl:', trackingUrl || '(nenhum)');
  
  if (trackingUrl) {
    let qrSection = '';
    qrSection += COMMANDS.ALIGN_CENTER;
    qrSection += COMMANDS.BOLD_ON;
    qrSection += 'ACOMPANHE SEU PEDIDO\n';
    qrSection += COMMANDS.BOLD_OFF;
    qrSection += '\n';
    parts.push(Buffer.from(qrSection, 'binary'));
    
    const qrPng = await generateQRCodePNG(trackingUrl, 150);
    if (qrPng) {
      const qrBitmap = await pngToRasterBitmap(qrPng);
      parts.push(qrBitmap);
    }
    
    let qrText = '\n';
    const shortUrl = trackingUrl.replace('https://', '').replace('http://', '');
    wrapText(shortUrl, LINE_WIDTH).forEach((l) => (qrText += `${l}\n`));
    qrText += COMMANDS.ALIGN_LEFT;
    qrText += '-'.repeat(LINE_WIDTH) + '\n';
    parts.push(Buffer.from(qrText, 'binary'));
  }

  // ========== BARCODE (Bitmap) ==========
  const tableNum = metadata.tableNumber;
  console.log('[bitmap] tableNumber:', tableNum || '(nenhum)');
  
  if (tableNum) {
    let barcodeSection = '';
    barcodeSection += COMMANDS.ALIGN_CENTER;
    barcodeSection += 'ESCANEIE PARA EXPEDICAO\n';
    barcodeSection += '\n';
    parts.push(Buffer.from(barcodeSection, 'binary'));
    
    const barcodeData = `MESA:${tableNum}`;
    const barcodePng = await generateBarcodePNG(barcodeData, { height: 50 });
    if (barcodePng) {
      const barcodeBitmap = await pngToRasterBitmap(barcodePng);
      parts.push(barcodeBitmap);
    }
    
    let barcodeText = '\n';
    barcodeText += `${padCenter(barcodeData)}\n`;
    barcodeText += COMMANDS.ALIGN_LEFT;
    barcodeText += '-'.repeat(LINE_WIDTH) + '\n';
    parts.push(Buffer.from(barcodeText, 'binary'));
  }

  // Footer
  let footer = '\n';
  footer += COMMANDS.ALIGN_CENTER;
  footer += 'Confira os valores antes do pagamento\n';
  footer += 'Obrigado pela preferencia!\n';
  footer += 'www.zoopi.app.br\n';
  footer += COMMANDS.ALIGN_LEFT;
  footer += '\n\n\n\n\n';
  footer += COMMANDS.CUT;
  parts.push(Buffer.from(footer, 'binary'));

  // Concatena tudo
  const finalBuffer = Buffer.concat(parts);
  console.log(`[bitmap] Total gerado: ${finalBuffer.length} bytes`);
  
  return finalBuffer;
}

/**
 * Imprime cupom de mesa usando bitmap para QR/Barcode
 */
async function printTableBillBitmap(metadata, options = {}) {
  const buffer = await formatTableBillWithBitmap(metadata);
  
  const config = getConfig();
  const printMode = options.printMode || metadata.printMode || config.printerType;
  const printerHost = options.printerHost || metadata.printerHost || config.printerHost;
  const printerPort = options.printerPort || metadata.printerPort || config.printerPort;
  const printerName = options.printerName || config.printerName || metadata.printerName;
  
  // Para impressão USB/Windows, usa o buffer diretamente
  if (printMode === 'usb' || printMode === 'windows') {
    return printBitmapToUsb(buffer, { printerName });
  }
  
  // Para impressão de rede, envia buffer via socket
  return printBitmapToNetwork(buffer, { host: printerHost, port: printerPort });
}

/**
 * Imprime buffer binário em impressora de rede
 */
async function printBitmapToNetwork(buffer, options = {}) {
  const net = require('net');
  const config = getConfig();
  
  const host = options.host || config.printerHost;
  const port = options.port || config.printerPort || 9100;
  
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    socket.setTimeout(15000);
    
    socket.connect(port, host, () => {
      socket.write(buffer);
      socket.end();
      resolve({ success: true });
    });
    
    socket.on('error', (err) => {
      socket.destroy();
      reject(err);
    });
    
    socket.on('timeout', () => {
      socket.destroy();
      reject(new Error('Timeout na impressão'));
    });
  });
}

/**
 * Imprime buffer binário em impressora USB (Windows)
 */
async function printBitmapToUsb(buffer, options = {}) {
  const fs = require('fs');
  const path = require('path');
  const os = require('os');
  const { exec } = require('child_process');
  const config = getConfig();
  
  const printerName = options.printerName || config.printerName;
  
  if (!printerName) {
    throw new Error('Nome da impressora não configurado');
  }

  const tempDir = os.tmpdir();
  const tempFile = path.join(tempDir, `zoopi-bitmap-${Date.now()}.prn`);

  return new Promise((resolve, reject) => {
    fs.writeFileSync(tempFile, buffer);
    
    const cleanupTemp = () => {
      try { fs.unlinkSync(tempFile); } catch (e) {}
    };

    // Método copy /b para imprimir raw bytes
    const hostname = os.hostname();
    const printerPath = `\\\\${hostname}\\${printerName}`;
    
    console.log(`[bitmap] Imprimindo ${buffer.length} bytes para ${printerPath}`);
    
    exec(`copy /b "${tempFile}" "${printerPath}"`, { timeout: 15000, shell: 'cmd.exe' }, (err) => {
      cleanupTemp();
      
      if (err) {
        // Fallback: tenta print /D:
        exec(`print /D:"${printerName}" "${tempFile}"`, { timeout: 15000, shell: 'cmd.exe' }, (err2) => {
          if (err2) {
            reject(new Error(`Falha ao imprimir bitmap: ${err2.message}`));
          } else {
            resolve({ success: true });
          }
        });
      } else {
        resolve({ success: true });
      }
    });
  });
}

module.exports = {
  generateQRCodePNG,
  generateBarcodePNG,
  pngToRasterBitmap,
  formatTableBillWithBitmap,
  printTableBillBitmap,
  printBitmapToNetwork,
  printBitmapToUsb,
};
