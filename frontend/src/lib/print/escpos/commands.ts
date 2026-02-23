/**
 * ESC/POS Commands - Raw byte sequences for thermal printers
 * 
 * Profile: 80mm thermal printer, Font A, 48 columns
 * 
 * @see ESC/POS Command Reference
 */

// Control characters
const ESC = '\x1B';
const GS = '\x1D';
const LF = '\x0A';
const NUL = '\x00';

/**
 * ESC/POS Command constants
 */
export const ESCPOS = {
  // Initialization
  INIT: ESC + '@',                    // 1B 40 - Initialize printer
  
  // Text formatting
  BOLD_ON: ESC + 'E' + '\x01',        // 1B 45 01 - Emphasized ON
  BOLD_OFF: ESC + 'E' + '\x00',       // 1B 45 00 - Emphasized OFF
  
  // Reverse (inverted) text
  INVERT_ON: GS + 'B' + '\x01',       // 1D 42 01 - Reverse ON
  INVERT_OFF: GS + 'B' + '\x00',      // 1D 42 00 - Reverse OFF
  
  // Text alignment
  ALIGN_LEFT: ESC + 'a' + '\x00',     // 1B 61 00 - Left align
  ALIGN_CENTER: ESC + 'a' + '\x01',   // 1B 61 01 - Center align
  ALIGN_RIGHT: ESC + 'a' + '\x02',    // 1B 61 02 - Right align
  
  // Character size (GS ! n)
  SIZE_NORMAL: GS + '!' + '\x00',     // 1D 21 00 - Normal size
  SIZE_DOUBLE_HEIGHT: GS + '!' + '\x01', // 1D 21 01 - 2x height only
  SIZE_DOUBLE_WIDTH: GS + '!' + '\x10',  // 1D 21 10 - 2x width only
  // SIZE_DOUBLE_BOTH: GS + '!' + '\x11', // 1D 21 11 - AVOID! Causes overflow
  
  // Paper control
  LF: LF,                             // 0A - Line feed
  CUT: GS + 'V' + '\x00',             // 1D 56 00 - Full cut
  PARTIAL_CUT: GS + 'V' + '\x01',     // 1D 56 01 - Partial cut
  
  // Barcode settings
  BARCODE_HEIGHT: (n: number) => GS + 'h' + String.fromCharCode(n), // 1D 68 n
  BARCODE_WIDTH: (n: number) => GS + 'w' + String.fromCharCode(n),  // 1D 77 n
  BARCODE_HRI_BELOW: GS + 'H' + '\x02', // 1D 48 02 - HRI below barcode
  BARCODE_HRI_NONE: GS + 'H' + '\x00',  // 1D 48 00 - No HRI
  
  // Barcode CODE128 (GS k m d1...dk NUL or GS k m n d1...dn)
  // m=73 for CODE128
  BARCODE_CODE128_START: GS + 'k' + '\x49', // 1D 6B 49 (variant A: null terminated)
  BARCODE_CODE128_B_START: GS + 'k' + '\x49', // Alternative method
  
  // Audio
  BEEP: ESC + 'B' + '\x05' + '\x02', // Beep 5 times, 50ms each
};

/**
 * Printer profile constants
 */
export const PRINTER_PROFILE = {
  WIDTH_MM: 80,
  COLUMNS: 48,
  FONT: 'A',
};

/**
 * Line constants
 */
export const LINE = {
  WIDTH: 48,
  SEPARATOR: '='.repeat(48),
  SEPARATOR_DASHED: '-'.repeat(48),
};
