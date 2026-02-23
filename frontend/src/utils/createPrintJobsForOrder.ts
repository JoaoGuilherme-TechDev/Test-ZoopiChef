import { supabase } from '@/lib/supabase-shim';
import { createPrintJobV3, orderToTicketData, type TicketData } from '@/lib/print/v3';
import { buildMainOrderTicketEscPos, orderToMainTicketData } from '@/lib/print/escpos/mainOrderTicket';
import { generateOrderTrackingSection, uint8ArrayToBase64 } from '@/lib/print/bitmapEscPos';
/**
 * Helper function to create print jobs for an order using V3 queue
 * Used by table orders, comanda orders, and other order creation flows
 * 
 * V3 Architecture:
 * - Creates jobs in print_job_queue_v3
 * - Uses structured ticket_data (JSON) instead of raw ESC/POS
 * - Electron agent processes jobs via Realtime subscription
 * 
 * LÓGICA DE SETORES:
 * 1. Se existe mapeamento explícito em product_print_sectors, usa ele
 * 2. Caso contrário, usa production_location do produto/subcategoria/categoria
 * 3. Compara production_location com o NOME do setor
 * 4. Cada setor recebe APENAS os itens que pertencem a ele
 * 5. O job "geral" (ticket principal) é sempre criado
 */
export async function createPrintJobsForOrder(companyId: string, orderId: string): Promise<void> {
  try {
    console.log('[PrintJobHelper V3] Creating print jobs for order:', orderId);

    // 1) Fetch order with items
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        items:order_items(*)
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error('[PrintJobHelper V3] Order not found:', orderError);
      return;
    }

    // 2) Fetch company name for ticket header
    const { data: company } = await supabase
      .from('companies')
      .select('name')
      .eq('id', companyId)
      .single();

    const companyName = company?.name || 'Empresa';

    // IMPORTANTE: ao lançar pedido em MESA/COMANDA, deve imprimir SOMENTE PRODUÇÃO.
    // Não deve criar ticket principal (order_ticket) nem ticket de entregador automaticamente.
    const isTableOrComandaOrder =
      Boolean(order.table_number) ||
      Boolean(order.comanda_number) ||
      String(order.source || '').toLowerCase() === 'table' ||
      String(order.source || '').toLowerCase() === 'comanda' ||
      String(order.order_type || '').toLowerCase() === 'table' ||
      String(order.fulfillment_type || '').toLowerCase() === 'table';

    // 3) Check idempotency - don't create duplicate jobs
    const { data: existingJobs } = await supabase
      .from('print_job_queue_v3')
      .select('id')
      .eq('order_id', orderId)
      .in('status', ['pending', 'processing', 'completed'])
      .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString());

    if (existingJobs && existingJobs.length > 0) {
      console.log('[PrintJobHelper V3] Jobs already exist for order, skipping:', orderId);
      return;
    }

    const productIds = (order.items || [])
      .map((i: any) => i.product_id)
      .filter(Boolean);

    // 4) Determine if order needs delivery ticket
    // Regra: MESA/COMANDA nunca cria ticket de entregador automaticamente.
    const needsDelivererTicket = isTableOrComandaOrder ? false : checkNeedsExpedition(order);

    // 5) Fetch active print sectors
    const { data: activeSectors } = await supabase
      .from('print_sectors')
      .select('id, name')
      .eq('company_id', companyId)
      .eq('active', true);

    const sectors = (activeSectors || []) as { id: string; name: string }[];
    const normalize = (s: string) => s.trim().toLowerCase();

    // 6) Fetch explicit mappings (product_print_sectors)
    let explicitMap = new Map<string, string>();
    if (productIds.length > 0) {
      const { data: explicitMappings } = await supabase
        .from('product_print_sectors')
        .select('product_id, sector_id')
        .in('product_id', productIds);

      (explicitMappings || []).forEach((m: any) => {
        if (m?.product_id && m?.sector_id) {
          explicitMap.set(m.product_id, m.sector_id);
        }
      });
    }

    // 7) Fetch production_location for products without explicit mapping
    const productsWithoutMapping = productIds.filter((id: string) => !explicitMap.has(id));
    const inferredMap = new Map<string, string>();

    if (productsWithoutMapping.length > 0 && sectors.length > 0) {
      const { data: products } = await supabase
        .from('products')
        .select(`
          id,
          production_location,
          subcategory:subcategories (
            production_location,
            category:categories (
              production_location
            )
          )
        `)
        .in('id', productsWithoutMapping);

      (products || []).forEach((p: any) => {
        const loc =
          p.production_location ||
          p.subcategory?.production_location ||
          p.subcategory?.category?.production_location ||
          null;

        if (!loc) return;

        const matchingSector = sectors.find(s => normalize(s.name) === normalize(String(loc)));
        if (matchingSector) {
          inferredMap.set(p.id, matchingSector.id);
        }
      });
    }

    // 8) Group products by sector
    const sectorProductMap = new Map<string, string[]>();

    productIds.forEach((productId: string) => {
      const sectorId = explicitMap.get(productId) || inferredMap.get(productId);
      
      if (sectorId) {
        if (!sectorProductMap.has(sectorId)) {
          sectorProductMap.set(sectorId, []);
        }
        sectorProductMap.get(sectorId)!.push(productId);
      }
    });

    // 9) Create production jobs by sector
    const jobPromises: Promise<any>[] = [];

    sectorProductMap.forEach((sectorProductIds, sectorId) => {
      if (sectorProductIds.length > 0) {
        // Filter items for this sector
        const sectorItems = (order.items || []).filter((item: any) => 
          sectorProductIds.includes(item.product_id)
        );

        // Build ticket data for production (no prices)
        const ticketData: TicketData = {
          companyName,
          orderNumber: String(order.order_number || ''),
          origin: getOrderOrigin(order),
          customerName: order.customer_name || undefined,
          datetime: new Date(order.created_at).toLocaleString('pt-BR'),
          items: sectorItems.map((item: any) => ({
            quantity: item.quantity,
            name: item.product_name || 'Item',
            notes: item.observation || undefined,
            addons: item.additionals?.map((a: any) => a.name || String(a)) || [],
          })),
          showPrices: false,
          notes: order.notes || undefined,
          beep: true,
          cut: true,
        };

        jobPromises.push(
          createPrintJobV3({
            companyId,
            jobType: 'production_ticket',
            printSectorId: sectorId,
            orderId: order.id,
            ticketData,
            priority: 2,
          })
        );
      }
    });

    // 10) Create main order ticket (NOT for table/comanda orders)
    if (!isTableOrComandaOrder) {
      // Generate ESC/POS with proper header highlighting
      const mainTicketDataForEscPos = orderToMainTicketData(
        order as any,
        companyName,
        undefined,
        undefined
      );

      // IMPORTANTE: para garantir QRCode + Barcode em qualquer impressora,
      // anexamos a seção de rastreio como BITMAP (GS v 0) e só então emitimos o CUT.
      const rawEscPosText = buildMainOrderTicketEscPos(mainTicketDataForEscPos, { omitCut: true });
      // IMPORTANT: ESC/POS é binário/Latin1. Usar TextEncoder (UTF-8) pode corromper bytes em alguns cenários.
      const textBytes = new Uint8Array(rawEscPosText.length);
      for (let i = 0; i < rawEscPosText.length; i++) {
        textBytes[i] = rawEscPosText.charCodeAt(i) & 0xff;
      }

      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://tenant-base-forge.lovable.app';
      const trackingUrl = `${baseUrl}/acompanhar/${order.id}`;
      const barcodeText = order.order_number ? String(order.order_number).padStart(3, '0') : order.id.slice(0, 8).toUpperCase();

      const trackingBytes = await generateOrderTrackingSection(trackingUrl, barcodeText);
      // IMPORTANTE: avance o papel após bitmaps antes do corte, senão muitos modelos “comem” o QR/barcode.
      const feedAfterBitmap = new Uint8Array([0x0A, 0x0A, 0x0A, 0x0A, 0x0A]); // 5x LF
      const cutBytes = new Uint8Array([0x1D, 0x56, 0x00]); // GS V 0

      const combined = new Uint8Array(
        textBytes.length + trackingBytes.length + feedAfterBitmap.length + cutBytes.length
      );
      combined.set(textBytes, 0);
      combined.set(trackingBytes, textBytes.length);
      combined.set(feedAfterBitmap, textBytes.length + trackingBytes.length);
      combined.set(cutBytes, textBytes.length + trackingBytes.length + feedAfterBitmap.length);

      const rawEscPos = uint8ArrayToBase64(combined);

      console.log('[PrintJobHelper V3] order_ticket raw payload built:', {
        orderId: order.id,
        textBytes: textBytes.length,
        trackingBytes: trackingBytes.length,
        totalBytes: combined.length,
        base64Length: rawEscPos.length,
      });

      jobPromises.push(
        createPrintJobV3({
          companyId,
          jobType: 'order_ticket',
          printerCategory: 'principal',
          orderId: order.id,
          rawEscPos, // Pre-formatted ESC/POS with inverted header
          priority: 3,
          metadata: {
            orderNumber: order.order_number,
            tableNumber: order.table_number,
            comandaNumber: order.comanda_number,
          },
        })
      );
    }

    // 11) Create deliverer ticket if needed
    if (needsDelivererTicket) {
      const delivererTicketData = orderToTicketData(order as any, companyName, true);
      delivererTicketData.footer = '*** VIA DO ENTREGADOR ***';
      
      jobPromises.push(
        createPrintJobV3({
          companyId,
          jobType: 'deliverer_ticket',
          printerCategory: 'principal',
          orderId: order.id,
          ticketData: delivererTicketData,
          priority: 3,
        })
      );
    }

    // 12) Execute all job creations in parallel
    const results = await Promise.all(jobPromises);
    
    console.log('[PrintJobHelper V3] Created print jobs:', {
      order_id: orderId,
      total_jobs: results.length,
      sector_jobs: sectorProductMap.size,
      deliverer_job: needsDelivererTicket,
      success: results.filter(r => r.success).length,
    });

  } catch (printError) {
    console.error('[PrintJobHelper V3] Print job creation error:', printError);
  }
}

/**
 * Get human-readable order origin
 */
function getOrderOrigin(order: any): string {
  if (order.table_number) {
    return `MESA ${order.table_number}`;
  }
  if (order.comanda_number) {
    return `COMANDA ${order.comanda_number}`;
  }
  if (order.order_type === 'delivery' || order.fulfillment_type === 'delivery') {
    return 'DELIVERY 🚚';
  }
  if (order.order_type === 'pickup' || order.fulfillment_type === 'pickup') {
    return 'RETIRADA 🏪';
  }
  if (order.source) {
    return order.source.toUpperCase();
  }
  return 'PEDIDO';
}

/**
 * Check if order needs expedition ticket (deliverer)
 */
function checkNeedsExpedition(order: any): boolean {
  // Mesa/Comanda: nunca gera ticket de entregador.
  if (
    order?.table_number ||
    order?.comanda_number ||
    String(order?.source || '').toLowerCase() === 'table' ||
    String(order?.source || '').toLowerCase() === 'comanda'
  ) {
    return false;
  }

  // Delivery orders always need deliverer ticket
  if (order.order_type === 'delivery' || order.fulfillment_type === 'delivery') {
    return true;
  }
  
  // Pickup orders need ticket for customer
  if (order.order_type === 'pickup' || order.fulfillment_type === 'pickup') {
    return true;
  }
  
  // External sources (iFood, WhatsApp, etc.)
  if (order.source && !['local', 'pdv', 'table', 'comanda'].includes(order.source.toLowerCase())) {
    return true;
  }
  
  // Counter orders for takeout
  if (order.eat_here === false) {
    return true;
  }
  
  return false;
}

/**
 * Create a single print job for an order (for manual printing)
 */
export async function createSinglePrintJob(
  companyId: string,
  orderId: string,
  options: {
    printerCategory?: string;
    printSectorId?: string;
    showPrices?: boolean;
    ticketType?: 'order' | 'production' | 'deliverer';
  } = {}
): Promise<{ success: boolean; error?: string }> {
  try {
    // Fetch order with items
    const { data: order, error } = await supabase
      .from('orders')
      .select(`*, items:order_items(*)`)
      .eq('id', orderId)
      .single();

    if (error || !order) {
      return { success: false, error: 'Pedido não encontrado' };
    }

    // Fetch company name
    const { data: company } = await supabase
      .from('companies')
      .select('name')
      .eq('id', companyId)
      .single();

    const companyName = company?.name || 'Empresa';
    const showPrices = options.showPrices ?? (options.ticketType !== 'production');
    
    // For order/deliverer tickets: ALWAYS send RAW ESC/POS + bitmap tracking (QR + barcode)
    // using the SAME binary strategy as table_bill (Latin1 bytes + uint8ArrayToBase64).
    if (options.ticketType !== 'production') {
      const mainTicketDataForEscPos = orderToMainTicketData(
        order as any,
        companyName,
        undefined,
        undefined
      );

      const rawEscPosText = buildMainOrderTicketEscPos(mainTicketDataForEscPos, { omitCut: true });
      const textBytes = new Uint8Array(rawEscPosText.length);
      for (let i = 0; i < rawEscPosText.length; i++) {
        textBytes[i] = rawEscPosText.charCodeAt(i) & 0xff;
      }

      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const trackingUrl = baseUrl ? `${baseUrl}/acompanhar/${order.id}` : null;
      const barcodeText = order.order_number ? String(order.order_number).padStart(3, '0') : order.id.slice(0, 8).toUpperCase();
      const trackingBytes = await generateOrderTrackingSection(trackingUrl, barcodeText);
      const feedAfterBitmap = new Uint8Array([0x0A, 0x0A, 0x0A, 0x0A, 0x0A]); // 5x LF
      const cutBytes = new Uint8Array([0x1D, 0x56, 0x00]); // GS V 0

      const combined = new Uint8Array(
        textBytes.length + trackingBytes.length + feedAfterBitmap.length + cutBytes.length
      );
      combined.set(textBytes, 0);
      combined.set(trackingBytes, textBytes.length);
      combined.set(feedAfterBitmap, textBytes.length + trackingBytes.length);
      combined.set(cutBytes, textBytes.length + trackingBytes.length + feedAfterBitmap.length);

      const rawEscPos = uint8ArrayToBase64(combined);

      console.log('[PrintJobHelper V3] createSinglePrintJob built RAW order_ticket:', {
        orderId,
        textBytes: textBytes.length,
        trackingBytes: trackingBytes.length,
        totalBytes: combined.length,
        base64Length: rawEscPos.length,
      });

      return createPrintJobV3({
        companyId,
        jobType: options.ticketType === 'deliverer' ? 'deliverer_ticket' : 'order_ticket',
        printerCategory: options.printerCategory || 'principal',
        printSectorId: options.printSectorId,
        orderId,
        rawEscPos,
        priority: 3,
        metadata: {
          orderNumber: order.order_number,
          tableNumber: order.table_number,
          source: 'manual',
        },
      });
    }
    
    // Production tickets use simple ticketData (agent formats)
    const ticketData = orderToTicketData(order as any, companyName, showPrices);

    return createPrintJobV3({
      companyId,
      jobType: 'production_ticket',
      printerCategory: options.printerCategory || 'principal',
      printSectorId: options.printSectorId,
      orderId,
      ticketData,
      priority: 3,
    });

  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
