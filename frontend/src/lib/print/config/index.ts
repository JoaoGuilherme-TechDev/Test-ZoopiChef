/**
 * Print Configuration Module
 * 
 * Sistema de configuração elegante e parametrizável para impressão térmica.
 */

// Config types and defaults
export {
  type PrintConfig,
  type PrintLayoutConfig,
  type PrintStyleConfig,
  type PrintContentConfig,
  type PrintBeepConfig,
  DEFAULT_PRINT_CONFIG,
  MINIMAL_PRINT_CONFIG,
  PRODUCTION_PRINT_CONFIG,
  BILL_PRINT_CONFIG,
  mergeConfig,
  getSeparator,
  formatQuantity,
  formatCurrency,
  getIndent,
  truncateWithEllipsis,
} from './printConfig';

// Elegant builder
export {
  ElegantTicketBuilder,
  createTicketBuilder,
} from './elegantTicketBuilder';
