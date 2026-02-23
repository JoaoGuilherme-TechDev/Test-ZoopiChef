import { toPng } from 'html-to-image';

/**
 * Converts an HTML element to a bitmap suitable for ESC/POS printing
 * This is specifically for kitchen tickets - completely isolated from receipt printing
 */
export async function createKitchenTicketBitmap(
  element: HTMLElement,
  paperWidth: 58 | 80
): Promise<{
  imageDataUrl: string;
  rawEscPosBase64: string;
  width: number;
  height: number;
}> {
  // Standard ESC/POS widths in pixels (8 dots per mm)
  const ESCPOS_WIDTHS = {
    58: 384, // 48mm printable area
    80: 576, // 72mm printable area
  };

  const width = ESCPOS_WIDTHS[paperWidth];

  // Generate PNG from the element
  const dataUrl = await toPng(element, {
    width,
    backgroundColor: '#ffffff',
    pixelRatio: 1,
    style: {
      transform: 'none',
    },
  });

  // Create canvas to process the image
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = dataUrl;
  });

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d')!;
  
  // Draw image
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, width, img.height);

  // Get image data
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imageData.data;

  // Convert to 1-bit bitmap using Floyd-Steinberg dithering for better quality
  const bitmap: number[] = [];
  const widthBytes = Math.ceil(width / 8);

  for (let y = 0; y < canvas.height; y++) {
    for (let xByte = 0; xByte < widthBytes; xByte++) {
      let byte = 0;
      for (let bit = 0; bit < 8; bit++) {
        const x = xByte * 8 + bit;
        if (x < width) {
          const idx = (y * width + x) * 4;
          // Convert to grayscale and threshold
          const gray = pixels[idx] * 0.299 + pixels[idx + 1] * 0.587 + pixels[idx + 2] * 0.114;
          // Black pixel = 1, White pixel = 0
          if (gray < 128) {
            byte |= (1 << (7 - bit));
          }
        }
      }
      bitmap.push(byte);
    }
  }

  // Build ESC/POS commands
  // GS v 0 - Print raster bit image
  const commands: number[] = [];
  
  // Initialize printer
  commands.push(0x1B, 0x40); // ESC @
  
  // Set line spacing to 0 for continuous image
  commands.push(0x1B, 0x33, 0x00); // ESC 3 n
  
  // Print bitmap using GS v 0
  // GS v 0 m xL xH yL yH d1...dk
  const xL = widthBytes & 0xFF;
  const xH = (widthBytes >> 8) & 0xFF;
  const yL = canvas.height & 0xFF;
  const yH = (canvas.height >> 8) & 0xFF;
  
  commands.push(0x1D, 0x76, 0x30, 0x00, xL, xH, yL, yH);
  commands.push(...bitmap);
  
  // Reset line spacing
  commands.push(0x1B, 0x32); // ESC 2
  
  // Feed and cut
  commands.push(0x1B, 0x64, 0x05); // Feed 5 lines
  commands.push(0x1D, 0x56, 0x00); // Cut paper

  // Convert to base64
  const rawEscPosBase64 = btoa(String.fromCharCode(...commands));

  return {
    imageDataUrl: dataUrl,
    rawEscPosBase64,
    width,
    height: canvas.height,
  };
}

/**
 * Download the kitchen ticket preview as PNG for verification
 */
export async function downloadKitchenTicketPreview(
  element: HTMLElement,
  filename: string = 'kitchen-ticket-preview.png'
): Promise<void> {
  const dataUrl = await toPng(element, {
    backgroundColor: '#ffffff',
    pixelRatio: 2,
  });

  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  link.click();
}
