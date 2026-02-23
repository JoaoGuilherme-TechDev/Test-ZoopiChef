/**
 * Bitmap Renderer for Electron
 * 
 * Renders HTML receipt templates in a hidden BrowserWindow
 * and captures them as bitmaps for ESC/POS printing.
 * 
 * This approach bypasses Windows driver ESC/POS interpretation issues
 * by sending raw bitmap data via GS v 0 command.
 */

const { BrowserWindow } = require('electron');
const path = require('path');

class BitmapRenderer {
  constructor() {
    this.window = null;
  }

  /**
   * Initialize hidden browser window for rendering
   */
  async init() {
    if (this.window) return;

    this.window = new BrowserWindow({
      width: 576, // 80mm at 203 DPI
      height: 2000, // Tall enough for any receipt
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        offscreen: true
      }
    });

    // Load blank page initially
    await this.window.loadURL('about:blank');
  }

  /**
   * Render HTML template to bitmap
   * @param {string} html - Complete HTML document
   * @param {number} paperWidth - Paper width in mm (58 or 80)
   * @returns {Promise<Buffer>} - ESC/POS bitmap commands
   */
  async renderToBitmap(html, paperWidth = 80) {
    if (!this.window) {
      await this.init();
    }

    // Width in pixels at 203 DPI (8 dots per mm)
    const widthPx = paperWidth === 58 ? 384 : 576;

    // Resize window to match paper width
    this.window.setSize(widthPx, 2000);

    // Load HTML content
    await this.window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

    // Wait for content to render
    await this.window.webContents.executeJavaScript(`
      new Promise(resolve => {
        if (document.readyState === 'complete') {
          setTimeout(resolve, 100);
        } else {
          window.addEventListener('load', () => setTimeout(resolve, 100));
        }
      });
    `);

    // Get content height
    const contentHeight = await this.window.webContents.executeJavaScript(`
      Math.max(
        document.body.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.clientHeight,
        document.documentElement.scrollHeight,
        document.documentElement.offsetHeight
      );
    `);

    // Resize to actual content height
    this.window.setSize(widthPx, Math.min(contentHeight + 20, 4000));

    // Capture as native image
    const image = await this.window.webContents.capturePage({
      x: 0,
      y: 0,
      width: widthPx,
      height: Math.min(contentHeight + 20, 4000)
    });

    // Get raw bitmap data
    const bitmap = image.toBitmap();
    const size = image.getSize();

    // Convert to ESC/POS raster bitmap commands
    return this.bitmapToEscPos(bitmap, size.width, size.height, widthPx);
  }

  /**
   * Convert raw bitmap to ESC/POS GS v 0 commands
   * @param {Buffer} bitmap - Raw BGRA bitmap data
   * @param {number} width - Image width in pixels
   * @param {number} height - Image height in pixels
   * @param {number} targetWidth - Target printer width
   * @returns {Buffer} - ESC/POS commands
   */
  bitmapToEscPos(bitmap, width, height, targetWidth) {
    const commands = [];

    // ESC @ - Initialize printer
    commands.push(0x1B, 0x40);

    // ESC a 1 - Center alignment (optional)
    commands.push(0x1B, 0x61, 0x01);

    // Calculate bytes per row (8 pixels per byte, padded to targetWidth)
    const bytesPerRow = Math.ceil(targetWidth / 8);

    // GS v 0 - Print raster bit image
    // Format: 1D 76 30 m xL xH yL yH d1...dk
    // m = 0 (normal mode)
    commands.push(0x1D, 0x76, 0x30, 0x00);
    commands.push(bytesPerRow & 0xFF, (bytesPerRow >> 8) & 0xFF); // xL, xH
    commands.push(height & 0xFF, (height >> 8) & 0xFF); // yL, yH

    // Convert BGRA pixels to monochrome bitmap
    // Electron's toBitmap() returns BGRA format
    for (let y = 0; y < height; y++) {
      for (let xByte = 0; xByte < bytesPerRow; xByte++) {
        let byte = 0;
        for (let bit = 0; bit < 8; bit++) {
          const x = xByte * 8 + bit;
          if (x < width) {
            const pixelIndex = (y * width + x) * 4;
            const b = bitmap[pixelIndex];
            const g = bitmap[pixelIndex + 1];
            const r = bitmap[pixelIndex + 2];
            // Convert to grayscale using luminance formula
            const gray = r * 0.299 + g * 0.587 + b * 0.114;
            // Threshold: black = 1 (print), white = 0 (no print)
            if (gray < 128) {
              byte |= (0x80 >> bit);
            }
          }
        }
        commands.push(byte);
      }
    }

    // Feed paper
    commands.push(0x1B, 0x64, 0x04); // ESC d 4 - Feed 4 lines

    // Cut paper
    commands.push(0x1D, 0x56, 0x00); // GS V 0 - Full cut

    return Buffer.from(commands);
  }

  /**
   * Generate HTML from ticket data
   * @param {object} data - Ticket data
   * @param {number} paperWidth - Paper width in mm
   * @returns {string} - Complete HTML document
   */
  generateTicketHtml(data, paperWidth = 80) {
    const cols = paperWidth === 58 ? 32 : 48;
    const widthPx = paperWidth === 58 ? 384 : 576;
    const fontSize = paperWidth === 58 ? '22px' : '24px';

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: ${fontSize};
      line-height: 1.3;
      background: white;
      color: black;
      width: ${widthPx}px;
      padding: 8px;
    }
    .center { text-align: center; }
    .left { text-align: left; }
    .right { text-align: right; }
    .bold { font-weight: bold; }
    .large { font-size: 1.5em; }
    .xlarge { font-size: 2em; }
    .inverted {
      background: black;
      color: white;
      padding: 4px 8px;
      display: inline-block;
    }
    .separator {
      border-top: 2px dashed black;
      margin: 8px 0;
    }
    .double-separator {
      border-top: 3px double black;
      margin: 8px 0;
    }
    .item { margin: 4px 0; }
    .item-name { font-weight: bold; text-transform: uppercase; }
    .item-note { font-size: 0.9em; padding-left: 16px; }
    .item-addon { font-size: 0.85em; padding-left: 16px; }
    .flex { display: flex; justify-content: space-between; }
    .total-line { font-weight: bold; font-size: 1.2em; margin: 8px 0; }
    .footer { margin-top: 16px; font-size: 0.85em; }
    .barcode {
      font-family: 'Libre Barcode 128', 'Code 128', monospace;
      font-size: 48px;
      letter-spacing: 0;
    }
  </style>
</head>
<body>
  ${this.renderTicketContent(data)}
</body>
</html>`;
  }

  /**
   * Render ticket content HTML
   */
  renderTicketContent(data) {
    let html = '';

    // Company name
    if (data.companyName) {
      html += `<div class="center bold large">${this.escapeHtml(data.companyName)}</div>\n`;
      html += `<div class="separator"></div>\n`;
    }

    // Order number (inverted/highlighted)
    if (data.orderNumber) {
      html += `<div class="center">
        <span class="inverted xlarge bold">PEDIDO #${this.escapeHtml(data.orderNumber)}</span>
      </div>\n`;
    }

    // Origin (table, delivery, etc)
    if (data.origin) {
      html += `<div class="center large bold" style="margin: 8px 0;">
        ${this.escapeHtml(data.origin)}
      </div>\n`;
    }

    // Customer info
    if (data.customerName) {
      html += `<div class="bold">Cliente: <span style="font-weight:normal">${this.escapeHtml(data.customerName)}</span></div>\n`;
    }
    if (data.customerPhone) {
      html += `<div>Tel: ${this.escapeHtml(data.customerPhone)}</div>\n`;
    }
    if (data.address) {
      html += `<div>End: ${this.escapeHtml(data.address)}</div>\n`;
    }

    // Datetime
    if (data.datetime) {
      html += `<div>${this.escapeHtml(data.datetime)}</div>\n`;
    }

    html += `<div class="double-separator"></div>\n`;

    // Items
    if (data.items && data.items.length > 0) {
      for (const item of data.items) {
        html += `<div class="item">`;
        html += `<div class="item-name">${item.quantity}x ${this.escapeHtml(item.name)}</div>`;
        
        if (item.notes) {
          html += `<div class="item-note">-> ${this.escapeHtml(item.notes)}</div>`;
        }
        
        if (item.addons && item.addons.length > 0) {
          for (const addon of item.addons) {
            html += `<div class="item-addon">+ ${this.escapeHtml(addon)}</div>`;
          }
        }
        
        if (data.showPrices && item.price) {
          html += `<div class="right">R$ ${this.formatCurrency(item.price)}</div>`;
        }
        
        html += `</div>\n`;
      }
    }

    html += `<div class="double-separator"></div>\n`;

    // Totals
    if (data.showPrices) {
      if (data.subtotal) {
        html += `<div class="flex"><span>Subtotal:</span><span>R$ ${this.formatCurrency(data.subtotal)}</span></div>\n`;
      }
      if (data.discount) {
        html += `<div class="flex"><span>Desconto:</span><span>-R$ ${this.formatCurrency(data.discount)}</span></div>\n`;
      }
      if (data.deliveryFee) {
        html += `<div class="flex"><span>Taxa Entrega:</span><span>R$ ${this.formatCurrency(data.deliveryFee)}</span></div>\n`;
      }
      if (data.total) {
        html += `<div class="flex total-line"><span>TOTAL:</span><span>R$ ${this.formatCurrency(data.total)}</span></div>\n`;
      }
    }

    // Payment method
    if (data.paymentMethod) {
      html += `<div style="margin-top: 8px;">Pagamento: ${this.escapeHtml(data.paymentMethod)}</div>\n`;
      if (data.change) {
        html += `<div>Troco para: R$ ${this.formatCurrency(data.change)}</div>\n`;
      }
    }

    // Notes
    if (data.notes) {
      html += `<div class="separator"></div>\n`;
      html += `<div class="bold">OBS: <span style="font-weight:normal">${this.escapeHtml(data.notes)}</span></div>\n`;
    }

    // Footer
    if (data.footer) {
      html += `<div class="footer center">${this.escapeHtml(data.footer)}</div>\n`;
    }

    // Barcode (text representation - actual barcode would need a font)
    if (data.barcode) {
      html += `<div class="center" style="margin-top: 12px;">
        <div style="font-size: 12px;">${this.escapeHtml(data.barcode)}</div>
      </div>\n`;
    }

    return html;
  }

  escapeHtml(text) {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  formatCurrency(value) {
    return parseFloat(value).toFixed(2).replace('.', ',');
  }

  /**
   * Cleanup
   */
  destroy() {
    if (this.window) {
      this.window.destroy();
      this.window = null;
    }
  }
}

module.exports = { BitmapRenderer };
