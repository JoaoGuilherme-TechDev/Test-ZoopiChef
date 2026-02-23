/**
 * Zoopi Print Service
 * Serviço local para impressão em impressoras térmicas TCP/IP
 * 
 * Uso: node server.js
 * O serviço escuta na porta 3847 por padrão
 */

const express = require('express');
const cors = require('cors');
const net = require('net');
const iconv = require('iconv-lite');

const app = express();
const PORT = process.env.PORT || 3847;

// Configurações ESC/POS
const ESC = '\x1B';
const GS = '\x1D';
const LF = '\n';
const COMMANDS = {
  INIT: ESC + '@',           // Inicializa impressora
  CUT: GS + 'V' + '\x00',    // Corte total
  PARTIAL_CUT: GS + 'V' + '\x01', // Corte parcial
  BOLD_ON: ESC + 'E' + '\x01',
  BOLD_OFF: ESC + 'E' + '\x00',
  CENTER: ESC + 'a' + '\x01',
  LEFT: ESC + 'a' + '\x00',
  RIGHT: ESC + 'a' + '\x02',
  DOUBLE_HEIGHT: ESC + '!' + '\x10',
  DOUBLE_WIDTH: ESC + '!' + '\x20',
  DOUBLE_SIZE: ESC + '!' + '\x30',
  NORMAL: ESC + '!' + '\x00',
  FEED_LINES: (n) => ESC + 'd' + String.fromCharCode(n),
  BEEP: ESC + 'B' + '\x03' + '\x02', // 3 beeps, 200ms each
  // Barcode commands
  BARCODE_HEIGHT: (h) => GS + 'h' + String.fromCharCode(Math.min(255, Math.max(1, h))),
  BARCODE_WIDTH: (w) => GS + 'w' + String.fromCharCode(Math.min(6, Math.max(2, w))),
  BARCODE_HRI_BELOW: GS + 'H' + '\x02',
  BARCODE_HRI_NONE: GS + 'H' + '\x00',
  BARCODE_CODE128: GS + 'k' + 'I', // CODE128 type (method A, NUL terminated)
};

/**
 * Generate CODE128 barcode ESC/POS commands
 * @param {string} payload - Text to encode (max 255 chars, printable ASCII only)
 * @param {object} options - Barcode configuration
 */
function generateBarcode(payload, options = {}) {
  const { height = 60, width = 2, showHRI = true, center = true } = options;

  if (!payload || payload.trim() === '') {
    return { success: false, error: 'Empty payload' };
  }

  // Clean payload - only printable ASCII (0x20-0x7E)
  const validPayload = payload.replace(/[^\x20-\x7E]/g, '');
  if (validPayload.length === 0) {
    return { success: false, error: 'No valid characters' };
  }
  if (validPayload.length > 255) {
    return { success: false, error: 'Payload too long (max 255)' };
  }

  let out = '';
  if (center) out += COMMANDS.CENTER;
  out += COMMANDS.BARCODE_HEIGHT(height);
  out += COMMANDS.BARCODE_WIDTH(width);
  out += showHRI ? COMMANDS.BARCODE_HRI_BELOW : COMMANDS.BARCODE_HRI_NONE;
  out += COMMANDS.BARCODE_CODE128;
  out += validPayload;
  out += '\x00'; // NUL terminator for method A
  out += LF;
  if (center) out += COMMANDS.LEFT;

  return { success: true, data: out, payload: validPayload };
}

// Middleware
app.use(cors({
  origin: '*', // Permite qualquer origem (para desenvolvimento local)
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json({ limit: '1mb' }));

// Rota de health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'online',
    service: 'zoopi-print-service',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Rota de teste de conexão com impressora
app.post('/test-connection', async (req, res) => {
  const { host, port = 9100 } = req.body;

  if (!host) {
    return res.status(400).json({ success: false, error: 'Host é obrigatório' });
  }

  try {
    const result = await testPrinterConnection(host, port);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Rota principal de impressão
app.post('/print', async (req, res) => {
  const { 
    host, 
    port = 9100, 
    content, 
    copies = 1,
    cut = true,
    beep = false,
    encoding = 'cp860' // Codificação para português
  } = req.body;

  if (!host) {
    return res.status(400).json({ success: false, error: 'Host é obrigatório' });
  }

  if (!content) {
    return res.status(400).json({ success: false, error: 'Conteúdo é obrigatório' });
  }

  try {
    console.log(`[Print] Imprimindo em ${host}:${port} (${copies} cópia(s))`);
    
    for (let i = 0; i < copies; i++) {
      await printToNetworkPrinter(host, port, content, { cut, beep, encoding });
      
      // Pequeno delay entre cópias
      if (i < copies - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`[Print] Sucesso: ${copies} cópia(s) impressa(s)`);
    res.json({ 
      success: true, 
      message: `Impresso com sucesso (${copies} cópia${copies > 1 ? 's' : ''})`,
      printedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error(`[Print] Erro:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Rota para impressão de ticket formatado
app.post('/print-ticket', async (req, res) => {
  const { 
    host, 
    port = 9100,
    ticket,
    copies = 1,
    beep = true
  } = req.body;

  if (!host || !ticket) {
    return res.status(400).json({ success: false, error: 'Host e ticket são obrigatórios' });
  }

  try {
    const formattedContent = formatTicket(ticket);
    
    for (let i = 0; i < copies; i++) {
      await printToNetworkPrinter(host, port, formattedContent, { cut: true, beep, encoding: 'cp860' });
      if (i < copies - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    res.json({ 
      success: true, 
      message: `Ticket impresso com sucesso`,
      printedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error(`[Print Ticket] Erro:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Função para testar conexão com impressora
function testPrinterConnection(host, port) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    const timeout = 5000;

    socket.setTimeout(timeout);

    socket.connect(port, host, () => {
      socket.destroy();
      resolve({ success: true, message: 'Conexão estabelecida com sucesso' });
    });

    socket.on('error', (err) => {
      socket.destroy();
      reject(new Error(`Não foi possível conectar: ${err.message}`));
    });

    socket.on('timeout', () => {
      socket.destroy();
      reject(new Error('Timeout: impressora não respondeu'));
    });
  });
}

// Função principal de impressão via TCP
function printToNetworkPrinter(host, port, content, options = {}) {
  return new Promise((resolve, reject) => {
    const { cut = true, beep = false, encoding = 'cp860' } = options;
    const socket = new net.Socket();
    const timeout = 10000;

    socket.setTimeout(timeout);

    socket.connect(port, host, () => {
      try {
        // Monta o buffer de impressão
        let buffer = Buffer.from(COMMANDS.INIT, 'binary');
        
        // Beep se solicitado
        if (beep) {
          buffer = Buffer.concat([buffer, Buffer.from(COMMANDS.BEEP, 'binary')]);
        }

        // Conteúdo convertido para a codificação correta
        const encodedContent = iconv.encode(content, encoding);
        buffer = Buffer.concat([buffer, encodedContent]);

        // Alimenta algumas linhas e corta
        buffer = Buffer.concat([buffer, Buffer.from(COMMANDS.FEED_LINES(4), 'binary')]);
        
        if (cut) {
          buffer = Buffer.concat([buffer, Buffer.from(COMMANDS.PARTIAL_CUT, 'binary')]);
        }

        socket.write(buffer, () => {
          socket.end();
          resolve({ success: true });
        });
      } catch (err) {
        socket.destroy();
        reject(err);
      }
    });

    socket.on('error', (err) => {
      socket.destroy();
      reject(new Error(`Erro de conexão: ${err.message}`));
    });

    socket.on('timeout', () => {
      socket.destroy();
      reject(new Error('Timeout: impressora não respondeu'));
    });

    socket.on('close', () => {
      resolve({ success: true });
    });
  });
}

// Função para formatar ticket de cozinha COM CÓDIGO DE BARRAS
function formatTicket(ticket) {
  const { 
    orderNumber,
    orderId,
    orderType,
    items = [],
    customerName,
    tableName,
    notes,
    createdAt,
    sectorName,
    companyName,
    delivererName,
    delivererCode
  } = ticket;

  let content = '';
  
  // Cabeçalho com nome da empresa
  if (companyName) {
    content += COMMANDS.CENTER;
    content += COMMANDS.DOUBLE_SIZE;
    content += `${companyName}\n`;
    content += COMMANDS.NORMAL;
  }
  
  // Cabeçalho
  content += COMMANDS.CENTER;
  content += COMMANDS.DOUBLE_SIZE;
  content += `PEDIDO #${orderNumber}\n`;
  content += COMMANDS.NORMAL;
  content += COMMANDS.BOLD_ON;
  
  if (sectorName) {
    content += `[${sectorName.toUpperCase()}]\n`;
  }
  
  content += COMMANDS.BOLD_OFF;
  content += '================================\n';
  content += COMMANDS.LEFT;
  
  // Tipo do pedido
  if (orderType) {
    content += COMMANDS.BOLD_ON;
    content += `Tipo: ${orderType}\n`;
    content += COMMANDS.BOLD_OFF;
  }
  
  // Mesa ou cliente
  if (tableName) {
    content += `Mesa: ${tableName}\n`;
  }
  if (customerName) {
    content += `Cliente: ${customerName}\n`;
  }
  
  // Data/hora
  if (createdAt) {
    const date = new Date(createdAt);
    content += `Hora: ${date.toLocaleTimeString('pt-BR')}\n`;
  }
  
  content += '--------------------------------\n';
  
  // Itens
  content += COMMANDS.BOLD_ON;
  content += 'ITENS:\n';
  content += COMMANDS.BOLD_OFF;
  
  for (const item of items) {
    content += COMMANDS.DOUBLE_HEIGHT;
    content += `${item.quantity}x ${item.name}\n`;
    content += COMMANDS.NORMAL;
    
    // Opcionais
    if (item.options && item.options.length > 0) {
      for (const opt of item.options) {
        content += `   + ${opt}\n`;
      }
    }
    
    // Observações do item - skip auto-generated notes
    if (item.notes) {
      const cleanNotes = String(item.notes).trim();
      const looksAutoGenerated = 
        cleanNotes.includes(' | ') ||
        cleanNotes.startsWith('[') ||
        /\[rodízio\]|\[rodizio\]/i.test(cleanNotes) ||
        /sabor|borda|bebida|escolh/i.test(cleanNotes);
      
      if (!looksAutoGenerated && cleanNotes.length > 0) {
        content += COMMANDS.BOLD_ON;
        content += `   OBS: ${cleanNotes}\n`;
        content += COMMANDS.BOLD_OFF;
      }
    }
  }
  
  // Observações gerais
  if (notes) {
    content += '--------------------------------\n';
    content += COMMANDS.BOLD_ON;
    content += `OBSERVAÇÕES:\n`;
    content += COMMANDS.BOLD_OFF;
    content += `${notes}\n`;
  }
  
  content += '================================\n';
  
  // ======== CÓDIGO DE BARRAS DO ENTREGADOR ========
  // CRÍTICO: Sempre incluir para pedidos delivery
  const barcodePayload = delivererCode || 
    (orderId ? `ORDER:${orderId.slice(0, 8).toUpperCase()}` : null) ||
    (orderNumber ? `PEDIDO:${String(orderNumber).padStart(3, '0')}` : null);

  if (barcodePayload) {
    content += '\n';
    content += COMMANDS.CENTER;
    content += COMMANDS.BOLD_ON;
    content += 'CODIGO ENTREGADOR\n';
    content += COMMANDS.BOLD_OFF;
    
    if (delivererName) {
      content += `${delivererName}\n`;
    }
    
    // Gera código de barras CODE128
    const barcodeResult = generateBarcode(barcodePayload, {
      height: 60,
      width: 2,
      showHRI: true,
      center: true,
    });

    if (barcodeResult.success) {
      content += '\n';
      content += barcodeResult.data;
    } else {
      // Fallback: imprime código como texto grande se barcode falhar
      console.warn('[Barcode] Fallback to text:', barcodeResult.error);
      content += COMMANDS.DOUBLE_SIZE;
      content += `${barcodePayload}\n`;
      content += COMMANDS.NORMAL;
    }
    
    content += '\n';
    content += '================================\n';
  }
  
  content += COMMANDS.CENTER;
  content += 'Zoopi Sistema\n';
  content += COMMANDS.LEFT;
  
  return content;
}

// Lista impressoras conhecidas (para futuras implementações)
app.get('/printers', (req, res) => {
  // Por enquanto retorna lista vazia
  // Futuramente pode usar mDNS/Bonjour para descobrir impressoras na rede
  res.json({ printers: [] });
});

// Inicializa o servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('╔════════════════════════════════════════════╗');
  console.log('║     ZOOPI PRINT SERVICE                    ║');
  console.log('║     Serviço de Impressão TCP/IP            ║');
  console.log('╠════════════════════════════════════════════╣');
  console.log(`║  Porta: ${PORT}                               ║`);
  console.log(`║  Status: ONLINE                            ║`);
  console.log('╠════════════════════════════════════════════╣');
  console.log('║  Endpoints:                                ║');
  console.log('║    GET  /health         - Status           ║');
  console.log('║    POST /print          - Imprimir texto   ║');
  console.log('║    POST /print-ticket   - Imprimir ticket  ║');
  console.log('║    POST /test-connection - Testar conexão  ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log('');
  console.log('Aguardando comandos de impressão...');
});
