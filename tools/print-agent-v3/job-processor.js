/**
 * Job Processor for Print Agent v3
 * 
 * Processes print jobs from Supabase queue.
 * Handles both bitmap rendering and raw ESC/POS data.
 */

const { createClient } = require('@supabase/supabase-js');
const { BitmapRenderer } = require('./bitmap-renderer');
const { USBPrinter } = require('./printer-usb');
const net = require('net');

class JobProcessor {
  constructor(config) {
    this.config = config;
    this.supabase = createClient(config.supabaseUrl, config.supabaseKey);
    this.bitmapRenderer = null;
    this.usbPrinter = new USBPrinter();
    this.isProcessing = false;
    this.pollInterval = null;
  }

  /**
   * Initialize the processor
   */
  async init() {
    console.log('[JobProcessor] Initializing...');
    
    // USB printer is ready immediately
    console.log('[JobProcessor] USB printer module ready');

    // List available printers
    const printers = await this.usbPrinter.listPrinters();
    console.log(`[JobProcessor] Found ${printers.length} printer(s):`);
    printers.forEach((p, i) => {
      console.log(`   [${i}] "${p.name}" (${p.port || 'N/A'})`);
    });

    return this;
  }

  /**
   * Initialize bitmap renderer (lazy load, needs Electron app ready)
   */
  async initBitmapRenderer() {
    if (!this.bitmapRenderer) {
      this.bitmapRenderer = new BitmapRenderer();
      await this.bitmapRenderer.init();
      console.log('[JobProcessor] Bitmap renderer initialized');
    }
  }

  /**
   * Start processing jobs
   */
  start() {
    console.log(`[JobProcessor] Starting polling for company: ${this.config.companyId}`);
    
    // Initial poll
    this.processPendingJobs();

    // Poll every 3 seconds
    this.pollInterval = setInterval(() => {
      if (!this.isProcessing) {
        this.processPendingJobs();
      }
    }, 3000);
  }

  /**
   * Stop processing
   */
  stop() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    if (this.bitmapRenderer) {
      this.bitmapRenderer.destroy();
    }
  }

  /**
   * Process pending jobs from queue
   */
  async processPendingJobs() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const { data: jobs, error } = await this.supabase
        .from('print_job_queue_v3')
        .select('*')
        .eq('company_id', this.config.companyId)
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(10);

      if (error) {
        console.error('[JobProcessor] Query error:', error.message);
        return;
      }

      if (jobs && jobs.length > 0) {
        console.log(`\n🔍 ${jobs.length} job(s) pendente(s)\n`);

        for (const job of jobs) {
          await this.processJob(job);
        }
      }

    } catch (e) {
      console.error('[JobProcessor] Process error:', e.message);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single job
   */
  async processJob(job) {
    const shortId = job.id.substring(0, 8);
    console.log(`📄 Job: ${shortId} | Tipo: ${job.job_type}`);

    try {
      // Mark as processing
      await this.updateJobStatus(job.id, 'processing');

      // Get print data
      let printBuffer;
      const metadata = job.metadata || {};
      const paperWidth = metadata.paperWidth || 80;

      // Determine printer
      const printerName = this.resolvePrinterName(metadata);
      console.log(`   -> Impressora: "${printerName}"`);

      // Priority 1: Pre-rendered base64 ESC/POS
      if (job.raw_escpos) {
        console.log(`   -> RAW ESC/POS: ${job.raw_escpos.length} bytes (base64)`);
        printBuffer = Buffer.from(job.raw_escpos, 'base64');
      }
      // Priority 2: Metadata rawEscPosBase64
      else if (metadata.rawEscPosBase64) {
        console.log(`   -> Metadata rawEscPosBase64: ${metadata.rawEscPosBase64.length} bytes`);
        printBuffer = Buffer.from(metadata.rawEscPosBase64, 'base64');
      }
      // Priority 3: ticket_data - render to bitmap
      else if (job.ticket_data) {
        console.log(`   -> Renderizando ticket_data como bitmap...`);
        await this.initBitmapRenderer();
        
        const html = this.bitmapRenderer.generateTicketHtml(job.ticket_data, paperWidth);
        printBuffer = await this.bitmapRenderer.renderToBitmap(html, paperWidth);
        console.log(`   -> Bitmap gerado: ${printBuffer.length} bytes`);
      }
      // Priority 4: Fetch order and render
      else if (job.order_id) {
        console.log(`   -> Buscando pedido ${job.order_id}...`);
        const ticketData = await this.fetchOrderTicketData(job.order_id, job.job_type);
        
        if (!ticketData) {
          throw new Error('Pedido não encontrado no banco');
        }

        await this.initBitmapRenderer();
        const html = this.bitmapRenderer.generateTicketHtml(ticketData, paperWidth);
        printBuffer = await this.bitmapRenderer.renderToBitmap(html, paperWidth);
        console.log(`   -> Bitmap gerado: ${printBuffer.length} bytes`);
      }
      else {
        throw new Error('Job sem raw_escpos, ticket_data nem order_id');
      }

      // Send to printer
      await this.sendToPrinter(printerName, printBuffer, metadata);

      // Mark as completed
      await this.updateJobStatus(job.id, 'completed');
      console.log(`   ✅ Impressão concluída\n`);

    } catch (e) {
      console.error(`   ❌ Erro: ${e.message}\n`);
      await this.updateJobStatus(job.id, 'failed', e.message);
    }
  }

  /**
   * Resolve printer name from metadata
   */
  resolvePrinterName(metadata) {
    // Priority: metadata.printerName -> config.printerName -> default
    let name = metadata.printerName || this.config.printerName || 'Default';

    // Check if it matches a known printer
    // For now, use the configured printer name directly
    return name;
  }

  /**
   * Send data to printer
   */
  async sendToPrinter(printerName, data, metadata) {
    const printMode = metadata.printMode || 'windows';

    if (printMode === 'network' && metadata.printerIp) {
      // Network printer
      const port = metadata.printerPort || 9100;
      console.log(`   -> Enviando para rede: ${metadata.printerIp}:${port}`);
      await this.sendToNetwork(metadata.printerIp, port, data);
    } else {
      // USB printer
      console.log(`   -> Enviando para USB: "${printerName}"`);
      await this.usbPrinter.printRaw(printerName, data);
    }
  }

  /**
   * Send data to network printer
   */
  async sendToNetwork(host, port, data) {
    return new Promise((resolve, reject) => {
      const client = new net.Socket();
      const timeout = setTimeout(() => {
        client.destroy();
        reject(new Error('Timeout de conexão'));
      }, 5000);

      client.connect(port, host, () => {
        clearTimeout(timeout);
        client.write(data, () => {
          client.end();
          resolve();
        });
      });

      client.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  }

  /**
   * Fetch order data and convert to ticket format
   */
  async fetchOrderTicketData(orderId, jobType) {
    const { data: order, error } = await this.supabase
      .from('orders')
      .select(`
        *,
        order_items (
          id,
          product_name,
          quantity,
          unit_price,
          notes,
          addons_snapshot
        ),
        companies (
          name
        ),
        customers (
          name,
          whatsapp
        )
      `)
      .eq('id', orderId)
      .single();

    if (error || !order) {
      return null;
    }

    // Convert to ticket data format
    return {
      companyName: order.companies?.name || 'Zoopi',
      orderNumber: String(order.order_number || ''),
      origin: order.table_number ? `MESA ${order.table_number}` : order.origin || order.order_type || '',
      customerName: order.customer_name || order.customers?.name || '',
      customerPhone: order.customer_phone || order.customers?.whatsapp || '',
      address: order.delivery_address || '',
      datetime: new Date(order.created_at).toLocaleString('pt-BR'),
      items: (order.order_items || []).map(item => ({
        quantity: item.quantity,
        name: item.product_name,
        notes: item.notes,
        addons: Array.isArray(item.addons_snapshot) 
          ? item.addons_snapshot.map(a => a.name || a) 
          : [],
        price: item.unit_price
      })),
      showPrices: jobType !== 'production_ticket',
      subtotal: order.subtotal,
      discount: order.discount_amount,
      deliveryFee: order.delivery_fee,
      total: order.total,
      paymentMethod: order.payment_method,
      notes: order.notes,
      beep: true,
      cut: true
    };
  }

  /**
   * Update job status in database
   */
  async updateJobStatus(jobId, status, errorMessage = null) {
    const update = {
      status,
      updated_at: new Date().toISOString()
    };

    if (status === 'processing') {
      update.started_at = new Date().toISOString();
    } else if (status === 'completed') {
      update.completed_at = new Date().toISOString();
    } else if (status === 'failed') {
      update.error_message = errorMessage;
    }

    await this.supabase
      .from('print_job_queue_v3')
      .update(update)
      .eq('id', jobId);
  }
}

module.exports = { JobProcessor };
