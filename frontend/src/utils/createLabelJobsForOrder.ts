import { supabase } from '@/lib/supabase-shim';
import { generateLabelCode, LabelData } from '@/lib/print/labels';
import type { LabelPrinter, LabelTemplate } from '@/lib/print/labels';

interface OrderData {
  id: string;
  order_number: number | null;
  customer_name: string | null;
  created_at: string;
}

/**
 * Create label print jobs for an order
 * Called automatically when order is created if label printer is configured
 * 
 * @param companyId - Company ID
 * @param orderId - Order ID
 * @param totalBoxes - Number of boxes/packages for this order (default: 1)
 */
export async function createLabelJobsForOrder(
  companyId: string,
  orderId: string,
  totalBoxes: number = 1
): Promise<void> {
  // PRINT RESET (2026-01-27): impressão automática de etiquetas desativada para reconstrução do zero.
  console.warn('[LabelJobHelper] DISABLED: skipping label job creation', { companyId, orderId, totalBoxes });
  return;

  try {
    console.log('[LabelJobHelper] Creating label jobs for order:', orderId, 'boxes:', totalBoxes);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = supabase as any;

    // 1) Check if there's an active label printer with auto_print_orders enabled
    const { data: printers, error: printerError } = await client
      .from('label_printers')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .eq('auto_print_orders', true);

    if (printerError) {
      console.warn('[LabelJobHelper] Error fetching label printers:', printerError);
      return;
    }

    if (!printers || printers.length === 0) {
      console.log('[LabelJobHelper] No active label printers with auto_print enabled');
      return;
    }

    // Use default printer or first active one
    const printer: LabelPrinter = printers.find((p: LabelPrinter) => p.is_default) || printers[0];

    // 2) Get the default template for this printer's language
    const { data: templates } = await client
      .from('label_templates')
      .select('*')
      .eq('company_id', companyId)
      .eq('language', printer.language)
      .order('is_default', { ascending: false });

    const template: LabelTemplate | undefined = templates?.[0];

    if (!template) {
      console.warn('[LabelJobHelper] No template found for language:', printer.language);
      return;
    }

    // 3) Get order data
    const { data: orderData, error: orderError } = await client
      .from('orders')
      .select('id, order_number, customer_name, created_at')
      .eq('id', orderId)
      .single();

    if (orderError || !orderData) {
      console.warn('[LabelJobHelper] Could not fetch order data:', orderError);
      return;
    }

    // 4) Get company name
    const { data: company } = await client
      .from('companies')
      .select('name')
      .eq('id', companyId)
      .single();

    const companyName = company?.name || 'Empresa';

    // 5) Generate labels for each box
    const jobs: any[] = [];

    for (let boxNumber = 1; boxNumber <= totalBoxes; boxNumber++) {
      const labelData: LabelData = {
        company_name: companyName,
        order_number: orderData.order_number || orderId.substring(0, 8),
        customer_name: orderData.customer_name || 'Cliente',
        box_number: boxNumber,
        total_boxes: totalBoxes,
        order_id: orderId,
        date: new Date().toLocaleDateString('pt-BR'),
      };

      // Generate label code using template
      const labelCode = generateLabelCode(template, labelData);

      // Create print job
      jobs.push({
        company_id: companyId,
        order_id: orderId,
        print_sector_id: null,
        job_type: 'label',
        status: 'pending',
        source: 'auto_on_create',
        metadata: {
          kind: 'label',
          box_number: boxNumber,
          total_boxes: totalBoxes,
          printer_id: printer.id,
          printer_name: printer.name,
          printer_type: printer.printer_type,
          connection_type: printer.connection_type,
          printer_host: printer.printer_host,
          printer_port: printer.printer_port,
          printer_usb_name: printer.printer_name,
          language: printer.language,
          label_width_mm: printer.label_width_mm,
          label_height_mm: printer.label_height_mm,
          copies: printer.copies_per_box,
          customer_name: orderData.customer_name,
          order_number: orderData.order_number,
        },
        // Store the raw label code for the agent
        raw_content: labelCode,
      });
    }

    // 6) Insert jobs
    if (jobs.length > 0) {
      const { error: insertError } = await client.from('print_job_queue').insert(jobs);
      
      if (insertError) {
        console.error('[LabelJobHelper] Error inserting label jobs:', insertError);
        return;
      }

      console.log('[LabelJobHelper] Created label jobs:', {
        order_id: orderId,
        total_boxes: totalBoxes,
        printer: printer.name,
        language: printer.language,
      });

      // 7) Log to history
      for (let i = 0; i < totalBoxes; i++) {
        await client.from('label_print_history').insert({
          company_id: companyId,
          order_id: orderId,
          label_printer_id: printer.id,
          box_number: i + 1,
          total_boxes: totalBoxes,
          customer_name: orderData.customer_name,
          order_number: orderData.order_number,
          status: 'printed',
        });
      }
    }
  } catch (error) {
    console.error('[LabelJobHelper] Error creating label jobs:', error);
  }
}

/**
 * Manually trigger label printing for an order
 */
export async function printLabelsForOrder(
  companyId: string,
  orderId: string,
  totalBoxes: number,
  printerId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.warn('[LabelJobHelper] DISABLED: manual label printing is disabled', { companyId, orderId, totalBoxes, printerId });
    return { success: false, error: 'Impressão de etiquetas desativada (reconstrução do zero)' };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = supabase as any;

    // Get printer
    let printer: LabelPrinter;
    
    if (printerId) {
      const { data, error } = await client
        .from('label_printers')
        .select('*')
        .eq('id', printerId)
        .single();
      
      if (error || !data) {
        return { success: false, error: 'Impressora não encontrada' };
      }
      printer = data;
    } else {
      // Get default printer
      const { data: printers } = await client
        .from('label_printers')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('is_default', { ascending: false });

      if (!printers || printers.length === 0) {
        return { success: false, error: 'Nenhuma impressora de etiquetas ativa' };
      }
      printer = printers[0];
    }

    // Create jobs
    await createLabelJobsForOrder(companyId, orderId, totalBoxes);

    return { success: true };
  } catch (error) {
    console.error('[LabelJobHelper] Error in manual print:', error);
    return { success: false, error: 'Erro ao criar jobs de etiqueta' };
  }
}
