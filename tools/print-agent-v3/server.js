/**
 * Servidor HTTP Local
 * 
 * Expõe endpoints para receber jobs de impressão
 * da rede local (localhost:9898)
 */

const express = require('express');
const cors = require('cors');

function createServer(port, printerManager, store) {
  const app = express();

  // Middlewares
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  // Health check
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      version: '3.0.0',
      timestamp: new Date().toISOString()
    });
  });

  // Lista impressoras configuradas
  app.get('/printers', (req, res) => {
    const printers = store.get('printers') || [];
    res.json({
      success: true,
      printers: printers.map(p => ({
        id: p.id,
        name: p.name,
        type: p.type,
        category: p.category
      }))
    });
  });

  // Lista impressoras do sistema
  app.get('/system-printers', async (req, res) => {
    try {
      const printers = await printerManager.getSystemPrinters();
      res.json({ success: true, printers });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Endpoint principal de impressão
  app.post('/print', async (req, res) => {
    try {
      const { printerId, ticketData, rawEscPos } = req.body;

      if (!printerId && !req.body.printerCategory) {
        return res.status(400).json({
          success: false,
          error: 'printerId ou printerCategory é obrigatório'
        });
      }

      // Busca impressora configurada
      const printers = store.get('printers') || [];
      let printer;

      if (printerId) {
        printer = printers.find(p => p.id === printerId);
      } else if (req.body.printerCategory) {
        // Busca por categoria (ex: 'cozinha', 'bar', 'principal')
        printer = printers.find(p => p.category === req.body.printerCategory);
      }

      if (!printer) {
        return res.status(404).json({
          success: false,
          error: `Impressora não encontrada: ${printerId || req.body.printerCategory}`
        });
      }

      // Se já temos ESC/POS pronto, envia direto
      if (rawEscPos) {
        const buffer = Buffer.from(rawEscPos, 'base64');
        if (printer.type === 'network') {
          await sendToNetworkPrinter(printer.host, printer.port || 9100, buffer);
        } else {
          await sendToUSBPrinter(printer.name, buffer);
        }
      } else if (ticketData) {
        // Formata e imprime o ticket
        await printerManager.printTicket(printer, ticketData);
      } else {
        return res.status(400).json({
          success: false,
          error: 'ticketData ou rawEscPos é obrigatório'
        });
      }

      res.json({
        success: true,
        message: 'Impressão enviada com sucesso',
        printer: printer.name
      });

    } catch (error) {
      console.error('[Server] Print error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Teste de impressão
  app.post('/test-print', async (req, res) => {
    try {
      const { printerId } = req.body;
      const printers = store.get('printers') || [];
      const printer = printers.find(p => p.id === printerId);

      if (!printer) {
        return res.status(404).json({
          success: false,
          error: 'Impressora não encontrada'
        });
      }

      const result = await printerManager.testPrint(printer);
      res.json(result);

    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Inicia servidor
  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`[Server] Listening on port ${port}`);
  });

  return server;
}

// Helpers para envio direto de dados binários
async function sendToNetworkPrinter(host, port, buffer) {
  const net = require('net');

  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    const timeout = setTimeout(() => {
      client.destroy();
      reject(new Error('Timeout de conexão'));
    }, 5000);

    client.connect(port, host, () => {
      clearTimeout(timeout);
      client.write(buffer, () => {
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

async function sendToUSBPrinter(printerName, buffer) {
  const { exec } = require('child_process');
  const fs = require('fs');
  const path = require('path');
  const os = require('os');

  const tempFile = path.join(os.tmpdir(), `zoopi-raw-${Date.now()}.bin`);
  fs.writeFileSync(tempFile, buffer);

  return new Promise((resolve, reject) => {
    let command;

    if (process.platform === 'win32') {
      command = `copy /b "${tempFile}" "\\\\localhost\\${printerName}"`;
    } else {
      command = `lpr -P "${printerName}" "${tempFile}"`;
    }

    exec(command, (error) => {
      try { fs.unlinkSync(tempFile); } catch (e) { /* ignore */ }

      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

module.exports = { createServer };
