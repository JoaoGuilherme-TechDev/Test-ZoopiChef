/**
 * Bitmap ESC/POS Generator
 * Generates QR codes and barcodes as raster bitmap images (GS v 0)
 * for thermal printers that don't support native ESC/POS QR/barcode commands.
 */
// @ts-ignore - bwip-js has incomplete type declarations
import bwipjs from 'bwip-js';

/**
 * Generate a QR Code as ESC/POS bitmap commands
 */
export async function generateQRCodeBitmap(text: string, size = 150): Promise<Uint8Array> {
  if (!text) return new Uint8Array(0);

  try {
    // Generate QR code as PNG buffer using bwip-js
    const canvas = document.createElement('canvas');
    
    // @ts-ignore - bwip-js canvas API
    bwipjs.toCanvas(canvas, {
      bcid: 'qrcode',
      text: text,
      scale: 3,
      width: size / 3,
      height: size / 3,
      includetext: false,
    });

    // Get image data
    const ctx = canvas.getContext('2d');
    if (!ctx) return new Uint8Array(0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return convertToBitmapCommands(imageData.data, canvas.width, canvas.height);
  } catch (e) {
    console.error('[bitmapEscPos] QR Code generation failed:', e);
    return new Uint8Array(0);
  }
}

/**
 * Generate a CODE128 barcode as ESC/POS bitmap commands
 */
export async function generateBarcodeBitmap(text: string, width = 250, height = 60): Promise<Uint8Array> {
  if (!text) return new Uint8Array(0);

  // Sanitize text: only ASCII alphanumeric
  const safeText = String(text).replace(/[^A-Za-z0-9]/g, '').slice(0, 20);
  if (!safeText) return new Uint8Array(0);

  try {
    const canvas = document.createElement('canvas');
    
    // @ts-ignore - bwip-js canvas API
    bwipjs.toCanvas(canvas, {
      bcid: 'code128',
      text: safeText,
      scale: 2,
      height: 12,
      includetext: true,
      textxalign: 'center',
    });

    const ctx = canvas.getContext('2d');
    if (!ctx) return new Uint8Array(0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return convertToBitmapCommands(imageData.data, canvas.width, canvas.height);
  } catch (e) {
    console.error('[bitmapEscPos] Barcode generation failed:', e);
    return new Uint8Array(0);
  }
}

/**
 * Convert RGBA image data to ESC/POS raster bitmap (GS v 0)
 * 
 * GS v 0 format:
 * 1D 76 30 m xL xH yL yH [data]
 * m = 0 (normal mode)
 * xL xH = bytes per row (width/8, little endian)
 * yL yH = height in pixels (little endian)
 * data = 1-bit packed bitmap (MSB first, black=1)
 */
function convertToBitmapCommands(
  pixels: Uint8ClampedArray,
  width: number,
  height: number
): Uint8Array {
  // Round width up to multiple of 8
  const bytesPerRow = Math.ceil(width / 8);
  const alignedWidth = bytesPerRow * 8;

  // Create 1-bit bitmap
  const bitmapData: number[] = [];

  for (let y = 0; y < height; y++) {
    for (let byteX = 0; byteX < bytesPerRow; byteX++) {
      let byte = 0;
      for (let bit = 0; bit < 8; bit++) {
        const x = byteX * 8 + bit;
        if (x < width) {
          const pixelIndex = (y * width + x) * 4;
          const r = pixels[pixelIndex];
          const g = pixels[pixelIndex + 1];
          const b = pixels[pixelIndex + 2];
          const a = pixels[pixelIndex + 3];
          
          // Convert to grayscale and threshold
          const gray = (r * 0.299 + g * 0.587 + b * 0.114);
          const isBlack = a > 128 && gray < 128;
          
          if (isBlack) {
            byte |= (0x80 >> bit); // MSB first
          }
        }
      }
      bitmapData.push(byte);
    }
  }

  // Build GS v 0 command
  const xL = bytesPerRow & 0xFF;
  const xH = (bytesPerRow >> 8) & 0xFF;
  const yL = height & 0xFF;
  const yH = (height >> 8) & 0xFF;

  // Command: GS v 0 m xL xH yL yH [data]
  const command = new Uint8Array(8 + bitmapData.length);
  command[0] = 0x1D; // GS
  command[1] = 0x76; // v
  command[2] = 0x30; // 0
  command[3] = 0x00; // m = normal
  command[4] = xL;
  command[5] = xH;
  command[6] = yL;
  command[7] = yH;
  command.set(bitmapData, 8);

  return command;
}

/**
 * Generate complete QR + Barcode section as ESC/POS
 * Returns binary Uint8Array ready to append to ticket
 */
export async function generateTrackingSection(
  trackingUrl: string | null | undefined,
  tableNumber: number | string | null | undefined
): Promise<Uint8Array> {
  const parts: Uint8Array[] = [];
  
  // Centering command
  const centerCmd = new Uint8Array([0x1B, 0x61, 0x01]); // ESC a 1
  parts.push(centerCmd);

  // Label for QR
  if (trackingUrl) {
    const qrLabel = new TextEncoder().encode('\n--- ACOMPANHE SEU PEDIDO ---\n\n');
    parts.push(qrLabel);
    
    const qrBitmap = await generateQRCodeBitmap(trackingUrl, 150);
    if (qrBitmap.length > 0) {
      parts.push(qrBitmap);
    }
    
    // URL as text fallback
    const urlText = new TextEncoder().encode(`\n${trackingUrl}\n\n`);
    parts.push(urlText);
  }

  // Barcode for expedition
  if (tableNumber) {
    const barcodeLabel = new TextEncoder().encode('--- EXPEDIÇÃO ---\n\n');
    parts.push(barcodeLabel);
    
    const barcodeBitmap = await generateBarcodeBitmap(String(tableNumber), 200, 50);
    if (barcodeBitmap.length > 0) {
      parts.push(barcodeBitmap);
    }
    
    const barcodeText = new TextEncoder().encode(`\nMESA ${tableNumber}\n`);
    parts.push(barcodeText);
  }

  // Line feed after section
  if (trackingUrl || tableNumber) {
    parts.push(new Uint8Array([0x0A, 0x0A])); // 2 line feeds
  }

  // Back to left align
  const leftCmd = new Uint8Array([0x1B, 0x61, 0x00]); // ESC a 0
  parts.push(leftCmd);

  // Combine all parts
  const totalLength = parts.reduce((sum, p) => sum + p.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }

  return result;
}

/**
 * Tracking section para PEDIDO (QRCode + Barcode) como bitmap.
 * - QR aponta para /acompanhar/:orderId
 * - Barcode usa um texto curto (ex: número do pedido)
 */
export async function generateOrderTrackingSection(
  trackingUrl: string | null | undefined,
  barcodeText: string | null | undefined
): Promise<Uint8Array> {
  const parts: Uint8Array[] = [];

  // Center
  parts.push(new Uint8Array([0x1B, 0x61, 0x01])); // ESC a 1

  if (trackingUrl) {
    parts.push(new TextEncoder().encode('\n--- ACOMPANHE SEU PEDIDO ---\n\n'));
    const qrBitmap = await generateQRCodeBitmap(trackingUrl, 150);
    if (qrBitmap.length > 0) parts.push(qrBitmap);
    // fallback texto
    parts.push(new TextEncoder().encode(`\n${trackingUrl}\n\n`));
  }

  if (barcodeText) {
    parts.push(new TextEncoder().encode('--- CODIGO DO PEDIDO ---\n\n'));
    const barcodeBitmap = await generateBarcodeBitmap(barcodeText, 240, 60);
    if (barcodeBitmap.length > 0) parts.push(barcodeBitmap);
    parts.push(new TextEncoder().encode(`\n${String(barcodeText).slice(0, 32)}\n`));
  }

  // feeds
  parts.push(new Uint8Array([0x0A, 0x0A]));

  // Back to left
  parts.push(new Uint8Array([0x1B, 0x61, 0x00]));

  const totalLength = parts.reduce((sum, p) => sum + p.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}

/**
 * Convert Uint8Array to base64 string (for JSON transport)
 */
export function uint8ArrayToBase64(arr: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < arr.length; i++) {
    binary += String.fromCharCode(arr[i]);
  }
  return btoa(binary);
}
