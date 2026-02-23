/**
 * ZOOPI PRINT AGENT v3.0.0
 * Usando node-thermal-printer + printer (bindings nativos C++)
 * Suporta: USB Windows + Rede TCP/IP
 * Compatível com print_job_queue_v3 (rawEscPos / rawEscPosBase64)
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const ThermalPrinter = require('node-thermal-printer').printer;
const PrinterTypes = require('node-thermal-printer').types;

// ==================== CONFIG ====================
const CONFIG_FILE = path.join(__dirname, 'config.json');

function loadConfig() {
  if (!fs.existsSync(CONFIG_FILE)) {
    console.error('❌ Arquivo config.json não encontrado!');
    console.error('   Crie o arquivo config.json com as configurações.');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
}

const config = loadConfig();
const supabase = createClient(config.supabaseUrl, config.supabaseKey);

console.log('========================================');
console.log('  ZOOPI PRINT AGENT v3.0.0 (GRAFICO)');
console.log('========================================');
console.log(`Company: ${config.companyId}`);
console.log(`Impressora USB: ${config.printerName}`);
if (config.kitchenPrinterIp) console.log(`Cozinha (rede): ${config.kitchenPrinterIp}`);
if (config.barPrinterIp) console.log(`Bar (rede): ${config.barPrinterIp}`);
console.log('----------------------------------------\n');

// ==================== MOTOR DE IMPRESSÃO ====================

/**
 * Imprime dados RAW ESC/POS diretamente (quando já vem pronto do frontend)
 */
async function printRawEscPos(rawBytes, printerConfig) {
  try {
    const isNetwork = printerConfig.type === 'network';
    
    if (isNetwork) {
      // Para rede, usa socket TCP direto
      const net = require('net');
      const [host, port] = printerConfig.interface.includes(':') 
        ? printerConfig.interface.split(':') 
        : [printerConfig.interface, 9100];
      
      return new Promise((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(10000);
        
        socket.connect(parseInt(port), host, () => {
          socket.write(Buffer.from(rawBytes));
          socket.end();
        });
        
        socket.on('close', () => {
          console.log(`   ✅ RAW enviado para ${host}:${port}`);
          resolve({ success: true });
        });
        
        socket.on('error', (err) => {
          console.error(`   ❌ Erro rede: ${err.message}`);
          resolve({ success: false, error: err.message });
        });
        
        socket.on('timeout', () => {
          socket.destroy();
          resolve({ success: false, error: 'Timeout de conexão' });
        });
      });
    } else {
      // Para USB/Compartilhada, usa a biblioteca printer (bindings nativos)
      const printer = require('@iamtomcat/printer');
      const os = require('os');
      let printerName = printerConfig.interface;
      
      console.log(`   -> Nome original da impressora: "${printerName}"`);
      
      // Lista impressoras disponíveis para debug
      let availablePrinters = [];
      try {
        availablePrinters = printer.getPrinters();
        console.log(`   -> ${availablePrinters.length} impressora(s) disponíveis:`);
        availablePrinters.forEach((p, i) => {
          console.log(`      [${i}] "${p.name}" (${p.status || 'status desconhecido'})`);
        });
      } catch (listErr) {
        console.error(`   ❌ Erro ao listar impressoras: ${listErr.message}`);
      }
      
      // Tenta encontrar a impressora pelo nome exato
      let targetPrinter = availablePrinters.find(p => p.name === printerName);
      
      if (targetPrinter) {
        console.log(`   -> Match exato encontrado: "${printerName}"`);
      } else {
        // Se não encontrou, tenta com caminho UNC (para compartilhadas)
        const hostname = os.hostname();
        console.log(`   -> Hostname do sistema: ${hostname}`);
        
        // Tenta \\HOSTNAME\PrinterName
        const uncPath = `\\\\${hostname}\\${printerName}`;
        targetPrinter = availablePrinters.find(p => p.name === uncPath);
        if (targetPrinter) {
          printerName = uncPath;
          console.log(`   -> Usando caminho UNC: "${printerName}"`);
        } else {
          // Tenta \\Server\Server (nome compartilhamento = nome da máquina)
          const uncPath2 = `\\\\Server\\${printerName}`;
          targetPrinter = availablePrinters.find(p => p.name === uncPath2);
          if (targetPrinter) {
            printerName = uncPath2;
            console.log(`   -> Usando caminho UNC Server: "${printerName}"`);
          }
        }
      }
      
      // Se ainda não encontrou, tenta match parcial (case-insensitive)
      if (!targetPrinter) {
        targetPrinter = availablePrinters.find(p => 
          p.name.toLowerCase().includes(printerName.toLowerCase())
        );
        if (targetPrinter) {
          printerName = targetPrinter.name;
          console.log(`   -> Match parcial encontrado: "${printerName}"`);
        } else {
          console.log(`   ⚠️ Nenhuma impressora encontrada para "${printerName}". Tentando mesmo assim...`);
        }
      }
      
      console.log(`   -> IMPRESSORA FINAL: "${printerName}"`);
      
      return new Promise((resolve) => {
        printer.printDirect({
          data: Buffer.from(rawBytes),
          printer: printerName,
          type: 'RAW',
          success: (jobId) => {
            console.log(`   ✅ RAW enviado para ${printerName} (Job: ${jobId})`);
            resolve({ success: true });
          },
          error: (err) => {
            console.error(`   ❌ Erro USB: ${err}`);
            resolve({ success: false, error: String(err) });
          }
        });
      });
    }
  } catch (err) {
    console.error(`   ❌ Erro printRawEscPos: ${err.message}`);
    return { success: false, error: err.message };
  }
}

/**
 * Imprime pedido usando node-thermal-printer (gera ESC/POS internamente)
 */
async function printOrderGraphic(order, printerConfig) {
  try {
    const isNetwork = printerConfig.type === 'network';
    
    const printer = new ThermalPrinter({
      type: PrinterTypes.EPSON,
      interface: isNetwork 
        ? `tcp://${printerConfig.interface}` 
        : `printer:${printerConfig.interface}`,
      characterSet: 'PC850_MULTILINGUAL',
      driver: isNetwork ? null : require('@iamtomcat/printer')
    });

    console.log(`   -> Imprimindo em: ${printerConfig.interface} (${printerConfig.type})`);

    // --- DESIGN DO CUPOM ---
    printer.alignCenter();
    printer.bold(true);
    printer.setTextSize(1, 1);
    printer.println('ZOOPI - PEDIDO');
    printer.setTextSize(2, 2);
    printer.println(`#${String(order.order_number || '').padStart(3, '0')}`);
    
    printer.setTextNormal();
    printer.bold(false);
    printer.feed(1);

    // Tipo de Pedido
    printer.invert(true);
    const tipo = order.order_type === 'dine_in' ? ' MESA ' : 
                 order.order_type === 'delivery' ? ' DELIVERY ' : ' BALCAO ';
    printer.println(tipo);
    printer.invert(false);

    if (order.table_number) {
      printer.setTextSize(1, 1);
      printer.println(`MESA: ${order.table_number}`);
      printer.setTextNormal();
    }

    printer.alignLeft();
    printer.println(`Data: ${new Date(order.created_at).toLocaleString('pt-BR')}`);
    printer.drawLine();

    // Itens
    printer.bold(true);
    printer.println('ITENS:');
    printer.bold(false);
    
    const items = order.items || [];
    items.forEach(item => {
      const qty = item.quantity || 1;
      const name = (item.product_name || item.name || 'Item');
      
      printer.setTextSize(0, 1);
      printer.println(`${qty}x ${name}`);
      printer.setTextNormal();
      
      if (item.notes) {
        printer.println(`   OBS: ${item.notes}`);
      }
      printer.feed(1);
    });

    printer.drawLine();

    // Total
    const total = (order.total_cents || 0) / 100;
    printer.alignRight();
    printer.bold(true);
    printer.println(`TOTAL: R$ ${total.toFixed(2)}`);
    printer.bold(false);

    if (order.customer_name) {
      printer.alignLeft();
      printer.feed(1);
      printer.println(`Cliente: ${order.customer_name}`);
      if (order.customer_phone) printer.println(`Tel: ${order.customer_phone}`);
    }

    printer.feed(2);
    printer.alignCenter();
    
    // Código de Barras
    if (order.order_number) {
      try {
        printer.printBarcode(String(order.order_number), 73);
      } catch (e) {
        // Ignora erro de barcode
      }
    }

    printer.feed(1);
    printer.println('Obrigado pela preferencia!');
    printer.cut();

    await printer.execute();
    return { success: true };

  } catch (err) {
    console.error(`   ❌ Erro printOrderGraphic: ${err.message}`);
    return { success: false, error: err.message };
  }
}

// ==================== FILA E POLLING ====================

const processedJobs = new Set();
const MAX_PROCESSED_CACHE = 500;

function cleanProcessedCache() {
  if (processedJobs.size > MAX_PROCESSED_CACHE) {
    const arr = Array.from(processedJobs);
    arr.slice(0, arr.length - 100).forEach(id => processedJobs.delete(id));
  }
}

async function processJob(job) {
  if (processedJobs.has(job.id)) return;
  processedJobs.add(job.id);
  cleanProcessedCache();

  console.log(`\n📄 Job: ${job.id.slice(0,8)} | Tipo: ${job.job_type}`);

  try {
    // Marca como processing
    await supabase
      .from('print_job_queue_v3')
      .update({ status: 'processing', started_at: new Date().toISOString() })
      .eq('id', job.id);

    // Determina impressora destino
    const metadata = job.metadata || {};
    let printerConfig = { type: 'usb', interface: config.printerName };

    // Roteamento por tipo ou metadata
    if (metadata.printerName) {
      printerConfig = { type: 'usb', interface: metadata.printerName };
    } else if (job.job_type === 'kitchen_print' && config.kitchenPrinterIp) {
      printerConfig = { type: 'network', interface: config.kitchenPrinterIp };
    } else if (job.job_type === 'bar_print' && config.barPrinterIp) {
      printerConfig = { type: 'network', interface: config.barPrinterIp };
    }

    let result;

    // Se já tem RAW ESC/POS pronto, usa direto
    if (job.raw_escpos || metadata.rawEscPosBase64) {
      let rawBytes;
      
      if (job.raw_escpos) {
        // raw_escpos pode ser string Latin1 ou base64
        if (job.raw_escpos.match(/^[A-Za-z0-9+/=]+$/)) {
          rawBytes = Buffer.from(job.raw_escpos, 'base64');
        } else {
          rawBytes = Buffer.from(job.raw_escpos, 'latin1');
        }
      } else if (metadata.rawEscPosBase64) {
        rawBytes = Buffer.from(metadata.rawEscPosBase64, 'base64');
      }

      console.log(`   -> RAW ESC/POS: ${rawBytes.length} bytes`);
      result = await printRawEscPos(rawBytes, printerConfig);
    } 
    // Senão, busca pedido e gera ticket gráfico
    else if (job.order_id) {
      const { data: order, error: orderErr } = await supabase
        .from('orders')
        .select('*, items:order_items(*)')
        .eq('id', job.order_id)
        .single();

      if (orderErr || !order) {
        throw new Error('Pedido não encontrado no banco');
      }

      result = await printOrderGraphic(order, printerConfig);
    } else {
      throw new Error('Job sem raw_escpos nem order_id');
    }

    // Atualiza status
    if (result.success) {
      await supabase
        .from('print_job_queue_v3')
        .update({ 
          status: 'completed', 
          completed_at: new Date().toISOString() 
        })
        .eq('id', job.id);
      console.log('   ✅ Impressão concluída');
    } else {
      throw new Error(result.error || 'Falha na impressão');
    }

  } catch (err) {
    console.error(`   ❌ Erro: ${err.message}`);
    
    const retryCount = (job.retry_count || 0) + 1;
    await supabase
      .from('print_job_queue_v3')
      .update({ 
        status: retryCount >= 3 ? 'failed' : 'pending',
        error_message: err.message,
        retry_count: retryCount
      })
      .eq('id', job.id);
  }
}

async function checkQueue() {
  try {
    const { data: jobs, error } = await supabase
      .from('print_job_queue_v3')
      .select('*')
      .eq('company_id', config.companyId)
      .eq('status', 'pending')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(10);

    if (error) {
      console.error('Erro ao consultar fila:', error.message);
      return;
    }

    if (jobs && jobs.length > 0) {
      console.log(`\n🔍 ${jobs.length} job(s) pendente(s)`);
      for (const job of jobs) {
        await processJob(job);
      }
    }
  } catch (err) {
    console.error('Erro no polling:', err.message);
  }
}

// ==================== INICIALIZAÇÃO ====================

console.log('🚀 Agente iniciado! Monitorando fila...\n');

// Polling a cada 3 segundos
setInterval(checkQueue, 3000);

// Primeira verificação imediata
checkQueue();
