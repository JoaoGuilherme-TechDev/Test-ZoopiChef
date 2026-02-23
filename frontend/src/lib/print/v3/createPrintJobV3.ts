/**
 * Print Job Creator V3
 * 
 * Cria jobs de impressão na nova fila v3 compatível com o agente Electron
 * 
 * IMPORTANTE: Jobs de pedido agora enviam ESC/POS pré-formatado via raw_escpos
 * para garantir layout correto (inversões, barcode, formatação).
 */

import { supabase } from '@/lib/supabase-shim';
import { 
  buildMainOrderTicketEscPos, 
  orderToMainTicketData,
  type MainOrderTicketData 
} from '../escpos/mainOrderTicket';
import { generateOrderTrackingSection, uint8ArrayToBase64 } from '../bitmapEscPos';

export interface TicketData {
  companyName?: string;
  orderNumber?: string | number;
  origin?: string;
  customerName?: string;
  customerPhone?: string;
  address?: string;
  datetime?: string;
  items?: Array<{
    quantity: number;
    name: string;
    notes?: string;
    addons?: string[];
    price?: number;
  }>;
  showPrices?: boolean;
  subtotal?: number;
  discount?: number;
  deliveryFee?: number;
  total?: number;
  paymentMethod?: string;
  change?: number;
  notes?: string;
  barcode?: string;
  footer?: string;
  beep?: boolean;
  cut?: boolean;
}

export interface CreatePrintJobParams {
  companyId: string;
  jobType: string;
  printerCategory?: string;
  printerId?: string;
  printSectorId?: string;
  orderId?: string;
  comandaId?: string;
  ticketData?: TicketData;
  rawEscPos?: string; // Base64
  priority?: number;
  metadata?: Record<string, any>;
}

// Tipo simplificado de Order para este módulo
interface OrderData {
  id: string;
  order_number?: number | string;
  table_number?: number | string;
  comanda_number?: number | string;
  order_type?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_address?: any;
  items?: Array<{
    quantity: number;
    product_name?: string;
    unit_price?: number;
    observation?: string;
    notes?: string;
    additionals?: any[];
  }>;
  total: number;
  subtotal?: number;
  discount?: number;
  delivery_fee?: number;
  payment_method?: string;
  change_for?: number;
  notes?: string;
  created_at: string;
}

/**
 * Cria um job de impressão na fila v3
 */
export async function createPrintJobV3(params: CreatePrintJobParams): Promise<{ success: boolean; jobId?: string; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('print_job_queue_v3')
      .insert({
        company_id: params.companyId,
        job_type: params.jobType,
        printer_category: params.printerCategory,
        printer_id: params.printerId,
        print_sector_id: params.printSectorId,
        order_id: params.orderId,
        comanda_id: params.comandaId,
        ticket_data: params.ticketData as any,
        raw_escpos: params.rawEscPos,
        priority: params.priority || 5,
        status: 'pending',
        metadata: params.metadata || {}
      })
      .select('id')
      .single();

    if (error) throw error;

    console.log('[PrintJobV3] Job created:', data?.id);
    return { success: true, jobId: data?.id };
  } catch (error: any) {
    console.error('[PrintJobV3] Error creating job:', error);
    return { success: false, error: error.message };
  }
}

// Tipo simplificado de OrderItem para este módulo
interface OrderItemData {
  quantity: number;
  product_name?: string;
  unit_price?: number;
  observation?: string;
  additionals?: any[];
  notes?: string;
}

/**
 * Converte um Order para TicketData formatado
 */
export function orderToTicketData(order: OrderData, companyName?: string, showPrices = true): TicketData {
  const items = (order.items || []).map((item: OrderItemData) => ({
    quantity: item.quantity,
    name: item.product_name || 'Item',
    notes: item.observation || item.notes || undefined,
    addons: item.additionals?.map((a: any) => a.name || String(a)) || [],
    price: showPrices ? item.unit_price : undefined
  }));

  // Determina origem
  let origin = 'PEDIDO';
  if (order.table_number) {
    origin = `MESA ${order.table_number}`;
  } else if (order.comanda_number) {
    origin = `COMANDA ${order.comanda_number}`;
  } else if (order.order_type === 'delivery') {
    origin = 'DELIVERY 🚚';
  } else if (order.order_type === 'pickup') {
    origin = 'RETIRADA 🏪';
  }

  // Monta endereço
  let address: string | undefined;
  if (order.customer_address) {
    const addr = order.customer_address;
    address = [
      addr.street,
      addr.number,
      addr.complement,
      addr.neighborhood,
      addr.city
    ].filter(Boolean).join(', ');
  }

  return {
    companyName,
    orderNumber: String(order.order_number || ''),
    origin,
    customerName: order.customer_name || undefined,
    customerPhone: order.customer_phone || undefined,
    address,
    datetime: new Date(order.created_at).toLocaleString('pt-BR'),
    items,
    showPrices,
    subtotal: showPrices ? (order.subtotal || order.total) : undefined,
    discount: order.discount || undefined,
    deliveryFee: order.delivery_fee || undefined,
    total: showPrices ? order.total : undefined,
    paymentMethod: order.payment_method || undefined,
    change: order.change_for ? (order.change_for - order.total) : undefined,
    notes: order.notes || undefined,
    barcode: order.id ? `ORDER:${order.id.slice(0, 8).toUpperCase()}` : undefined,
    footer: companyName,
    beep: true,
    cut: true
  };
}

/**
 * Cria job de impressão para um pedido completo (ticket gerencial)
 * AGORA GERA ESC/POS PRÉ-FORMATADO para garantir layout correto
 */
export async function createOrderPrintJob(
  order: OrderData, 
  companyId: string, 
  companyName?: string,
  companyPhone?: string,
  companyWebsite?: string
): Promise<{ success: boolean; jobId?: string; error?: string }> {
  try {
    // Gera dados para o template ESC/POS
    const mainTicketData = orderToMainTicketData(
      order as any,
      companyName || 'ZOOPI',
      companyPhone,
      companyWebsite
    );
    
    // 1) Texto ESC/POS (sem CUT) em bytes Latin1-safe
    const rawEscPosText = buildMainOrderTicketEscPos(mainTicketData, { omitCut: true });
    const textBytes = new Uint8Array(rawEscPosText.length);
    for (let i = 0; i < rawEscPosText.length; i++) {
      textBytes[i] = rawEscPosText.charCodeAt(i) & 0xff;
    }

    // 2) Bitmap tracking + avanço + corte (compatível universal)
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const trackingUrl = baseUrl ? `${baseUrl}/acompanhar/${order.id}` : null;
    const barcodeText = order.order_number
      ? String(order.order_number).padStart(3, '0')
      : order.id.slice(0, 8).toUpperCase();
    const trackingBytes = await generateOrderTrackingSection(trackingUrl, barcodeText);
    const feedAfterBitmap = new Uint8Array([0x0a, 0x0a, 0x0a, 0x0a, 0x0a]);
    const cutBytes = new Uint8Array([0x1d, 0x56, 0x00]);

    const combined = new Uint8Array(
      textBytes.length + trackingBytes.length + feedAfterBitmap.length + cutBytes.length
    );
    combined.set(textBytes, 0);
    combined.set(trackingBytes, textBytes.length);
    combined.set(feedAfterBitmap, textBytes.length + trackingBytes.length);
    combined.set(cutBytes, textBytes.length + trackingBytes.length + feedAfterBitmap.length);

    const rawEscPos = uint8ArrayToBase64(combined);
    
    console.log('[PrintJobV3] Creating order job with formatted ESC/POS:', {
      orderId: order.id,
      orderNumber: order.order_number,
      textBytes: textBytes.length,
      trackingBytes: trackingBytes.length,
      totalBytes: combined.length,
      base64Length: rawEscPos.length,
    });
    
    return createPrintJobV3({
      companyId,
      jobType: 'order_ticket',
      printerCategory: 'principal',
      orderId: order.id,
      rawEscPos, // ESC/POS pré-formatado
      priority: 3,
      metadata: {
        orderNumber: order.order_number,
        tableNumber: order.table_number,
        comandaNumber: order.comanda_number,
      }
    });
  } catch (error: any) {
    console.error('[PrintJobV3] Error generating formatted ticket:', error);
    
    // Fallback: usa ticketData simples (agente formata)
    const ticketData = orderToTicketData(order, companyName, true);
    return createPrintJobV3({
      companyId,
      jobType: 'order_ticket',
      printerCategory: 'principal',
      orderId: order.id,
      ticketData,
      priority: 3
    });
  }
}

/**
 * Cria job de impressão para produção (cozinha/bar)
 */
export async function createProductionPrintJob(
  order: OrderData,
  companyId: string,
  printerCategory: string,
  printSectorId?: string,
  companyName?: string
): Promise<{ success: boolean; jobId?: string; error?: string }> {
  const ticketData = orderToTicketData(order, companyName, false);
  ticketData.showPrices = false;
  ticketData.barcode = undefined; // Produção não precisa de código de barras

  return createPrintJobV3({
    companyId,
    jobType: 'production_ticket',
    printerCategory,
    printSectorId,
    orderId: order.id,
    ticketData,
    priority: 2 // Alta prioridade para produção
  });
}

/**
 * Cria job de teste de impressão
 */
export async function createTestPrintJob(
  companyId: string,
  printerCategory: string
): Promise<{ success: boolean; jobId?: string; error?: string }> {
  const ticketData: TicketData = {
    companyName: 'ZOOPI - TESTE DE IMPRESSÃO',
    orderNumber: '000',
    origin: '*** TESTE ***',
    datetime: new Date().toLocaleString('pt-BR'),
    items: [
      { quantity: 1, name: 'Item de Teste', notes: 'Observação de teste' },
      { quantity: 2, name: 'Outro Item', addons: ['Adicional 1', 'Adicional 2'] }
    ],
    showPrices: true,
    total: 99.99,
    footer: 'Impressão de teste OK!',
    beep: true,
    cut: true
  };

  return createPrintJobV3({
    companyId,
    jobType: 'test_print',
    printerCategory,
    ticketData,
    priority: 1
  });
}
