/**
 * Receipt Bitmap Print Module
 * 
 * Converts receipt template preview to ESC/POS bitmap commands
 * for 1:1 fidelity printing on thermal printers.
 */

import { supabase } from '@/lib/supabase-shim';

interface PrintBitmapOptions {
  printerHost: string;
  imageDataUrl: string;
  paperWidth: 58 | 80;
  cutAfter?: boolean;
}

/**
 * Convert image data URL to monochrome bitmap bytes for ESC/POS
 */
function imageToEscPosBitmap(
  imageData: ImageData,
  paperWidthDots: number
): Uint8Array {
  const { width, height, data } = imageData;
  
  // ESC/POS bitmap command: GS v 0 (raster bit image)
  // Format: 1D 76 30 m xL xH yL yH d1...dk
  const bytesPerRow = Math.ceil(paperWidthDots / 8);
  const commands: number[] = [];
  
  // Initialize printer
  commands.push(0x1B, 0x40); // ESC @ - Initialize
  commands.push(0x1B, 0x61, 0x01); // ESC a 1 - Center alignment
  
  // GS v 0 - Print raster bit image
  commands.push(0x1D, 0x76, 0x30, 0x00); // m=0 (normal mode)
  commands.push(bytesPerRow & 0xFF, (bytesPerRow >> 8) & 0xFF); // xL, xH
  commands.push(height & 0xFF, (height >> 8) & 0xFF); // yL, yH
  
  // Convert pixels to monochrome bitmap
  for (let y = 0; y < height; y++) {
    for (let byteX = 0; byteX < bytesPerRow; byteX++) {
      let byte = 0;
      for (let bit = 0; bit < 8; bit++) {
        const x = byteX * 8 + bit;
        if (x < width) {
          const pixelIndex = (y * width + x) * 4;
          const r = data[pixelIndex];
          const g = data[pixelIndex + 1];
          const b = data[pixelIndex + 2];
          // Convert to grayscale and threshold
          const gray = (r * 0.299 + g * 0.587 + b * 0.114);
          // Black pixel = 1, White pixel = 0 (inverted for thermal)
          if (gray < 128) {
            byte |= (0x80 >> bit);
          }
        }
      }
      commands.push(byte);
    }
  }
  
  // Feed and cut
  commands.push(0x1B, 0x64, 0x04); // ESC d 4 - Feed 4 lines
  commands.push(0x1D, 0x56, 0x00); // GS V 0 - Full cut
  
  return new Uint8Array(commands);
}

/**
 * Load image from data URL and get ImageData
 */
async function loadImageData(
  dataUrl: string,
  targetWidth: number
): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      
      // Scale to target width maintaining aspect ratio
      const scale = targetWidth / img.width;
      canvas.width = targetWidth;
      canvas.height = Math.ceil(img.height * scale);
      
      // Draw with white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      resolve(imageData);
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUrl;
  });
}

export interface PrintBitmapResult {
  success: boolean;
  error?: string;
  rawEscPosBase64?: string;
  paperWidth?: number;
}

/**
 * Convert receipt image to ESC/POS bitmap data
 */
export async function createReceiptBitmap(
  imageDataUrl: string,
  paperWidth: 58 | 80
): Promise<PrintBitmapResult> {
  // Paper width in dots (203 DPI standard)
  const paperWidthDots = paperWidth === 58 ? 384 : 576;
  
  try {
    // Convert image to ImageData
    const imageData = await loadImageData(imageDataUrl, paperWidthDots);
    
    // Convert to ESC/POS bitmap commands
    const escPosBytes = imageToEscPosBitmap(imageData, paperWidthDots);
    
    // Convert to base64 for transmission
    const base64 = btoa(String.fromCharCode(...escPosBytes));
    
    return { 
      success: true, 
      rawEscPosBase64: base64,
      paperWidth,
    };
  } catch (error) {
    console.error('Create bitmap error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Generate print preview as downloadable PNG
 */
export function downloadReceiptPreview(
  dataUrl: string,
  filename: string = 'receipt-preview.png'
): void {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  link.click();
}
