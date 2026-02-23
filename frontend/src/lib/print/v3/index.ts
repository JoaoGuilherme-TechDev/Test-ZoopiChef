/**
 * Print Module V3
 * 
 * Novo sistema de impressão com arquitetura limpa:
 * - Frontend cria jobs na tabela print_job_queue_v3
 * - Agente Electron local processa os jobs
 * - Suporta USB e Rede (IP) com formatação ESC/POS profissional
 */

export {
  createPrintJobV3,
  createOrderPrintJob,
  createProductionPrintJob,
  createTestPrintJob,
  orderToTicketData,
  type TicketData,
  type CreatePrintJobParams,
} from './createPrintJobV3';
