/**
 * ESC/POS Barcode Functions - CODE128 barcode generation
 * 
 * Generates raw ESC/POS bytes for printing barcodes on thermal printers.
 * Supports CODE128 with proper height, width, and HRI (Human Readable Interpretation).
 * 
 * Profile: 80mm thermal printer
 */

import { ESCPOS } from './commands';

/**
 * Barcode configuration options
 */
export interface BarcodeOptions {
  /** Barcode height in dots (default: 80) */
  height?: number;
  /** Barcode module width 2-6 (default: 2) */
  width?: number;
  /** Show HRI text below barcode (default: true) */
  showHRI?: boolean;
  /** Center the barcode (default: true) */
  center?: boolean;
  /** Prefer which CODE128 emission method to try first */
  preferMethod?: 'A' | 'B';
}

/**
 * Result of barcode generation
 */
export interface BarcodeResult {
  success: boolean;
  data?: string;
  error?: string;
  method?: 'A' | 'B';
  payload?: string;
}

/**
 * Generate CODE128 barcode ESC/POS commands
 * 
 * Tries method A first (NUL-terminated), then method B (length-prefixed)
 * 
 * @param payload - Text to encode (e.g., "ORDER:ABCD1234")
 * @param options - Barcode configuration
 */
export function printCode128(
  payload: string,
  options: BarcodeOptions = {}
): BarcodeResult {
  const {
    height = 80,
    width = 2,
    showHRI = true,
    center = true,
    preferMethod = 'A',
  } = options;

  // Validate payload
  if (!payload || payload.trim() === '') {
    return {
      success: false,
      error: 'Impressão bloqueada: não foi possível gerar código de barras (payload vazio)',
    };
  }

  // CODE128 (common) expects printable bytes; keep strict ASCII printable
  const validPayload = payload.replace(/[^\x20-\x7E]/g, '');
  if (validPayload.length === 0) {
    return {
      success: false,
      error: 'Impressão bloqueada: payload contém apenas caracteres inválidos',
    };
  }

  if (validPayload.length > 255) {
    return {
      success: false,
      error: 'Impressão bloqueada: payload muito longo para CODE128 (máx 255 chars)',
    };
  }

  const buildCommonHeader = (): string => {
    let out = '';
    if (center) out += ESCPOS.ALIGN_CENTER;
    out += ESCPOS.BARCODE_HEIGHT(Math.min(255, Math.max(1, height)));
    out += ESCPOS.BARCODE_WIDTH(Math.min(6, Math.max(2, width)));
    out += showHRI ? ESCPOS.BARCODE_HRI_BELOW : ESCPOS.BARCODE_HRI_NONE;
    return out;
  };

  const buildMethodA = (): string => {
    // Variant A: GS k m <data> NUL
    let out = buildCommonHeader();
    out += ESCPOS.BARCODE_CODE128_START;
    out += validPayload;
    out += '\x00';
    out += ESCPOS.LF;
    if (center) out += ESCPOS.ALIGN_LEFT;
    return out;
  };

  const buildMethodB = (): string => {
    // Variant B: GS k m n <data>
    // n = data length
    let out = buildCommonHeader();
    out += ESCPOS.BARCODE_CODE128_START;
    out += String.fromCharCode(validPayload.length);
    out += validPayload;
    out += ESCPOS.LF;
    if (center) out += ESCPOS.ALIGN_LEFT;
    return out;
  };

  const tryOrder: Array<'A' | 'B'> = preferMethod === 'B' ? ['B', 'A'] : ['A', 'B'];

  for (const method of tryOrder) {
    try {
      const data = method === 'A' ? buildMethodA() : buildMethodB();

      console.log('[barcode] Generating CODE128:', {
        payload: validPayload,
        height,
        width,
        method,
      });

      return {
        success: true,
        data,
        method,
        payload: validPayload,
      };
    } catch (e: any) {
      console.warn('[barcode] Method failed, trying fallback:', {
        method,
        error: e?.message || String(e),
      });
    }
  }

  return {
    success: false,
    error: 'Impressão bloqueada: não foi possível gerar código de barras (métodos A/B falharam)',
  };
}

/**
 * Generate barcode payload for an order
 * Format: ORDER:<first 8 chars of UUID>
 */
export function getOrderBarcodePayload(orderId: string): string {
  if (!orderId) return '';
  // Prefer full order id for expedition scanners
  return `ORDER:${String(orderId).toUpperCase()}`;
}

/**
 * Alternative barcode payload using order number
 * Format: PEDIDO:<order_number>
 */
export function getOrderNumberBarcodePayload(orderNumber: string | number): string {
  if (!orderNumber) return '';
  return `PEDIDO:${String(orderNumber).padStart(3, '0')}`;
}

/**
 * Log barcode generation for debugging
 */
export function logBarcodeGeneration(
  result: BarcodeResult,
  context: Record<string, any> = {}
): void {
  if (result.success) {
    console.log('[barcode] Generated successfully:', {
      payload: result.payload,
      method: result.method,
      bytesLength: result.data?.length || 0,
      ...context,
    });
  } else {
    console.error('[barcode] Generation failed:', {
      error: result.error,
      ...context,
    });
  }
}
